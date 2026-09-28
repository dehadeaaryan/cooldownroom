<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	let { children } = $props();

	const firstSeason = 1950;
	const currentYear = new Date().getFullYear();
	const availableYears = Array.from(
		{ length: currentYear - firstSeason + 1 },
		(_, index) => currentYear - index
	);

	// State for cascading selections
	let selectedYear = $state('');
	let selectedCountry = $state('');
	let selectedSession = $state('');

	// Data stores
	let yearSessions = $state<{ country_name?: string; session_name: string }[]>([]);
	let availableCountries = $state<{ name: string; slug: string }[]>([]);
	let availableSessions = $state<{ name: string; slug: string }[]>([]);

	let isFetching = $state(false);

	// Map OpenF1 session names to your URL slugs
	const sessionMap: Record<string, string> = {
		'Practice 1': 'fp1',
		'Practice 2': 'fp2',
		'Practice 3': 'fp3',
		Qualifying: 'quali',
		'Sprint Qualifying': 'sq',
		Sprint: 'sprint',
		Race: 'race'
	};

	async function onYearSelect(e: Event) {
		selectedYear = (e.target as HTMLSelectElement).value;

		selectedCountry = '';
		selectedSession = '';
		availableCountries = [];
		availableSessions = [];

		if (!selectedYear) return;

		isFetching = true;
		try {
			const res = await fetch(`https://api.openf1.org/v1/sessions?year=${selectedYear}`);
			if (!res.ok) throw new Error(`OpenF1 returned ${res.status}`);
			yearSessions = await res.json();

			const countries = new Map<string, string>();
			for (const s of yearSessions) {
				if (s.country_name) {
					const slug = s.country_name.toLowerCase().replace(/\s+/g, '-');
					countries.set(s.country_name, slug);
				}
			}
			availableCountries = Array.from(countries.entries()).map(([name, slug]) => ({ name, slug }));
		} catch (err) {
			console.error('Failed to fetch year data:', err);
			yearSessions = [];
			availableCountries = [];
		} finally {
			isFetching = false;
		}
	}

	function onCountrySelect(e: Event) {
		selectedCountry = (e.target as HTMLSelectElement).value;
		selectedSession = '';

		const filtered = yearSessions.filter(
			(s) => s.country_name?.toLowerCase().replace(/\s+/g, '-') === selectedCountry
		);

		const sessions = new Map<string, string>();
		for (const s of filtered) {
			const slug = sessionMap[s.session_name] || s.session_name.toLowerCase().replace(/\s+/g, '-');
			sessions.set(s.session_name, slug);
		}
		availableSessions = Array.from(sessions.entries()).map(([name, slug]) => ({ name, slug }));
	}

	function submitNavigation() {
		if (selectedYear && selectedCountry && selectedSession) {
			goto(`/${selectedYear}/${selectedCountry}/${selectedSession}`);
		}
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div
	class="min-h-screen bg-neutral-950 font-sans text-white selection:bg-red-500 selection:text-white"
>
	<nav class="sticky top-0 z-50 border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur-xl">
		<div
			class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
		>
			<!-- Left Side: Logo & Active Session Indicator -->
			<div class="flex min-w-0 flex-wrap items-center gap-3 md:gap-6">
				<a href="/" class="group flex items-center gap-2">
					<span class="flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"></span>
					<span
						class="text-lg font-extrabold tracking-tighter uppercase transition-colors group-hover:text-neutral-300"
					>
						Cooldown Room
					</span>
				</a>

				<!-- Render the session info if the current page load returned it -->
				{#if $page.data.session}
					<div class="hidden h-6 w-px bg-neutral-700/50 md:block"></div>
					<div class="min-w-0 flex flex-col">
						<p class="font-mono text-[10px] tracking-wider text-neutral-400 uppercase">
							<!-- Show "Latest" if on home, otherwise "Viewing" -->
							{$page.url.pathname === '/' ? 'Latest Session' : 'Viewing Session'}
						</p>
						<p class="truncate text-sm font-semibold text-neutral-200">
							{$page.data.session.country_name} <span class="text-neutral-600">—</span>
							<span class="font-bold text-white">{$page.data.session.session_name}</span>
						</p>
					</div>
				{/if}
			</div>

			<!-- Right Side: Navigation Dropdowns -->
			<div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
				<!-- 1. Year -->
				<select
					value={selectedYear}
					onchange={onYearSelect}
					aria-label="Year"
					class="min-w-0 cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-200 transition-colors outline-none hover:border-neutral-700 focus:border-red-500/50 sm:min-w-24"
				>
					<option value="" disabled>Year</option>
					{#each availableYears as year}
						<option value={year}>{year}</option>
					{/each}
				</select>

				<!-- 2. Country -->
				<select
					value={selectedCountry}
					onchange={onCountrySelect}
					disabled={!selectedYear || isFetching}
					aria-label="Country"
					class="min-w-0 cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-200 transition-colors outline-none hover:border-neutral-700 focus:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-36"
				>
					<option value="" disabled>
						{isFetching ? 'Loading...' : 'Country'}
					</option>
					{#each availableCountries as country}
						<option value={country.slug}>{country.name}</option>
					{/each}
				</select>

				<!-- 3. Session -->
				<select
					value={selectedSession}
					onchange={(e) => (selectedSession = (e.target as HTMLSelectElement).value)}
					disabled={!selectedCountry}
					aria-label="Session"
					class="min-w-0 cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-200 transition-colors outline-none hover:border-neutral-700 focus:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-36"
				>
					<option value="" disabled>Session</option>
					{#each availableSessions as session}
						<option value={session.slug}>{session.name}</option>
					{/each}
				</select>

				<!-- 4. Go Button -->
				<button
					onclick={submitNavigation}
					disabled={!selectedYear || !selectedCountry || !selectedSession}
					class="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 font-mono text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-red-600 sm:px-4"
				>
					<span>Go</span>
					<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2.5"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			</div>
		</div>
	</nav>

	{@render children()}
</div>
