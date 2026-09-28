<script lang="ts">
	import DriverModal from './DriverModal.svelte';
	let { data } = $props();

	// Track the currently selected card index
	let selectedIndex = $state<number | null>(null);

	function handleCardClick(index: number) {
		// If clicking the already open card, close it. Otherwise open the new one.
		selectedIndex = selectedIndex === index ? null : index;
	}
</script>

<main class="min-h-screen bg-neutral-950 p-6 font-sans text-white md:p-10">
	<div class="mx-auto grid max-w-7xl grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-x-8">
		{#each data.drivers as driver, index}
			<div class="flex flex-col md:even:mt-6">
				<div
					class="group relative flex cursor-pointer flex-row items-center justify-between gap-4 overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-4 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-neutral-700/80 hover:bg-neutral-800/50 hover:shadow-2xl"
					onclick={() => handleCardClick(index)}
					onkeydown={(e) => e.key === 'Enter' && handleCardClick(index)}
					role="button"
					tabindex="0"
				>
					<!-- Left accent color bar representing the team -->
					<div
						class="absolute top-0 bottom-0 left-0 w-1.5 transition-all group-hover:w-2"
						style="background-color: #{driver.team_colour}"
					></div>

					<!-- Left section: Position, Headshot, and Details -->
					<div class="relative z-10 flex items-center gap-2">
						<!-- Finishing Position -->
						<div class="flex w-8 items-center justify-center sm:w-12">
							<span
								class="font-mono text-xl font-black tracking-tighter text-white italic drop-shadow-md sm:text-3xl"
							>
								P{index + 1}
							</span>
						</div>

						<!-- Headshot -->
						{#if driver.headshot_url}
							<div class="h-16 w-16 overflow-hidden">
								<img src={driver.headshot_url} alt={driver.full_name} />
							</div>
						{/if}

						<!-- Name and Team -->
						<div class="flex flex-col justify-center gap-1">
							<h2
								class="sm:text-md text-base leading-none font-bold tracking-tight text-white uppercase"
							>
								{driver.full_name}
							</h2>
							<h3 class="font-mono text-xs tracking-wider text-neutral-400 uppercase sm:text-xs">
								{driver.team_name}
							</h3>
						</div>
					</div>

					<div class="relative z-10 flex flex-col items-center justify-center">
						<span
							class="font-mono text-sm font-semibold tracking-tighter text-neutral-500 uppercase"
						>
							Car
						</span>
						<span
							style="color: #{driver.team_colour}"
							class="font-mono text-xl font-black tracking-tighter italic opacity-80 transition-opacity group-hover:opacity-100 sm:text-2xl"
						>
							{driver.driver_number}
						</span>
					</div>
				</div>
				<!-- MOBILE MODAL: Callout style injected directly below the clicked card -->
				{#if selectedIndex === index}
					<div class="md:hidden">
						<DriverModal
							{driver}
							session={data.session}
							position={index + 1}
							onClose={() => (selectedIndex = null)}
						/>
					</div>
				{/if}
			</div>
		{/each}
	</div>
	<!-- DESKTOP MODAL: Fixed viewport overlay on the opposite side of the screen -->
	{#if selectedIndex !== null}
		<div class="hidden md:block">
			<DriverModal
				driver={data.drivers[selectedIndex]}
				session={data.session}
				position={selectedIndex + 1}
				isDesktop={true}
				isLeftColumn={selectedIndex % 2 === 0}
				onClose={() => (selectedIndex = null)}
			/>
		</div>
	{/if}
</main>
