import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchSessions } from '$lib/server/openf1';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const year = Number(url.searchParams.get('year'));
	if (!Number.isInteger(year) || year < 2023 || year > new Date().getFullYear()) {
		return json({ error: 'Select a valid season.' }, { status: 400 });
	}
	try {
		const sessions = await fetchSessions(fetch, `year=${year}`);
		return json({
			sessions: sessions.map(
				({ meeting_key, country_name, location, session_name, date_start, gmt_offset }) => ({
					meeting_key,
					country_name,
					location,
					session_name,
					date_start,
					gmt_offset
				})
			)
		});
	} catch (error) {
		if (!String(error).includes('rate limit'))
			console.error('Could not load OpenF1 sessions:', error);
		return json(
			{ error: 'Sessions are temporarily unavailable. Please try again shortly.' },
			{ status: 503 }
		);
	}
};
