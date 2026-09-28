export interface Driver {
	driver_number: number;
	full_name: string;
	team_name: string;
	headshot_url: string | null;
	team_colour: string;
}

export interface RankedDriver extends Driver {
	position: number | null;
	result: SessionResult | null;
}

export interface Session {
	session_key: number;
	meeting_key: number;
	session_name: string;
	country_name: string;
	location: string;
	date_start: string;
	gmt_offset: string;
}

export interface PositionRecord {
	driver_number: number;
	position: number;
	date: string;
}

export interface SessionResult {
	driver_number: number;
	position: number | null;
	dnf?: boolean;
	dns?: boolean;
	dsq?: boolean;
	number_of_laps?: number | null;
	gap_to_leader?: number | string | (number | string | null)[] | null;
	duration?: number | number[] | null;
}

export interface StartingGridRecord {
	driver_number: number;
	position: number;
}
