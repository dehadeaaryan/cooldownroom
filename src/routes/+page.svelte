<script lang="ts">
	import SessionPage from '$lib/components/SessionPage.svelte';
	import LoadingPage from '$lib/components/LoadingPage.svelte';
	let { data } = $props();
</script>

{#await data.result}
	<LoadingPage />
{:then result}
	<SessionPage {...result} />
{/await}
