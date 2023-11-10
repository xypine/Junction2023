<script lang="ts">
	import { onMount } from "svelte";

	let hasWebGPU = true;

	onMount(async () => {
		try {
			const adapter = await navigator.gpu.requestAdapter();
			if (!adapter) {
				hasWebGPU = false;
				throw new Error("WebGPU not supported on this browser.");
			}
		} catch (e) {
			hasWebGPU = false;
			throw e;
		}
	});
</script>

{#if !hasWebGPU}
	<div class="content-cont">
		<h1>Your browser does not seem to support WebGPU, which is required for this demo.</h1>

		<div class="not-supported-text">
			<p>WebGPU is not supported or enabled on this browser.</p>
			<p>
				On Chromium based browsers #enable-webgpu-developer-features should be enabled in
				chrome://flags and on Firefox Nightly dom.webgpu.enabled should be true in about:config.
			</p>
			<p>However, you can preview a video of the demo here:</p>

			<iframe
				width="560"
				height="315"
				src="https://www.youtube-nocookie.com/embed/ylYDjthFwvQ?si=pGuc23xRMpFeUvzI"
				title="YouTube video player"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				allowfullscreen
			/>
		</div>
	</div>
{:else}
	<slot />
{/if}

<style>
	:global(body) {
		font-family: sans-serif;
	}
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	.not-supported-text {
		max-width: 600px;
		text-align: center;
		padding: 1rem;
	}
	.not-supported-text p {
		margin: 1rem 0;
	}
	.content-cont {
		height: 100vh;
		height: 100svh;
		padding: 2rem;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
	}
</style>
