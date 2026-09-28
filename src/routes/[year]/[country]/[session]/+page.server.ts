import type { PageServerLoad } from './$types';
import type { Driver, Session } from '$lib/types';

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

export const load: PageServerLoad = async ({ params, fetch }) => {
    const { year, country, session } = params;

    // 1. Fetch all sessions for the given year from OpenF1
    const sessionsRes = await fetch(`https://api.openf1.org/v1/sessions?year=${year}`);
    const allSessions: Session[] = await sessionsRes.json();

    // 2. Map the URL session slug to OpenF1's session name
    const targetSessionName = sessionMap[session.toLowerCase()] || 'Race';

    // 3. Find the exact session matching the country slug and session name
    const matchedSession = allSessions.find((s) => {
        const countrySlug = s.country_name.toLowerCase().replace(/\s+/g, '-');
        const matchesCountry = countrySlug.includes(country.toLowerCase());
        const matchesSession = s.session_name.toLowerCase() === targetSessionName.toLowerCase();
        return matchesCountry && matchesSession;
    }) || allSessions[0]; // Fallback to first if not found

    const sessionKey = matchedSession.session_key;

    // 4. Fetch drivers and position data using the resolved session_key
    const [driversRes, positionRes] = await Promise.all([
        fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`),
        fetch(`https://api.openf1.org/v1/position?session_key=${sessionKey}`)
    ]);

    const drivers: Driver[] = await driversRes.json();
    const positions: { driver_number: number; position: number }[] = await positionRes.json();

    // 5. Calculate final positions
    const finalPositions = new Map<number, number>();
    for (const record of positions) {
        finalPositions.set(record.driver_number, record.position);
    }

    const sortedDrivers = drivers.sort((a, b) => {
        const posA = finalPositions.get(a.driver_number) || 999;
        const posB = finalPositions.get(b.driver_number) || 999;
        return posA - posB;
    });

    return {
        session: matchedSession,
        drivers: sortedDrivers
    };
};