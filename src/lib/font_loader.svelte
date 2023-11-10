<script lang="ts">
	export let screen_width: number;
	export let screen_height: number;

	export let removeAllBodies: () => void;
	export let addCircle: (x: number, y: number, radius: number) => void;

	import { writable, type Writable } from "svelte/store";
	import type { FontLoadRequest, FontLoadResponse } from "./font_loader_worker";
	import { onMount, tick } from "svelte";
	import { measureText, x_scale } from "./metrics";
	import { parse } from "opentype.js";
	import FontWorker from "$lib/font_loader_worker?worker";

	export let canvas: Writable<HTMLCanvasElement | null> = writable(null);

	export const bounding_boxes: Writable<Map<number, DOMRect>> = writable(new Map());
	export const all_loaded: Writable<boolean> = writable(false);
	export const to_draw: Writable<FontLoadResponse[]> = writable([]);
	export let reloadKey = {};

	type FontSources = {
		cssName: string;
		url: string;
	}[];
	export let font_sources: FontSources;

	export async function redraw(font_sources: FontSources = [], iteration: number) {
		console.log("redraw");
		const supported_fonts = font_sources.map(({ cssName }) => cssName);
		console.log("supported_fonts:", supported_fonts);

		if (!$canvas) {
			throw new Error("Canvas not found");
		}
		const canvasctx = $canvas.getContext("2d");
		if (!canvasctx) {
			throw new Error("Canvas context not found");
		}
		// Wait for text to be rendered
		await tick();
		let i = 0;
		for (let element of document.querySelectorAll(".with-particles")) {
			// Skip empty elements
			if (!element.textContent || element.textContent === "") {
				console.warn("Empty text element", element);
				continue;
			}
			let fontFamily = window.getComputedStyle(element).getPropertyValue("font-family");
			if (fontFamily.startsWith('"') && fontFamily.endsWith('"'))
				fontFamily = fontFamily.slice(1, -1);
			console.log("fontFamily:", fontFamily);
			if (!supported_fonts.includes(fontFamily)) {
				console.warn("Source file not supplied for", fontFamily, "-> skipping element", element);
				continue;
			}
			const font_url = font_sources.find((font) => font.cssName === fontFamily)?.url;
			if (!font_url) {
				console.warn("Font url not found for", fontFamily, "-> skipping element", element);
				continue;
			}
			let boundingBox = element.getBoundingClientRect();
			// fix scroll by adding scrollY
			boundingBox = new DOMRect(
				boundingBox.x,
				boundingBox.y + window.scrollY,
				boundingBox.width,
				boundingBox.height
			);

			$bounding_boxes.set(i, boundingBox);
			let fontSize = window.getComputedStyle(element).getPropertyValue("font-size");
			console.log("fontSize:", fontSize);
			let fontSizeNum = parseFloat(fontSize);
			console.log("fontSizeNum:", fontSizeNum);
			const font_response = await fetch(font_url);
			if (!font_response.ok) {
				throw new Error(`Failed to load font ${font_url}`);
			}
			const font_buffer = await font_response.arrayBuffer();
			const font_data = parse(font_buffer);
			const paths = font_data.getPaths(element.textContent, 0, 0, fontSizeNum, {
				letterSpacing: 0,
				kerning: true
			});
			const paths_properties = measureText(element.textContent, font_data, fontSizeNum, x_scale);
			const paths_str = paths.map((path) => {
				return path.toPathData(3);
			});

			element.setAttribute("data-render-id", `${i}`);
			const request: FontLoadRequest = {
				type: "font_load_request",
				id: i,
				text: element.textContent,
				iteration,
				bounding_box: boundingBox,
				paths_properties,
				paths_str
			};
			console.log("sending request:", request);
			font_loader.postMessage(request);
			i++;
		}
	}

	let iteration = 0;
	$: if (mounted && screen_width != null && screen_height != null && reloadKey != null) {
		$all_loaded = false;
		iteration++;
		if (!$canvas) {
			throw new Error("Canvas not found");
		}
		const canvasctx = $canvas.getContext("2d");
		if (!canvasctx) {
			throw new Error("Canvas context not found");
		}
		canvasctx.clearRect(0, 0, screen_width, screen_height);
		$to_draw = [];
		$bounding_boxes = new Map();
		redraw(font_sources, iteration);
	}

	let mounted = false;
	let font_loader: Worker;
	onMount(() => {
		font_loader = new FontWorker();
		font_loader.onmessage = (event) => {
			let data: FontLoadResponse = event.data;
			if (data.iteration != iteration) {
				console.log("Skipping old response", data);
				return;
			} else {
				if (data.type === "font_load_response") {
					if ($to_draw.length === 0) {
						//remove all bodies
						removeAllBodies();
					}
					const boundingBox = $bounding_boxes.get(data.id);
					if (!boundingBox) {
						throw new Error("Bounding box not found for " + data.id);
					}
					for (let vertex of data.vertices) {
						// add a circle
						addCircle(vertex.x + boundingBox.x, vertex.y + boundingBox.y, 1);
					}
					$to_draw = [...$to_draw, data];
				}
				if ($to_draw.length === $bounding_boxes.size && !$all_loaded) {
					$all_loaded = true;
					console.log("All fonts processed");
				}
			}
		};
		font_loader.onerror = (event) => {
			throw event.error;
		};
		// wait for fonts to load
		setTimeout(() => {
			mounted = true;
		}, 200);
	});
</script>

<canvas width={screen_width} height={screen_height} bind:this={$canvas} />

<style>
	canvas {
		position: absolute;
		top: 0;
		left: 0;
		z-index: var(--z-index-canvas, -1);
		pointer-events: none;
	}
</style>
