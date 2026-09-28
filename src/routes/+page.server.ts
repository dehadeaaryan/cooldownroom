// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import type { Driver, Session, PositionRecord } from '$lib/types';


export const load: PageServerLoad = async ({ fetch }) => {
    // 1. Fetch the latest session metadata
    const sessionRes = await fetch('https://api.openf1.org/v1/sessions?session_key=latest');
    const sessions: Session[] = await sessionRes.json();

    // 2. Fetch the unsorted roster of drivers
    const driversRes = await fetch('https://api.openf1.org/v1/drivers?session_key=latest');
    const drivers: Driver[] = await driversRes.json();

    // 3. Fetch all position data to determine the finishing order
    const positionRes = await fetch('https://api.openf1.org/v1/position?session_key=latest');
    const positions: PositionRecord[] = await positionRes.json();

    // 4. Extract the final position for each driver
    // The API returns position updates chronologically. As we loop through, 
    // the Map constantly updates with the newest position. 
    // By the end of the loop, the Map holds the final position for each driver.
    const finalPositions = new Map<number, number>();
    for (const record of positions) {
        finalPositions.set(record.driver_number, record.position);
    }

    // 5. Sort the drivers array based on their final position in the Map
    const sortedDrivers = drivers.sort((a, b) => {
        // We default to 999 so that drivers without a final position (like DNS/early DNF) go to the bottom
        const posA = finalPositions.get(a.driver_number) || 999;
        const posB = finalPositions.get(b.driver_number) || 999;

        return posA - posB;
    });

    return {
        session: sessions[0],
        drivers: sortedDrivers
    };
};