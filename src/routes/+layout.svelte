<script lang="ts">
	import './layout.css';
	import logo from '$lib/assets/ad-logo.png';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { SvelteMap } from 'svelte/reactivity';
	let { children } = $props();

	const currentYear = new Date().getFullYear();
	const availableYears = Array.from(
		{ length: currentYear - 2022 },
		(_, index) => currentYear - index
	);
	type SessionOption = {
		meeting_key: number;
		country_name: string;
		location: string;
		session_name: string;
		date_start: string;
		gmt_offset: string;
	};
	type SelectOption = { name: string; slug: string; dateStart: string; gmtOffset: string };
	type EventOption = SelectOption & { meetingKey: number; dateEnd: string };

	let selectedYear = $state('');
	let mobileOpen = $state(false);
	let selectedCountry = $state('');
	let selectedSession = $state('');
	let yearSessions = $state<SessionOption[]>([]);
	let availableCountries = $state<EventOption[]>([]);
	let availableSessions = $state<SelectOption[]>([]);
	let isFetching = $state(false);
	let fetchError = $state('');
	let requestId = 0;
	const destination = $derived(
		selectedYear && selectedCountry && selectedSession
			? resolve('/[year]/[country]/[session]', {
					year: selectedYear,
					country: selectedCountry,
					session: selectedSession
				})
			: null
	);
	const selectedEvent = $derived(
		availableCountries.find((event) => event.slug === selectedCountry)
	);
	const selectedSessionOption = $derived(
		availableSessions.find((session) => session.slug === selectedSession)
	);

	function localDate(dateStart: string, offset: string): Date {
		const match = /^([+-])(\d{2}):(\d{2})(?::\d{2})?$/.exec(offset);
		const minutes = match
			? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
			: 0;
		return new Date(Date.parse(dateStart) + minutes * 60_000);
	}

	function displayDate(dateStart: string, offset: string, year = true): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			...(year ? { year: 'numeric' } : {}),
			timeZone: 'UTC'
		}).format(localDate(dateStart, offset));
	}

	function eventDates(event: EventOption, year = true): string {
		const first = displayDate(event.dateStart, event.gmtOffset, false);
		const last = displayDate(event.dateEnd, event.gmtOffset, false);
		if (first === last) return displayDate(event.dateStart, event.gmtOffset, year);
		if (!year) return `${first} – ${last}`;
		const firstYear = localDate(event.dateStart, event.gmtOffset).getUTCFullYear();
		const lastYear = localDate(event.dateEnd, event.gmtOffset).getUTCFullYear();
		return firstYear === lastYear
			? `${first} – ${last}, ${lastYear}`
			: `${first}, ${firstYear} – ${last}, ${lastYear}`;
	}

	const sessionMap: Record<string, string> = {
		'Practice 1': 'fp1',
		'Practice 2': 'fp2',
		'Practice 3': 'fp3',
		Qualifying: 'quali',
		'Sprint Qualifying': 'sq',
		Sprint: 'sprint',
		Race: 'race'
	};

	async function onYearSelect(event: Event) {
		const year = (event.currentTarget as HTMLSelectElement).value;
		selectedYear = year;
		const currentRequest = ++requestId;
		selectedCountry = '';
		selectedSession = '';
		yearSessions = [];
		availableCountries = [];
		availableSessions = [];
		fetchError = '';
		if (!year) return;

		isFetching = true;
		try {
			const response = await fetch(`${resolve('/api/sessions')}?year=${year}`);
			const payload: unknown = await response.json();
			if (
				!response.ok ||
				typeof payload !== 'object' ||
				payload === null ||
				!('sessions' in payload) ||
				!Array.isArray(payload.sessions)
			) {
				throw new Error('Session lookup failed');
			}
			const sessions = payload.sessions as SessionOption[];
			if (currentRequest !== requestId) return;
			yearSessions = sessions;

			const events = new SvelteMap<number, EventOption>();
			for (const session of sessions) {
				if (!session.country_name || !Number.isFinite(Date.parse(session.date_start))) continue;
				const existing = events.get(session.meeting_key);
				if (existing) {
					if (session.date_start < existing.dateStart) existing.dateStart = session.date_start;
					if (session.date_start > existing.dateEnd) existing.dateEnd = session.date_start;
				} else {
					events.set(session.meeting_key, {
						meetingKey: session.meeting_key,
						name: session.country_name,
						slug: `${session.country_name.toLowerCase().replace(/\s+/g, '-')}-${session.meeting_key}`,
						dateStart: session.date_start,
						dateEnd: session.date_start,
						gmtOffset: session.gmt_offset
					});
				}
			}
			const counts = new SvelteMap<string, number>();
			for (const event of events.values())
				counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
			availableCountries = Array.from(events.values())
				.map((event) => ({
					...event,
					name:
						(counts.get(event.name) ?? 0) > 1
							? `${event.name} · ${sessions.find((session) => session.meeting_key === event.meetingKey)?.location ?? ''}`
							: event.name
				}))
				.sort((a, b) => a.dateStart.localeCompare(b.dateStart));
			if (availableCountries.length === 0) fetchError = `No sessions found for ${year}`;
		} catch (error) {
			if (currentRequest !== requestId) return;
			console.error('Failed to fetch year data:', error);
			fetchError = 'Could not load sessions. Try another year.';
		} finally {
			if (currentRequest === requestId) isFetching = false;
		}
	}

	function onCountrySelect(event: Event) {
		selectedCountry = (event.currentTarget as HTMLSelectElement).value;
		selectedSession = '';
		const selected = availableCountries.find((item) => item.slug === selectedCountry);
		const filtered = yearSessions
			.filter((session) => session.meeting_key === selected?.meetingKey)
			.sort((a, b) => a.date_start.localeCompare(b.date_start));
		const sessions = new SvelteMap<string, SelectOption>();
		for (const session of filtered) {
			const slug =
				sessionMap[session.session_name] || session.session_name.toLowerCase().replace(/\s+/g, '-');
			sessions.set(session.session_name, {
				name: session.session_name,
				slug,
				dateStart: session.date_start,
				gmtOffset: session.gmt_offset
			});
		}
		availableSessions = Array.from(sessions.values());
	}
</script>

<svelte:head>
	<title>Cooldown Room — Formula 1 Session Explorer</title>
	<meta name="description" content="Explore Formula 1 session results, driver positions, and performance across races and seasons." />
	<link rel="canonical" href={$page.url.origin + $page.url.pathname} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={$page.url.origin + $page.url.pathname} />
	<meta property="og:title" content="Cooldown Room — Formula 1 Session Explorer" />
	<meta property="og:description" content="Explore Formula 1 session results, driver positions, and performance across races and seasons." />
	<meta property="og:image" content={$page.url.origin + '/og-preview.png?v=2'} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:alt" content="Cooldown Room — Formula 1 Sessions" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={$page.url.origin + $page.url.pathname} />
	<meta name="twitter:title" content="Cooldown Room — Formula 1 Session Explorer" />
	<meta name="twitter:description" content="Explore Formula 1 session results, driver positions, and performance across races and seasons." />
	<meta name="twitter:image" content={$page.url.origin + '/og-preview.png?v=2'} />
</svelte:head>

<div class="min-h-screen font-sans text-white selection:bg-orange-500 selection:text-black">
	<header class="sticky top-0 z-50 rounded-2xl px-3 pt-3 backdrop-blur-xs sm:px-5 sm:pt-5">
		<nav
			aria-label="Main navigation"
			class="mx-auto flex max-w-7xl flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-neutral-900/90 px-4 py-4 shadow-[0_16px_45px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl sm:px-6 xl:flex-row xl:items-center xl:justify-between xl:gap-8"
		>
			<div class="flex min-w-0 items-center gap-4 sm:gap-5">
				<a
					href={resolve('/')}
					onclick={() => (mobileOpen = false)}
					class="group flex shrink-0 items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
					aria-label="Cooldown Room home"
				>
					<img
						src={logo}
						alt=""
						class="h-10 w-10 shrink-0 rounded-xl border border-white/10 object-contain shadow-[0_0_20px_rgba(255,122,48,0.15)] transition-transform group-hover:scale-105"
					/>
					<span class="text-lg font-black tracking-tight whitespace-nowrap sm:text-xl">
						Cooldown<span class="text-orange-400"> Room</span>
					</span>
				</a>

				{#if $page.data.result}
					{#await $page.data.result then result}
						{#if result.session}
							<div class="hidden h-9 w-px shrink-0 bg-white/15 md:block"></div>
							<div class="hidden min-w-0 md:block">
								<p class="text-[10px] font-bold tracking-[0.18em] text-orange-400 uppercase">
									{$page.url.pathname === '/' ? 'Latest available session' : 'Viewing session'}
								</p>
								<p class="truncate text-sm font-semibold text-neutral-100">
									{result.session.country_name}
									<span class="mx-1 text-neutral-500">/</span>
									{result.session.session_name}
								</p>
								<p class="mt-0.5 text-xs text-neutral-400">
									{displayDate(result.session.date_start, result.session.gmt_offset)}
								</p>
							</div>
						{/if}
					{/await}
				{/if}
				<button
					type="button"
					aria-controls="header-explorer"
					aria-expanded={mobileOpen}
					aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
					onclick={() => (mobileOpen = !mobileOpen)}
					class="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl text-orange-400 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 md:hidden"
				>
					<span aria-hidden="true">{mobileOpen ? '×' : '☰'}</span>
				</button>
			</div>

			<div
				id="header-explorer"
				class="min-w-0 grid-cols-2 gap-2 md:grid md:grid-cols-[minmax(6rem,0.7fr)_minmax(9rem,1.2fr)_minmax(9rem,1.2fr)_auto] xl:w-[min(100%,42rem)] xl:shrink-0"
				class:grid={mobileOpen}
				class:hidden={!mobileOpen}
			>
				<label
					class="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 transition-colors focus-within:border-orange-400/70 hover:bg-white/10"
				>
					<span class="block text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase"
						>Year</span
					>
					<select
						value={selectedYear}
						onchange={onYearSelect}
						class="w-full min-w-0 cursor-pointer bg-transparent text-sm font-semibold text-white outline-none"
					>
						<option value="" disabled>Select year</option>
						{#each availableYears as year (year)}
							<option value={String(year)}>{year}</option>
						{/each}
					</select>
				</label>

				<label
					class="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 transition-colors focus-within:border-orange-400/70 hover:bg-white/10 has-[select:disabled]:opacity-45"
				>
					<span class="block text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase"
						>Grand Prix</span
					>
					<select
						value={selectedCountry}
						onchange={onCountrySelect}
						disabled={!selectedYear || isFetching || availableCountries.length === 0}
						class="w-full min-w-0 cursor-pointer bg-transparent text-sm font-semibold text-white outline-none disabled:cursor-not-allowed"
					>
						<option value="" disabled>{isFetching ? 'Loading...' : 'Select race'}</option>
						{#each availableCountries as country (country.slug)}
							<option value={country.slug}
								>{country.name} · {displayDate(country.dateEnd, country.gmtOffset, false)}</option
							>
						{/each}
					</select>
				</label>

				<label
					class="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 transition-colors focus-within:border-orange-400/70 hover:bg-white/10 has-[select:disabled]:opacity-45"
				>
					<span class="block text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase"
						>Session</span
					>
					<select
						value={selectedSession}
						onchange={(event) =>
							(selectedSession = (event.currentTarget as HTMLSelectElement).value)}
						disabled={!selectedCountry || availableSessions.length === 0}
						class="w-full min-w-0 cursor-pointer bg-transparent text-sm font-semibold text-white outline-none disabled:cursor-not-allowed"
					>
						<option value="" disabled>Select session</option>
						{#each availableSessions as session (session.slug)}
							<option value={session.slug}
								>{session.name} · {displayDate(session.dateStart, session.gmtOffset, false)}</option
							>
						{/each}
					</select>
				</label>

				{#if destination}
					<a
						href={destination}
						class="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-extrabold text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 md:col-span-1"
						onclick={() => (mobileOpen = false)}
					>
						Explore <span aria-hidden="true">↗</span>
					</a>
				{:else}
					<span
						class="col-span-2 flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 text-sm font-extrabold text-neutral-500 md:col-span-1"
					>
						Explore <span aria-hidden="true">↗</span>
					</span>
				{/if}
			</div>
		</nav>
		{#if selectedEvent}
			<p class="mx-auto mt-2 max-w-7xl px-4 text-xs font-semibold text-neutral-300">
				<span class="text-orange-400">{selectedEvent.name}</span>
				<span class="mx-2 text-neutral-600">/</span>
				{#if selectedSessionOption}
					{selectedSessionOption.name} · {displayDate(
						selectedSessionOption.dateStart,
						selectedSessionOption.gmtOffset
					)}
				{:else}
					{eventDates(selectedEvent)}
				{/if}
			</p>
		{:else if $page.data.result}
			{#await $page.data.result then result}
				{#if result.session}
					<p class="mx-auto mt-2 max-w-7xl px-4 text-xs font-semibold text-neutral-300 md:hidden">
						<span class="text-orange-400">{result.session.country_name}</span>
						<span class="mx-2 text-neutral-600">/</span>
						{result.session.session_name} · {displayDate(
							result.session.date_start,
							result.session.gmt_offset
						)}
					</p>
				{/if}
			{/await}
		{/if}
		{#if fetchError}
			<p class="mx-auto mt-2 max-w-7xl px-4 text-xs text-orange-300" role="status">{fetchError}</p>
		{/if}
	</header>

	{@render children()}
</div>
