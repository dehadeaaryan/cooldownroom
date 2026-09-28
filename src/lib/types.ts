export interface Driver {
    driver_number: number;
    full_name: string;
    team_name: string;
    headshot_url: string | null;
    team_colour: string;
}

export interface Session {
    session_key: number;
    session_name: string;
    country_name: string;
    date_start: string;
}

export interface PositionRecord {
    driver_number: number;
    position: number;
    date: string;
}
