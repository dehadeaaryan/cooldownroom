import type { PageServerLoad } from './$types';
import {
	fetchDriverStandings,
	fetchLatestAvailableSession,
	isExpectedOpenF1Error,
	sessionErrorMessage
} from '$lib/server/openf1';

export const load: PageServerLoad = ({ fetch }) => ({
	result: (async () => {
		try {
			const session = await fetchLatestAvailableSession(fetch);
			if (!session) {
				return { session: null, drivers: [], error: 'The latest session is not available yet.' };
			}
			return { session, ...(await fetchDriverStandings(fetch, session.session_key)) };
		} catch (error) {
			if (!isExpectedOpenF1Error(error)) {
				console.error('Could not load the latest OpenF1 session:', error);
			}
			return { session: null, drivers: [], error: sessionErrorMessage(error) };
		}
	})()
});
