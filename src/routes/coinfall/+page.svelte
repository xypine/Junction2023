<script lang="ts">
	import { onMount } from "svelte";

	import * as BABYLON from "babylonjs";
	import "babylonjs-loaders";
	import Matter from "matter-js";
	import type { FontLoadResponse } from "$lib/font_loader_worker";
	import type { Writable } from "svelte/store";
	import FontLoader from "$lib/font_loader.svelte";

	let canvas: HTMLCanvasElement;

	let screen_width: number;
	let screen_height: number;
	let bounding_boxes: Writable<Map<number, DOMRect>>;
	let all_loaded: Writable<boolean>;
	let to_draw: Writable<FontLoadResponse[]>;
	function removeMesh() {
		if (meshes.length > 0) {
			let mesh = meshes.pop();
			if (mesh != null) {
				mesh.forEach((m) => {
					m.dispose();
				});
			}
		}
	}
	function removeAllBodies() {
		for (let body of phyworld.bodies) {
			Matter.World.remove(phyworld, body);
		}
		meshes.forEach((mesh) => {
			mesh.forEach((m) => {
				m.dispose();
			});
		});
	}
	function addCircle(x: number, y: number, radius: number) {
		const circle = Matter.Bodies.circle(x, y, radius, {
			isStatic: true,
			friction: 0.5,
			restitution: 0.5
		});
		Matter.World.add(phyworld, circle);

		var myMaterial = new BABYLON.StandardMaterial("myMaterial", scene);
		myMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.2);
		//myMaterial.specularColor = new BABYLON.Color3(1, 1, 0);
		// myMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0);
		// myMaterial.ambientColor = new BABYLON.Color3(1, 1, 0);
		// myMaterial.diffuseTexture = new BABYLON.Texture("metallic.png", scene);
		BABYLON.SceneLoader.ImportMeshAsync("", "./", "coin.obj").then((result) => {
			result.meshes.forEach((mesh) => {
				mesh.normalizeToUnitCube();
				mesh.material = myMaterial;
				mesh.position = new BABYLON.Vector3(
					Math.random() * 30, // width
					Math.random() * 10, // height
					Math.random() * 20 // length
				);
				mesh.rotation = new BABYLON.Vector3(
					Math.random() * 2 * Math.PI,
					Math.random() * 2 * Math.PI,
					Math.random() * 2 * Math.PI
				);
			});
			meshes.push(result.meshes);
			console.log("Meshes", meshes);
		});
	}

	let phyengine: Matter.Engine;
	let phyworld: Matter.World;
	let scene: BABYLON.Scene;
	let meshes: BABYLON.AbstractMesh[][] = [];
	onMount(async () => {
		phyengine = Matter.Engine.create();
		phyworld = phyengine.world;
		let runner = Matter.Runner.create();
		Matter.Runner.run(runner, phyengine);
		phyworld = phyengine.world;

		const engine = new BABYLON.WebGPUEngine(canvas, {}); // Generate the BABYLON 3D engine
		await engine.initAsync();

		const createScene = function (amountOfCoins = 100) {
			// Creates a basic Babylon Scene object
			const scene = new BABYLON.Scene(engine);

			scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

			// Creates and positions a free camera
			const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);
			camera.setTarget(BABYLON.Vector3.Zero());
			const light = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(0, 5, -10), scene);

			return scene;
		};
		scene = createScene(); //Call the createScene function
		// Register a render loop to repeatedly render the scene
		engine.runRenderLoop(function () {
			scene.render();
		});
		// Watch for browser/canvas resize events
		window.addEventListener("resize", function () {
			engine.resize();
		});

		let frame = 0;
		addCircle(0, 0, 1);
		addCircle(0, 10, 1);
		setInterval(() => {
			frame++;
			/*
			if (canvas == null) return;
			if (!$all_loaded) return;
            */

			// rain
			phyworld.gravity.y = 0.5 / 1.2;
			phyworld.gravity.x = phyworld.gravity.x = Math.sin(Date.now() * 0.001) * 0.1;
			// spawn new bodies
			if (false) {
				for (let i = 0; i < 1; i += 1) {
					if (frame % 1 !== 0) continue;
					addCircle(Matter.Common.random(-100, screen_width + 100), -500, 1);
				}
			}

			Matter.Engine.update(phyengine, 1000 / 60);
			for (let body of phyworld.bodies) {
				if (body.position.y > screen_height) {
					Matter.World.remove(phyworld, body);
					//removeMesh();
					continue;
				}
			}

			let i = 0;
			for (let body of phyworld.bodies) {
				//console.log("Body position", i, body.position);
				if (meshes.length > i - 1) {
					let collection = meshes.at(i);
					if (collection == null) {
						console.warn("Collection is null", i);
						continue;
					}
					collection.forEach((mesh) => {
						mesh.position = new BABYLON.Vector3(body.position.x, body.position.y, 0);
						//console.log("Mesh position", mesh.position);
					});
				}

				i++;
				if (body.isStatic) {
					/*
					context.fillStyle = "red";
					context.fillRect(body.position.x, body.position.y, 2, 2);
                    */

					continue;
				}
				/*
				context.fillStyle = "#00f9";
				// fill the circle
				context.beginPath();
				context.arc(body.position.x, body.position.y, body.circleRadius, 0, 2 * Math.PI);
				context.fill();
				context.closePath();
                */

				// render a coin for each body at (body.position.x, body.position.y, 0)
			}
		}, 1000 / 60);
	});
</script>

<main>
	<canvas id="renderCanvas" bind:this={canvas} />
	<FontLoader
		{screen_height}
		{screen_width}
		font_sources={[
			{
				cssName: "Agbalumo",
				url: "/Agbalumo-Regular.ttf"
			},
			{
				cssName: "Boxed",
				url: "/BoxedRegular.ttf"
			}
		]}
		{removeAllBodies}
		{addCircle}
		bind:bounding_boxes
		bind:to_draw
		bind:all_loaded
	/>
</main>

<style>
	main {
		overflow: hidden;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
	}
	#renderCanvas {
		width: 100%;
		height: 100%;
		touch-action: none;
	}
</style>
