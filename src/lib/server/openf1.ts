import { env } from '$env/dynamic/private';
import type {
	Driver,
	PositionRecord,
	RankedDriver,
	Session,
	SessionResult,
	StartingGridRecord
} from '$lib/types';

type Fetch = typeof fetch;
const cache = new Map<string, { value: unknown[]; expiresAt: number }>();
const pending = new Map<string, Promise<unknown[]>>();
const unavailableGrids = new Map<number, number>();
let blockedUntil = 0;
let authBlockedUntil = 0;
let rejectedToken: string | undefined;
export class OpenF1AuthenticationError extends Error {
	constructor() {
		super('OpenF1 live data requires authentication. Please try again after the session ends.');
	}
}

export function isExpectedOpenF1Error(error: unknown): boolean {
	return error instanceof OpenF1AuthenticationError || String(error).includes('rate limit');
}

export function sessionErrorMessage(error: unknown): string {
	return error instanceof OpenF1AuthenticationError
		? error.message
		: 'Session data is temporarily unavailable.';
}
let nextRequestAt = 0;
let requestSlots = Promise.resolve();

function waitForRequestSlot() {
	const slot = requestSlots.then(async () => {
		const delay = Math.max(0, nextRequestAt - Date.now());
		if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
		nextRequestAt = Date.now() + 500;
	});
	requestSlots = slot.catch(() => {});
	return slot;
}

function retryDelay(header: string | null): number {
	if (!header) return 60_000;
	const seconds = Number(header);
	if (Number.isFinite(seconds)) return Math.max(1_000, seconds * 1_000);
	const date = Date.parse(header);
	return Number.isFinite(date) ? Math.max(1_000, date - Date.now()) : 60_000;
}

async function fetchArray<T>(fetcher: Fetch, path: string): Promise<T[]> {
	const existing = cache.get(path);
	if (existing && existing.expiresAt > Date.now()) return existing.value as T[];
	const token = env.OPENF1_API_TOKEN;
	const authBlocked = () => Date.now() < authBlockedUntil && token === rejectedToken;
	if (authBlocked()) {
		if (existing) return existing.value as T[];
		throw new OpenF1AuthenticationError();
	}
	if (Date.now() < blockedUntil) {
		if (existing) return existing.value as T[];
		throw new Error('OpenF1 rate limit is active');
	}

	const inFlight = pending.get(path);
	if (inFlight) return inFlight as Promise<T[]>;

	const request = (async () => {
		await waitForRequestSlot();
		if (authBlocked()) {
			if (existing) return existing.value as T[];
			throw new OpenF1AuthenticationError();
		}
		if (Date.now() < blockedUntil) {
			if (existing) return existing.value as T[];
			throw new Error('OpenF1 rate limit is active');
		}
		const response = await fetcher(`https://api.openf1.org/v1/${path}`, {
			headers: token ? { Authorization: `Bearer ${token}` } : {}
		});
		if (response.status === 401 || response.status === 403) {
			rejectedToken = token;
			authBlockedUntil = Date.now() + 5 * 60_000;
			if (existing) return existing.value as T[];
			throw new OpenF1AuthenticationError();
		}
		if (response.status === 429) {
			blockedUntil = Math.max(
				blockedUntil,
				Date.now() + retryDelay(response.headers.get('retry-after'))
			);
			if (existing) return existing.value as T[];
			throw new Error('OpenF1 rate limit is active');
		}
		if (!response.ok) throw new Error(`OpenF1 returned ${response.status} for ${path}`);
		const payload: unknown = await response.json();
		if (!Array.isArray(payload)) throw new Error(`OpenF1 returned invalid data for ${path}`);
		const isPastSeason = /year=(\d{4})/.exec(path);
		const ttl =
			isPastSeason && Number(isPastSeason[1]) < new Date().getFullYear()
				? 24 * 60 * 60_000
				: path.includes('session_key=latest')
					? 5 * 60_000
					: 10 * 60_000;
		cache.set(path, { value: payload, expiresAt: Date.now() + ttl });
		return payload as T[];
	})();
	pending.set(path, request);
	try {
		return await request;
	} finally {
		pending.delete(path);
	}
}

export async function fetchSessions(fetcher: Fetch, query: string): Promise<Session[]> {
	return fetchArray<Session>(fetcher, `sessions?${query}`);
}

export async function fetchLatestAvailableSession(fetcher: Fetch): Promise<Session | null> {
	// OpenF1 keeps a session behind live authentication until 30 minutes after it ends.
	const cutoff = Date.now() - 30 * 60_000;
	const year = new Date().getUTCFullYear();
	for (let season = year; season >= 2023; season--) {
		const sessions = await fetchSessions(fetcher, `year=${season}`);
		const latest = sessions
			.filter((session) => Date.parse(session.date_end) <= cutoff)
			.sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start))[0];
		if (latest) return latest;
	}
	return null;
}

export async function fetchStartingPosition(
	fetcher: Fetch,
	sessionKey: number,
	driverNumber: number,
	dateStart: string
): Promise<{ position: number | null; source: 'starting-grid' | 'opening-position' }> {
	if ((unavailableGrids.get(sessionKey) ?? 0) < Date.now()) {
		try {
			const grid = await fetchArray<StartingGridRecord>(
				fetcher,
				`starting_grid?session_key=${sessionKey}`
			);
			const position = grid.find((entry) => entry.driver_number === driverNumber)?.position;
			if (position !== undefined) return { position, source: 'starting-grid' };
		} catch (error) {
			if (!String(error).includes('returned 404')) throw error;
			unavailableGrids.set(sessionKey, Date.now() + 10 * 60_000);
		}
	}

	// Some completed races have no starting_grid data. Their first position records
	// are published before the race starts and give the initial running order.
	const cutoff = new Date(Date.parse(dateStart) + 5 * 60_000).toISOString();
	const records = await fetchArray<PositionRecord>(
		fetcher,
		`position?session_key=${sessionKey}&date%3C=${encodeURIComponent(cutoff)}`
	);
	const first = records
		.filter((record) => record.driver_number === driverNumber && record.position > 0)
		.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))[0];
	return { position: first?.position ?? null, source: 'opening-position' };
}

export async function fetchDriverStandings(fetcher: Fetch, sessionKey: number) {
	const [driverResponse, resultResponse] = await Promise.allSettled([
		fetchArray<Driver>(fetcher, `drivers?session_key=${sessionKey}`),
		fetchArray<SessionResult>(fetcher, `session_result?session_key=${sessionKey}`)
	]);

	if (driverResponse.status === 'rejected') {
		if (!isExpectedOpenF1Error(driverResponse.reason)) {
			console.error('Could not load OpenF1 drivers:', driverResponse.reason);
		}
		return {
			drivers: [] as RankedDriver[],
			error:
				driverResponse.reason instanceof OpenF1AuthenticationError
					? driverResponse.reason.message
					: 'Driver data is temporarily unavailable. Please try again shortly.'
		};
	}

	const drivers = driverResponse.value;
	let positions = new Map<number, number>();
	let results = new Map<number, SessionResult>();

	if (resultResponse.status === 'fulfilled') {
		results = new Map(resultResponse.value.map((result) => [result.driver_number, result]));
		positions = new Map(
			resultResponse.value
				.filter((result) => Number.isFinite(result.position) && result.position! > 0)
				.map((result) => [result.driver_number, result.position!] as const)
		);
	} else if (!isExpectedOpenF1Error(resultResponse.reason)) {
		console.error('Could not load OpenF1 session results:', resultResponse.reason);
	}

	// Official results can lag behind a live session.
	if (results.size === 0 && resultResponse.status === 'fulfilled') {
		try {
			const records = await fetchArray<PositionRecord>(
				fetcher,
				`position?session_key=${sessionKey}`
			);
			for (const record of records) {
				if (Number.isFinite(record.position) && record.position > 0) {
					positions.set(record.driver_number, record.position);
				}
			}
		} catch (error) {
			if (!isExpectedOpenF1Error(error)) console.error('Could not load OpenF1 positions:', error);
		}
	}

	const rankedDrivers = drivers
		.map((driver): RankedDriver => ({
			...driver,
			position: positions.get(driver.driver_number) ?? null,
			result: results.get(driver.driver_number) ?? null
		}))
		.sort(
			(a, b) =>
				(a.position ?? Infinity) - (b.position ?? Infinity) || a.driver_number - b.driver_number
		);

	return {
		drivers: rankedDrivers,
		error:
			drivers.length === 0
				? 'No drivers are available for this session yet.'
				: results.size === 0 && positions.size === 0
					? 'Positions are not available for this session yet.'
					: ''
	};
}
