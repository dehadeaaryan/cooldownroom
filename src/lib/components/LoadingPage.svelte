<script lang="ts">
	let { label = 'Preparing the grid' } = $props<{ label?: string }>();
</script>

<main class="mx-auto max-w-7xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16 lg:pt-20" aria-busy="true">
	<div class="mb-10 max-w-3xl" role="status">
		<p
			class="mb-4 flex items-center gap-2 text-xs font-extrabold tracking-[0.22em] text-orange-400 uppercase"
		>
			<span class="h-2 w-2 rounded-full bg-orange-400 motion-safe:animate-pulse"></span>
			{label}
		</p>
		<h1
			class="text-5xl leading-[0.98] font-black tracking-[-0.055em] text-[#e9e3df] sm:text-6xl lg:text-7xl"
		>
			Loading<span class="text-orange-400">.</span>
		</h1>
		<p class="mt-4 text-base text-neutral-400 sm:text-lg">
			Gathering the session and driver order.
		</p>
	</div>

	<div class="mb-5 h-5 w-32 rounded-full bg-white/10 motion-safe:animate-pulse"></div>
	<div
		class="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-x-8 md:gap-y-5"
		aria-hidden="true"
	>
		{#each [0, 1, 2, 3, 4, 5] as item (item)}
			<div
				class="flex h-28 items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5 motion-safe:animate-pulse md:even:mt-8"
			>
				<div class="h-8 w-12 rounded-lg bg-orange-400/15"></div>
				<div class="h-16 w-16 rounded-2xl bg-white/10"></div>
				<div class="flex-1 space-y-3">
					<div class="h-4 w-2/3 rounded-full bg-white/15"></div>
					<div class="h-3 w-1/3 rounded-full bg-white/10"></div>
				</div>
			</div>
		{/each}
	</div>
</main>
