<script lang="ts">
	import type { Driver, Session } from '$lib/types';
	import { fly } from 'svelte/transition';

	let {
		driver,
		session,
		position,
		isDesktop = false,
		isLeftColumn = true,
		onClose
	} = $props<{
		driver: Driver;
		session: Session;
		position: number;
		isDesktop?: boolean;
		isLeftColumn?: boolean;
		onClose: () => void;
	}>();
</script>

{#if isDesktop}
	<!-- Invisible overlay to close on background click (Desktop only) -->
	<button
		class="fixed inset-0 z-40 cursor-default bg-transparent"
		aria-label="Close modal"
		onclick={onClose}
	></button>
{/if}

<div
	in:fly={{ y: 20, duration: 300 }}
	out:fly={{ y: 20, duration: 200 }}
	class="
        overflow-hidden rounded-2xl border border-neutral-700/80 bg-neutral-800/80 p-6 shadow-2xl backdrop-blur-2xl
        {isDesktop
		? `fixed top-1/2 z-50 w-[calc(50vw-2rem)] max-w-md -translate-y-1/2 ${isLeftColumn ? 'right-4 lg:right-12 xl:right-[10%]' : 'left-4 lg:left-12 xl:left-[10%]'}`
		: 'relative z-10 mt-2 w-full'}
    "
	style="box-shadow: 0 25px 50px -12px #{driver.team_colour}40;"
>
	<!-- Modal Header -->
	<div class="mb-6 flex items-start justify-between">
		<div class="flex items-center gap-3">
			<div class="h-4 w-1 rounded-full" style="background-color: #{driver.team_colour}"></div>
			<h3 class="font-mono text-sm tracking-widest text-neutral-400 uppercase">
				Telemetry Readout
			</h3>
		</div>
		<button
			onclick={onClose}
			aria-label="Close modal"
			class="rounded-full bg-neutral-700/50 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-500 hover:text-white"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>

	<!-- Modal Content Grid -->
	<div class="relative z-10 flex flex-col gap-4">
		<h2 class="text-3xl font-black tracking-tight text-white uppercase">
			{driver.full_name}
		</h2>
		<div class="grid grid-cols-2 gap-4">
			<div class="rounded-xl border border-neutral-700/50 bg-neutral-900/50 p-4">
				<p class="font-mono text-xs text-neutral-500 uppercase">Constructor</p>
				<p class="mt-1 font-bold text-neutral-200">{driver.team_name}</p>
			</div>
			<div class="rounded-xl border border-neutral-700/50 bg-neutral-900/50 p-4">
				<p class="font-mono text-xs text-neutral-500 uppercase">Car Number</p>
				<p class="mt-1 font-bold" style="color: #{driver.team_colour}">
					#{driver.driver_number}
				</p>
			</div>
		</div>

		<!-- Data Placeholder -->
		<div
			class="flex items-center justify-between rounded-xl border border-neutral-700/50 bg-neutral-900/50 p-5"
		>
			<div class="flex flex-col">
				<span
					class="mb-1 flex items-center gap-2 font-mono text-[10px] tracking-widest text-neutral-400 uppercase"
				>
					<span class="flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
					Latest Result
				</span>
				<span class="text-sm font-bold text-neutral-200">{session.country_name}</span>
				<span class="text-xs text-neutral-500">{session.session_name}</span>
			</div>

			<div class="flex flex-col items-end">
				<span class="font-mono text-[10px] tracking-widest text-neutral-500 uppercase">Finish</span>
				<span class="text-4xl font-black tracking-tighter text-white italic">
					P{position}
				</span>
			</div>
		</div>
	</div>

	<!-- Background Watermark -->
	<div class="pointer-events-none absolute -right-4 -bottom-10 z-0 opacity-[0.07]">
		<span
			class="font-mono text-[180px] font-black tracking-tighter italic"
			style="color: #{driver.team_colour}"
		>
			{driver.driver_number}
		</span>
	</div>
</div>
