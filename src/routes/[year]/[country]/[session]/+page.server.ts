import type { PageServerLoad } from './$types';
import { fetchDriverStandings, fetchSessions } from '$lib/server/openf1';

const sessionMap: Record<string, string> = {
	fp1: 'Practice 1',
	fp2: 'Practice 2',
	fp3: 'Practice 3',
	quali: 'Qualifying',
	q: 'Qualifying',
	sq: 'Sprint Qualifying',
	sprint: 'Sprint',
	race: 'Race'
};

export const load: PageServerLoad = ({ params, fetch }) => ({
	result: (async () => {
		const { year, country, session } = params;
		try {
			const sessions = await fetchSessions(fetch, `year=${encodeURIComponent(year)}`);
			const sessionName = sessionMap[session.toLowerCase()] ?? session.replace(/-/g, ' ');
			const matchedSession = sessions.find(
				(item) =>
					(item.country_name.toLowerCase().replace(/\s+/g, '-') === country.toLowerCase() ||
						`${item.country_name.toLowerCase().replace(/\s+/g, '-')}-${item.meeting_key}` ===
							country.toLowerCase()) &&
					item.session_name.toLowerCase() === sessionName.toLowerCase()
			);
			if (!matchedSession) {
				return {
					session: null,
					drivers: [],
					error: `No ${sessionName} data was found for ${country.replace(/-/g, ' ')} in ${year}.`
				};
			}
			return {
				session: matchedSession,
				...(await fetchDriverStandings(fetch, matchedSession.session_key))
			};
		} catch (error) {
			if (!String(error).includes('rate limit')) {
				console.error('Could not load the selected OpenF1 session:', error);
			}
			return { session: null, drivers: [], error: 'Session data is temporarily unavailable.' };
		}
	})()
});
