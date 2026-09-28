import type { RankedDriver } from '$lib/types';

export function resultLabel(driver: RankedDriver): string {
	if (driver.result?.dsq) return 'DSQ';
	if (driver.result?.dns) return 'DNS';
	if (driver.result?.dnf) return 'DNF';
	const position = driver.result ? driver.result.position : driver.position;
	return position !== null && Number.isFinite(position) && position > 0 ? `P${position}` : '—';
}
