<script lang="ts">
	import { onMount, tick } from "svelte";
	import Matter, { Engine, Runner } from "matter-js";
	import Agbalumo from "$lib/fonts/agbalumo.svelte";
	import Boxed from "$lib/fonts/boxed.svelte";

	import type { FontLoadResponse } from "$lib/font_loader_worker";
	import { fps } from "@sveu/browser";

	let screen_width: number;
	let screen_height: number;
	let bounding_boxes: Writable<Map<number, DOMRect>>;
	let all_loaded: Writable<boolean>;
	let to_draw: Writable<FontLoadResponse[]>;
	let canvas: Writable<HTMLCanvasElement | null>;

	function removeAllBodies() {
		for (let body of world.bodies) {
			Matter.World.remove(world, body);
		}
	}
	function addCircle(x: number, y: number, radius: number) {
		const circle = Matter.Bodies.circle(x, y, 1, {
			isStatic: true,
			friction: 0,
			restitution: 0.5
		});
		Matter.World.add(world, circle);
	}

	const font_sources = [
		{
			cssName: "Agbalumo",
			url: "/Agbalumo-Regular.ttf"
		},
		{
			cssName: "Boxed",
			url: "/BoxedRegular.ttf"
		}
	];

	$: if (mounted && $to_draw != null && $to_draw.length > 0) {
		// don't use webgpu (for now)
		if (!$canvas) {
			throw new Error("Canvas not found");
		}
		const canvasctx = $canvas.getContext("2d");
		if (!canvasctx) {
			throw new Error("Canvas context not found");
		}
		canvasctx.clearRect(0, 0, screen_width, screen_height);
		for (let response of $to_draw) {
			const boundingBox = $bounding_boxes.get(response.id);
			if (!boundingBox) {
				throw new Error("Bounding box not found for " + response.id);
			}
			canvasctx.strokeStyle = "green";
			canvasctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);

			for (let vertex of response.vertices) {
				canvasctx.fillStyle = "red";
				canvasctx.fillRect(vertex.x + boundingBox.x, vertex.y + boundingBox.y, 1, 1);
			}
			/*
			for (let line of response.lines) {
				for (let i = 0; i < line.points.length - 1; i++) {
					const vertex1 = line.points[i];
					const vertex2 = line.points[i + 1];
					canvasctx.strokeStyle = "blue";
					canvasctx.beginPath();
					canvasctx.moveTo(
						vertex1.x + boundingBox.x,
						vertex1.y - response.svgOrigin.y + boundingBox.y
					);
					canvasctx.lineTo(
						vertex2.x + boundingBox.x,
						vertex2.y - response.svgOrigin.y + boundingBox.y
					);
					canvasctx.stroke();
				}
			}
			*/
		}
	}

	let mounted = false;
	import FontLoader from "$lib/font_loader.svelte";
	import type { Writable } from "svelte/store";
	let engine: Matter.Engine;
	let world: Matter.World;
	onMount(() => {
		// Setup matter.js
		setupMatter();
		setTimeout(() => {
			mounted = true;
		}, 200);
	});

	let matter_interval: any;
	function setupMatter() {
		if (matter_interval) {
			clearInterval(matter_interval);
			removeAllBodies();
		}
		engine = Engine.create();
		world = engine.world;
		let runner = Matter.Runner.create();
		Runner.run(runner, engine);
		world = engine.world;
		world.gravity.y = 0;
		world.gravity.x = 0;
		let frame = 0;
		matter_interval = setInterval(() => {
			frame++;
			if (canvas == null) return;
			if (!$all_loaded) return;

			// rain
			world.gravity.y = 0.5 / 1.2;
			world.gravity.x = world.gravity.x = Math.sin(Date.now() * 0.001) * 0.1;
			// spawn new bodies
			for (let i = 0; i < 1; i += 1) {
				if (frame % 1 !== 0) continue;
				let body = Matter.Bodies.circle(
					Matter.Common.random(-100, screen_width + 100),
					-500,
					Matter.Common.random(4, 8),
					{
						plugin: {},
						friction: 0,
						restitution: 0.5
					}
				);

				Matter.World.add(world, body);
			}

			Engine.update(engine, 1000 / 60);
			if (!$canvas) {
				throw new Error("Canvas not found");
			}
			let context = $canvas.getContext("2d");
			if (!context) {
				throw new Error("Canvas context not found");
			}
			for (let body of world.bodies) {
				if (body.position.y > screen_height) {
					Matter.World.remove(world, body);
					continue;
				}
			}
			context.clearRect(0, 0, screen_width, screen_height);
			for (let body of world.bodies) {
				if (body.isStatic) {
					/*
					context.fillStyle = "red";
					context.fillRect(body.position.x, body.position.y, 2, 2);
					*/
					continue;
				}
				context.fillStyle = "#00f9";
				// fill the circle
				context.beginPath();
				context.arc(body.position.x, body.position.y, body.circleRadius, 0, 2 * Math.PI);
				context.fill();
				context.closePath();
			}
		}, 1000 / 60);
	}

	$: if (screen_width != null && screen_height != null) {
		setupMatter();
	}

	const fps_s = fps({
		every: 60
	});
</script>

<!-- fonts -->
<Agbalumo />
<Boxed />

<!-- content -->
<p class="fps">fps: {$fps_s}</p>
<main bind:clientHeight={screen_height} bind:clientWidth={screen_width}>
	<h1 class="with-particles">VEIKKAUS</h1>
	<h2 class="with-particles">Example text lorem ipsum</h2>
	<p>this one doesn't have any collisions!</p>
	<a href="/scratch">See the scratcher demo</a>
	<FontLoader
		{screen_height}
		{screen_width}
		{font_sources}
		{removeAllBodies}
		{addCircle}
		bind:bounding_boxes
		bind:to_draw
		bind:all_loaded
		bind:canvas
	/>
</main>

<!-- styles -->

<style>
	.fps {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 2;
		padding: 1rem;
		background-color: #fff9;
	}
	main {
		height: 100vh;
		height: 100svh;
		padding: 2rem;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
		text-align: center;
	}
	h1 {
		font-family: "Boxed";
		font-size: 5em;
	}
	h2 {
		font-family: "Agbalumo";
		font-size: 3em;
	}
	p {
		font-family: "Boxed";
		font-size: 2em;
	}
	a {
		font-size: 2em;
	}
	.with-particles {
		opacity: 1;
		white-space: pre;
	}
</style>
