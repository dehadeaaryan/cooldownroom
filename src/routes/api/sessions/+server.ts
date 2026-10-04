import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchSessions, isExpectedOpenF1Error, sessionErrorMessage } from '$lib/server/openf1';

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
		if (!isExpectedOpenF1Error(error)) console.error('Could not load OpenF1 sessions:', error);
		return json({ error: sessionErrorMessage(error) }, { status: 503 });
	}
};
