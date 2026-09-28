<script lang="ts">
	import DriverDetail from './DriverDetail.svelte';
	import { resultLabel } from '$lib/resultLabel';
	import type { RankedDriver, Session } from '$lib/types';

	let { session, drivers, error, eyebrow } = $props<{
		session: Session | null;
		drivers: RankedDriver[];
		error: string;
		eyebrow: string;
	}>();

	let selectedIndex = $state<number | null>(null);
	const selectedDriver = $derived(selectedIndex === null ? null : drivers[selectedIndex]);
</script>

<svelte:head>
	<title
		>{session ? `${session.country_name} ${session.session_name}` : 'Cooldown Room'} | Cooldown Room</title
	>
	<meta name="description" content="Explore Formula 1 drivers and session positions." />
</svelte:head>

<main class="relative isolate mx-auto max-w-7xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16 lg:pt-20">
	<div
		class="pointer-events-none absolute top-0 right-0 -z-10 h-96 w-96 rounded-full bg-orange-500/10 blur-[110px]"
	></div>
	<section class="mb-10 grid gap-8 lg:mb-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
		<div class="max-w-3xl">
			<p
				class="mb-4 flex items-center gap-2 text-xs font-extrabold tracking-[0.22em] text-orange-400 uppercase"
			>
				<span class="h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_15px_rgba(255,122,48,0.7)]"
				></span>
				{eyebrow}
			</p>
			<h1
				class="text-5xl leading-[0.98] font-black tracking-[-0.055em] text-[#e9e3df] sm:text-6xl lg:text-7xl"
			>
				{#if session}
					{session.country_name}<span class="text-orange-400">.</span>
				{:else}
					The grid<span class="text-orange-400">.</span>
				{/if}
			</h1>
			<p class="mt-4 text-base text-neutral-400 sm:text-lg">
				{session
					? `${session.session_name} · Explore the drivers and their positions.`
					: 'Choose a season and session above to explore the drivers.'}
			</p>
		</div>
		{#if session}
			<div
				class="flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-neutral-300 backdrop-blur-xl"
			>
				<span class="h-2 w-2 rounded-full bg-orange-400"></span>
				<span class="font-semibold">{drivers.length} drivers</span>
				<span class="h-4 w-px bg-white/15"></span>
				<span>{new Date(session.date_start).getUTCFullYear()}</span>
			</div>
		{/if}
	</section>

	{#if error}
		<div
			class="mb-8 rounded-2xl border border-orange-400/20 bg-orange-400/10 px-5 py-4 text-sm text-orange-100"
			role="status"
		>
			{error}
		</div>
	{/if}

	{#if drivers.length > 0}
		<div class="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
			<p class="text-xs font-extrabold tracking-[0.2em] text-neutral-400 uppercase">The lineup</p>
			<p class="text-xs text-neutral-500">Select a driver for details</p>
		</div>
		<div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-x-8 md:gap-y-5">
			{#each drivers as driver, index (driver.driver_number)}
				<div class="min-w-0 md:even:mt-8">
					<button
						type="button"
						onclick={() => (selectedIndex = selectedIndex === index ? null : index)}
						aria-expanded={selectedIndex === index}
						style="--team-color: #{driver.team_colour.replace(/^#/, '')}"
						class="group relative flex w-full min-w-0 items-center gap-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--team-color)] hover:bg-white/[0.09] hover:shadow-[0_18px_40px_rgba(0,0,0,0.22)] focus-visible:outline-2 focus-visible:outline-orange-400 sm:gap-5 sm:p-5"
					>
						<span
							class="absolute top-0 bottom-0 left-0 w-1 bg-[color:var(--team-color)] transition-all group-hover:w-1.5"
						></span>
						<span
							class="w-12 shrink-0 text-center text-2xl font-black tracking-tight text-orange-400 sm:w-14 sm:text-3xl"
						>
							{resultLabel(driver)}
						</span>
						{#if driver.headshot_url}
							<span
								class="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/10 sm:h-20 sm:w-20"
							>
								<img
									class="h-full w-full object-cover object-top"
									src={driver.headshot_url}
									alt=""
									loading="lazy"
								/>
							</span>
						{:else}
							<span
								class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-400/10 text-2xl font-black text-orange-400 sm:h-20 sm:w-20"
							>
								{driver.full_name.charAt(0)}
							</span>
						{/if}
						<span class="min-w-0 flex-1">
							<span
								class="block truncate text-base font-black tracking-tight text-[#e9e3df] sm:text-lg"
								>{driver.full_name}</span
							>
							<span class="mt-1 block truncate text-xs font-semibold tracking-wide text-neutral-400"
								>{driver.team_name}</span
							>
						</span>
						<span class="hidden shrink-0 flex-col items-end sm:flex">
							<span class="text-[10px] font-bold tracking-[0.16em] text-neutral-500 uppercase"
								>Car</span
							>
							<span class="text-xl font-black text-neutral-300">#{driver.driver_number}</span>
						</span>
						<span
							class="ml-1 shrink-0 text-lg text-orange-400 transition-transform group-hover:translate-x-1"
							aria-hidden="true">↗</span
						>
					</button>
				</div>
			{/each}
		</div>
	{/if}
</main>

{#if selectedDriver && session}
	<DriverDetail driver={selectedDriver} {session} onClose={() => (selectedIndex = null)} />
{/if}
