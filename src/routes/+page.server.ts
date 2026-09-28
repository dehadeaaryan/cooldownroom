import type { PageServerLoad } from './$types';
import { fetchDriverStandings, fetchSessions } from '$lib/server/openf1';

export const load: PageServerLoad = ({ fetch }) => ({
	result: (async () => {
		try {
			const sessions = await fetchSessions(fetch, 'session_key=latest');
			const session = sessions[0] ?? null;
			if (!session) {
				return { session: null, drivers: [], error: 'The latest session is not available yet.' };
			}
			return { session, ...(await fetchDriverStandings(fetch, session.session_key)) };
		} catch (error) {
			if (!String(error).includes('rate limit')) {
				console.error('Could not load the latest OpenF1 session:', error);
			}
			return { session: null, drivers: [], error: 'Session data is temporarily unavailable.' };
		}
	})()
});
