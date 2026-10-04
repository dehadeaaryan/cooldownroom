import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { env } = vi.hoisted(() => ({ env: {} as Record<string, string> }));
vi.mock('$env/dynamic/private', () => ({ env }));

beforeEach(() => {
	vi.resetModules();
	vi.useFakeTimers();
	delete env.OPENF1_API_TOKEN;
});
afterEach(() => vi.useRealTimers());

describe('OpenF1 authentication', () => {
	it('backs off across endpoints after an anonymous 401 and recovers after cooldown', async () => {
		const { fetchSessions, OpenF1AuthenticationError } = await import('./openf1');
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response(null, { status: 401 }))
			.mockResolvedValue(new Response('[]'));
		await expect(fetchSessions(fetcher, 'session_key=latest')).rejects.toBeInstanceOf(
			OpenF1AuthenticationError
		);
		await expect(fetchSessions(fetcher, 'year=2025')).rejects.toBeInstanceOf(
			OpenF1AuthenticationError
		);
		expect(fetcher).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(5 * 60_000);
		await expect(fetchSessions(fetcher, 'session_key=latest')).resolves.toEqual([]);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('returns stale cached data during restricted access', async () => {
		const { fetchSessions } = await import('./openf1');
		const sessions = [{ session_key: 123 }];
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response(JSON.stringify(sessions)))
			.mockResolvedValue(new Response(null, { status: 403 }));
		await expect(fetchSessions(fetcher, 'session_key=latest')).resolves.toEqual(sessions);
		await vi.advanceTimersByTimeAsync(5 * 60_000);
		await expect(fetchSessions(fetcher, 'session_key=latest')).resolves.toEqual(sessions);
		await expect(fetchSessions(fetcher, 'session_key=latest')).resolves.toEqual(sessions);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('uses a server token and allows a replacement token during cooldown', async () => {
		const { fetchSessions } = await import('./openf1');
		env.OPENF1_API_TOKEN = 'expired';
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response(null, { status: 401 }))
			.mockResolvedValue(new Response('[]'));
		await expect(fetchSessions(fetcher, 'session_key=latest')).rejects.toThrow(
			'requires authentication'
		);
		env.OPENF1_API_TOKEN = 'replacement';
		const result = fetchSessions(fetcher, 'session_key=latest');
		await vi.advanceTimersByTimeAsync(500);
		await expect(result).resolves.toEqual([]);
		expect(fetcher).toHaveBeenLastCalledWith(
			'https://api.openf1.org/v1/sessions?session_key=latest',
			{ headers: { Authorization: 'Bearer replacement' } }
		);
	});
});

describe('latest available session', () => {
	it('skips live, upcoming and recently ended sessions and picks the newest historical session', async () => {
		vi.setSystemTime(new Date('2026-10-04T14:00:00Z'));
		const { fetchLatestAvailableSession } = await import('./openf1');
		const sessions = [
			{ session_key: 1, date_start: '2026-10-03T10:00:00Z', date_end: '2026-10-03T11:00:00Z' },
			{ session_key: 4, date_start: '2026-10-04T13:00:00Z', date_end: '2026-10-04T15:00:00Z' },
			{ session_key: 5, date_start: '2026-10-05T10:00:00Z', date_end: '2026-10-05T11:00:00Z' },
			{ session_key: 3, date_start: '2026-10-04T12:30:00Z', date_end: '2026-10-04T13:45:00Z' },
			{ session_key: 2, date_start: '2026-10-04T10:00:00Z', date_end: '2026-10-04T11:00:00Z' }
		];
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(sessions)));
		await expect(fetchLatestAvailableSession(fetcher)).resolves.toEqual(sessions[4]);
		expect(fetcher).toHaveBeenCalledWith('https://api.openf1.org/v1/sessions?year=2026', {
			headers: {}
		});
	});

	it('falls back to the previous season before the first session of the year', async () => {
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
		const { fetchLatestAvailableSession } = await import('./openf1');
		const session = {
			session_key: 9,
			date_start: '2025-12-01T10:00:00Z',
			date_end: '2025-12-01T12:00:00Z'
		};
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response('[]'))
			.mockResolvedValueOnce(new Response(JSON.stringify([session])));
		const result = fetchLatestAvailableSession(fetcher);
		await vi.advanceTimersByTimeAsync(500);
		await expect(result).resolves.toEqual(session);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});
