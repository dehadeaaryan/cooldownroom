<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { resultLabel } from '$lib/resultLabel';
	import type { RankedDriver, Session } from '$lib/types';

	let { driver, session, onClose } = $props<{
		driver: RankedDriver;
		session: Session;
		onClose: () => void;
	}>();

	let startPosition = $state<number | null>(null);
	let startSource = $state<'starting-grid' | 'opening-position'>('starting-grid');
	let gridState = $state<'loading' | 'ready' | 'error'>('loading');
	const isRace = $derived(/race|sprint/i.test(session.session_name));
	const endPosition = $derived(driver.result ? driver.result.position : driver.position);
	const placesGained = $derived(
		startPosition !== null &&
			endPosition !== null &&
			!driver.result?.dnf &&
			!driver.result?.dns &&
			!driver.result?.dsq
			? startPosition - endPosition
			: null
	);
	const status = $derived(
		driver.result?.dsq
			? 'Disqualified'
			: driver.result?.dns
				? 'Did not start'
				: driver.result?.dnf
					? 'Did not finish'
					: driver.result
						? 'Classified'
						: 'Result pending'
	);
	const gap = $derived.by(() => {
		const value = driver.result?.gap_to_leader;
		const last = Array.isArray(value) ? value.findLast((item) => item !== null) : value;
		if (last === null || last === undefined) return null;
		if (typeof last === 'number') return last === 0 ? 'Leader' : `+${last.toFixed(3)}s`;
		return last;
	});
	const bestLap = $derived.by(() => {
		if (isRace) return null;
		const value = driver.result?.duration;
		const seconds = Array.isArray(value)
			? Math.min(...value.filter((lap) => typeof lap === 'number' && lap > 0))
			: value;
		if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
		const minutes = Math.floor(seconds / 60);
		return `${minutes}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
	});

	onMount(() => {
		if (!isRace) return;
		const controller = new AbortController();
		async function loadGrid() {
			try {
				const query = new URLSearchParams({
					session_key: String(session.session_key),
					driver_number: String(driver.driver_number),
					date_start: session.date_start
				});
				const response = await fetch(`${resolve('/api/starting-grid')}?${query}`, {
					signal: controller.signal
				});
				if (!response.ok) throw new Error('Could not load starting grid');
				const payload: unknown = await response.json();
				if (!payload || typeof payload !== 'object' || !('position' in payload)) {
					throw new Error('Invalid starting grid data');
				}
				const position = payload.position;
				startPosition = typeof position === 'number' && position > 0 ? position : null;
				startSource =
					'source' in payload && payload.source === 'opening-position'
						? 'opening-position'
						: 'starting-grid';
				gridState = 'ready';
			} catch {
				if (!controller.signal.aborted) gridState = 'error';
			}
		}
		void loadGrid();
		return () => controller.abort();
	});
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onClose()} />

<div class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
	<button
		type="button"
		class="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
		aria-label="Close driver details"
		onclick={onClose}
	></button>

	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="driver-detail-title"
		class="relative z-10 max-h-full w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-white/15 bg-neutral-900 p-6 text-white shadow-[0_25px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]"
	>
		<div
			class="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl"
		></div>
		<div class="relative flex items-start justify-between gap-4">
			<div>
				<p class="text-[11px] font-bold tracking-[0.2em] text-orange-400 uppercase">
					Driver details
				</p>
				<h2 id="driver-detail-title" class="mt-2 text-2xl leading-tight font-black tracking-tight">
					{driver.full_name}
				</h2>
				<p class="mt-1 text-sm text-neutral-400">{driver.team_name}</p>
			</div>
			<button
				type="button"
				onclick={onClose}
				aria-label="Close driver details"
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-neutral-300 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-orange-400"
				>×</button
			>
		</div>

		<div class="relative mt-7 grid grid-cols-2 gap-3">
			<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
				<p class="text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Start</p>
				<p class="mt-2 text-4xl font-black tracking-tight text-[#e9e3df]">
					{isRace
						? gridState === 'loading'
							? '…'
							: startPosition === null
								? '—'
								: `P${startPosition}`
						: 'N/A'}
				</p>
			</div>
			<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
				<p class="text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase">End</p>
				<p class="mt-2 text-4xl font-black tracking-tight text-orange-400">
					{resultLabel(driver)}
				</p>
			</div>
		</div>
		{#if isRace && gridState === 'error'}
			<p class="mt-2 text-xs text-neutral-500">Starting grid is temporarily unavailable.</p>
		{:else if isRace && gridState === 'ready' && startPosition === null}
			<p class="mt-2 text-xs text-neutral-500">No grid position was recorded for this driver.</p>
		{:else if isRace && startSource === 'opening-position'}
			<p class="mt-2 text-xs text-neutral-500">Start uses the earliest recorded race position.</p>
		{:else if !isRace}
			<p class="mt-2 text-xs text-neutral-500">This session has no starting grid.</p>
		{/if}
		<div class="relative mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
			{#if placesGained !== null}
				<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
					<p class="text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Places</p>
					<p class="mt-2 text-lg font-black {placesGained > 0 ? 'text-orange-400' : ''}">
						{placesGained > 0 ? `+${placesGained}` : placesGained}
					</p>
				</div>
			{/if}
			<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
				<p class="text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Status</p>
				<p class="mt-2 text-sm font-bold">{status}</p>
			</div>
			{#if driver.result?.number_of_laps !== null && driver.result?.number_of_laps !== undefined}
				<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
					<p class="text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Laps</p>
					<p class="mt-2 text-lg font-black">{driver.result.number_of_laps}</p>
				</div>
			{/if}
			{#if gap !== null}
				<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
					<p class="text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase">
						Gap to leader
					</p>
					<p class="mt-2 text-sm font-bold">{gap}</p>
				</div>
			{/if}
			{#if bestLap}
				<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
					<p class="text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Best lap</p>
					<p class="mt-2 text-sm font-bold">{bestLap}</p>
				</div>
			{/if}
			<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
				<p class="text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Car number</p>
				<p class="mt-2 text-lg font-black">#{driver.driver_number}</p>
			</div>
		</div>
		<div
			class="relative mt-3 flex items-center gap-3 rounded-2xl border border-orange-400/15 bg-orange-400/5 p-4"
		>
			<span class="h-2 w-2 shrink-0 rounded-full bg-orange-400"></span>
			<div class="min-w-0">
				<p class="text-[10px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Session</p>
				<p class="truncate text-sm font-semibold">
					{session.country_name} / {session.session_name}
				</p>
			</div>
		</div>
	</div>
</div>
