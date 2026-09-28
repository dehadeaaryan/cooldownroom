import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchStartingPosition } from '$lib/server/openf1';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const sessionKey = Number(url.searchParams.get('session_key'));
	const driverNumber = Number(url.searchParams.get('driver_number'));
	const dateStart = url.searchParams.get('date_start') ?? '';
	if (
		!Number.isSafeInteger(sessionKey) ||
		sessionKey <= 0 ||
		!Number.isSafeInteger(driverNumber) ||
		driverNumber <= 0 ||
		driverNumber > 99 ||
		!Number.isFinite(Date.parse(dateStart))
	) {
		return json({ error: 'Invalid session or driver.' }, { status: 400 });
	}

	try {
		return json(await fetchStartingPosition(fetch, sessionKey, driverNumber, dateStart));
	} catch (error) {
		if (!String(error).includes('rate limit')) {
			console.error('Could not load OpenF1 starting grid:', error);
		}
		return json({ error: 'Starting grid is temporarily unavailable.' }, { status: 503 });
	}
};
