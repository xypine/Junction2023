<script lang="ts">
	import FontLoader from "$lib/font_loader.svelte";
	import type { FontLoadResponse } from "$lib/font_loader_worker";
	import Boxed from "$lib/fonts/boxed.svelte";
	import Roboto from "$lib/fonts/roboto.svelte";
	import Matter from "matter-js";
	import { onMount } from "svelte";
	import type { Writable } from "svelte/store";

	let canvas: HTMLCanvasElement;
	let isMouseDown = false;
	let lastPoint: { x: number; y: number } | null = null;

	let brushImg: HTMLImageElement | null = null;

	const brushWidth = 100,
		brushHeight = 100;
	const revealThreshold = 0.5; // * 100 = % of the image that must be revealed to win

	const gridWidth = 3,
		gridHeight = 3;

	// the names of the images that correspond to the values in the game board
	const winningValues = {
		0: "car",
		1: "bepo",
		2: "banana",
		5: "cherry",
		10: "burger",
		20: "energy",
		50: "junction",
		100: "rainbow",
		200: "veikkaus",
		500: "tkoaly",
		1000: "as"
	};

	let winningChance = 30; // %

	let gameBoard: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	let revealedSquares: number[] = []; // indexes of the revealed squares
	let winningAmount = 0; // the amount of "money" that the player will win
	let willWin = false; // whether the player has won the current round or not (note: this is pre-determined, not based on the revealed squares)
	let hasWon: boolean | null = null;
	$: if (hasWon !== undefined) {
		reloadKey = {};
		resetMatter();
	}

	let shouldBeRevealed = false;

	let boxes: Array<HTMLElement>;

	async function reset() {
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.globalCompositeOperation = "source-over";
		ctx.fillStyle = "#0d1117";
		ctx.lineWidth = 40;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		gameBoard = [0, 0, 0, 0, 0, 0, 0, 0, 0];
		willWin = false;
		hasWon = null;
		winningAmount = 0;
		shouldBeRevealed = false;
		revealedSquares = [];

		await fillValues();

		// for each value in board, add the background to the corresponding box (for example if board[0] is 1, add bepo to the first box)

		boxes = Array.from(document.getElementsByClassName("box") as HTMLCollectionOf<HTMLElement>);
		boxes.forEach((box, i) => {
			box.style.backgroundSize = "contain";
			box.style.backgroundImage = `url(/images/${winningValues[gameBoard[i]]}.png)`;
		});
		resetMatter();
	}

	let engine: Matter.Engine;
	let world: Matter.World;
	onMount(async () => {
		brushImg = new Image();
		brushImg.src = "/brush.png";

		await reset();
	});

	let matter_interval: any;
	function resetMatter() {
		if (matter_interval) {
			clearInterval(matter_interval);
		}
		// Setup matter.js
		engine = Matter.Engine.create();
		world = engine.world;
		let runner = Matter.Runner.create();
		Matter.Runner.run(runner, engine);
		world = engine.world;
		world.gravity.y = 0;
		world.gravity.x = 0;
		removeAllBodies();

		let frame = 0;
		matter_interval = setInterval(() => {
			frame++;
			if (canvas == null) return;
			if (!$all_loaded) return;

			// rain
			world.gravity.y = 0.5;
			world.gravity.x = world.gravity.x = Math.sin(Date.now() * 0.001) * 0.02;
			// spawn new bodies
			if (hasWon) {
				for (let i = 0; i < 1; i += 1) {
					if (frame % 1 !== 0) continue;
					let body = Matter.Bodies.circle(
						Matter.Common.random(screen_width / 2 - 100, screen_width / 2 + 100),
						-500,
						Matter.Common.random(4, 8),
						{
							plugin: {
								won: true
							},
							friction: 0,
							restitution: 0.5
						}
					);

					Matter.World.add(world, body);
				}
			} else {
				let to_remove = world.bodies.shift();
				if (to_remove) {
					Matter.World.remove(world, to_remove);
				}
			}

			Matter.Engine.update(engine, 1000 / 60);
			if (!$fcanvas) {
				throw new Error("Canvas not found");
			}
			let context = $fcanvas.getContext("2d");
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
				if (body.plugin.won) {
					context.fillStyle = "#ffb91d99";
				} else {
					context.fillStyle = "#0002";
				}
				// fill the circle
				context.beginPath();
				context.arc(body.position.x, body.position.y, body.circleRadius, 0, 2 * Math.PI);
				context.fill();
				context.closePath();
			}
		}, 1000 / 60);
	}

	function mousedown(e: MouseEvent) {
		isMouseDown = true;
		lastPoint = { x: e.offsetX, y: e.offsetY };
	}

	function mousemove(e: MouseEvent) {
		if (shouldBeRevealed) return;
		const amntRevealedBefore = amountRevealed();

		// check if the whole canvas is revealed enough
		// if (amountRevealed() > revealThreshold) {
		// 	shouldBeRevealed = true;
		// 	return;
		// }

		boxes.forEach((box) => {
			// check if the area of the box is revealed
			const boxX = box.offsetLeft;
			const boxY = box.offsetTop;
			const boxWidth = box.offsetWidth;
			const boxHeight = box.offsetHeight;
			const amount = amountRevealed(boxX, boxY, boxWidth, boxHeight);
			if (amount > revealThreshold && !revealedSquares.includes(boxes.indexOf(box))) {
				// workaround for svelte not updating the array in the DOM
				let newRevealedSquares = [...revealedSquares]; // create a copy
				newRevealedSquares.push(boxes.indexOf(box)); // modify the copy
				revealedSquares = newRevealedSquares; // reassign
				// box.style.opacity = "0";
				console.log(revealedSquares);
			}
		});

		if (revealedSquares.length === 9) {
			shouldBeRevealed = true;
			hasWon = willWin;
			return;
		}

		//check if revealed squares match the winning combination
		if (revealedSquares.length >= 3 && willWin) {
			const winningCombination = [winningAmount, winningAmount, winningAmount];
			const revealedSquaresCopy = [...revealedSquares];
			revealedSquaresCopy.forEach((value) => {
				if (winningCombination.includes(parseInt(boxes[value].textContent))) {
					winningCombination.splice(winningCombination.indexOf(value), 1);
				}
			});
			if (winningCombination.length === 0) {
				shouldBeRevealed = true;
				hasWon = true;
				return;
			}
		}

		const ctx = canvas.getContext("2d");
		if (!ctx || !brushImg || !isMouseDown) return;
		ctx.globalCompositeOperation = "destination-out";

		const currentPoint = { x: e.offsetX, y: e.offsetY };

		lastPoint = lastPoint || currentPoint;

		// Interpolate points on the line from lastPoint to currentPoint
		const distance = Math.sqrt(
			Math.pow(currentPoint.x - lastPoint.x, 2) + Math.pow(currentPoint.y - lastPoint.y, 2)
		);
		const stepSize = 25;
		const stepCount = Math.floor(distance / stepSize);
		for (let step = 0; step <= stepCount; step++) {
			const interpolatedPoint = {
				x: lastPoint.x + (currentPoint.x - lastPoint.x) * (step / stepCount),
				y: lastPoint.y + (currentPoint.y - lastPoint.y) * (step / stepCount)
			};
			ctx.drawImage(
				brushImg,
				interpolatedPoint.x - brushWidth / 2,
				interpolatedPoint.y - brushHeight / 2,
				brushWidth,
				brushHeight
			);
		}

		// Draw at the current point
		ctx.drawImage(
			brushImg,
			currentPoint.x - brushWidth / 2,
			currentPoint.y - brushHeight / 2,
			brushWidth,
			brushHeight
		);

		const amntRevealedNow = amountRevealed();
		let velocity = Matter.Vector.create(currentPoint.x - lastPoint.x, currentPoint.y - lastPoint.y);
		if ((velocity.x > 5 || velocity.y > 5) && amntRevealedNow > amntRevealedBefore) {
			// add particles
			let actualX = e.clientX;
			let actualY = e.clientY + window.scrollY;
			for (let i = 0; i < 5; i += 1) {
				let velx = Math.random() * 100 - 50;
				let vely = Math.random() * 100 - 50;
				let body = Matter.Bodies.circle(actualX + velx, actualY + vely, 3, {
					plugin: {},
					friction: 0.9,
					restitution: 1.0,

					velocity: Matter.Vector.create(velx, vely)
				});

				Matter.World.add(world, body);
			}
		}
		lastPoint = currentPoint;
	}

	function mouseup() {
		isMouseDown = false;
		lastPoint = null;
	}

	function amountRevealed(
		x: number = 0,
		y: number = 0,
		width: number = canvas.width,
		height: number = canvas.height
	) {
		const ctx = canvas.getContext("2d");
		if (!ctx) return 0;
		const imageData = ctx.getImageData(x, y, width, height);
		const data = imageData.data;
		const totalPixels = data.length / 4;
		let count = 0;
		for (let i = 0; i < data.length; i += 4) {
			if (data[i + 3] === 0) {
				count++;
			}
		}
		return count / totalPixels;
	}

	async function fillValues() {
		try {
			const { isWin, board, wonAmount } = await fetch("/scratch", {
				method: "POST",
				body: JSON.stringify({
					width: gridWidth,
					height: gridHeight,
					winningChance: winningChance / 100
				})
			}).then((res) => res.json());

			gameBoard = board;
			winningAmount = wonAmount;
			willWin = isWin;
		} catch (e) {
			console.error(e);
		}
	}

	let screen_width: number;
	let screen_height: number;
	let bounding_boxes: Writable<Map<number, DOMRect>>;
	let all_loaded: Writable<boolean>;
	let to_draw: Writable<FontLoadResponse[]>;
	let fcanvas: Writable<HTMLCanvasElement | null>;
	function removeAllBodies() {
		for (let body of world.bodies) {
			Matter.World.remove(world, body);
		}

		if (hasWon) {
			// add a collisionbox around the canvas
			const ticket = document.querySelector(".scratch-container");
			if (!ticket) {
				throw new Error("Ticket not found");
			}
			const bounding_box = ticket.getBoundingClientRect();
			const collisionBox = Matter.Bodies.rectangle(
				bounding_box.x + bounding_box.width / 2,
				bounding_box.y + bounding_box.height / 2,
				bounding_box.width,
				bounding_box.height,
				{
					isStatic: true,
					friction: 0,
					restitution: 0.5
				}
			);
			Matter.World.add(world, collisionBox);
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

	const gridSize = 150;
	let reloadKey = {};
</script>

<!-- fonts -->
<Boxed />
<Roboto />

<!-- game -->
<div class="container">
	<h1 class="logo with-particles">
		{#if hasWon === true}
			You won!
		{:else if hasWon === false}
			You lost!
		{:else}
			Scratch to win!
		{/if}
	</h1>
	<div class="scratch-container">
		<div
			class="game-board"
			style="
				grid-template-rows: {`${gridSize}px `.repeat(gridHeight)};
				grid-template-columns: {`${gridSize}px `.repeat(gridWidth)};
				"
		>
			{#each gameBoard as value}
				<div class="box">
					<p>{value}</p>
				</div>
			{/each}
		</div>
		<canvas
			class="game-canvas"
			bind:this={canvas}
			on:mousedown={mousedown}
			on:mousemove={mousemove}
			on:mouseup={mouseup}
			width={gridSize * gridWidth}
			height={gridSize * gridHeight}
			class:zero-opacity={shouldBeRevealed}
		/>
	</div>

	<div class="bottom-container">
		<div>
			<label for="winningChance" class="with-particles roboto">Winning chance: (%)</label>
			<input type="number" min="0" max="100" step="1" bind:value={winningChance} />
			<button on:click={reset}>Fill values</button>
		</div>
		<div>
			<h3 class="with-particles roboto">How to play</h3>
			<p class="with-particles roboto">
				Reveal the squares by scratching them with your mouse. If you get three of the same symbol,
				you win!
			</p>
			<p>
				You can change the winning chance by changing the value in the input field above. The
				default value is 30%.
			</p>
			<h4>Icons explained</h4>
			<ul class="icons">
				{#each Object.keys(winningValues) as value}
					<li>
						<img
							src={`/images/${winningValues[value]}.png`}
							alt={winningValues[value]}
							width={gridSize / gridWidth}
							height={gridSize / gridHeight}
						/>
						<p>€{value}</p>
					</li>
				{/each}
			</ul>
		</div>

		<div>
			<h3>Current game info</h3>
			<p>€ won (if will win): {winningAmount}</p>
			<p>Will win: {willWin ? "Yes" : "No"}</p>
			<!-- <p>Amount revealed: {amountRevealed()}</p> -->
			<p>Board: {JSON.stringify(gameBoard)}</p>
			<p>Revealed squares: {JSON.stringify(revealedSquares)}</p>
		</div>
	</div>
	<!-- a canvas for special effects upon winning -->
	<canvas
		class="effect-canvas"
		width="100%"
		height="100%"
		style="opacity: {shouldBeRevealed ? 1 : 0}"
	/>
	<div bind:clientHeight={screen_height} bind:clientWidth={screen_width} id="size" />
	<FontLoader
		{screen_height}
		{screen_width}
		font_sources={[
			{ cssName: "Boxed", url: "/BoxedRegular.ttf" },
			{ cssName: "Roboto", url: "/Roboto-Regular.ttf" }
		]}
		{removeAllBodies}
		{addCircle}
		bind:bounding_boxes
		bind:to_draw
		bind:all_loaded
		bind:canvas={fcanvas}
		bind:reloadKey
	/>
</div>

<style>
	:root {
		--z-index-canvas: 101;
	}
	canvas {
		z-index: 100;
	}

	.game-canvas {
		border: 1px solid #0d1117;
		position: relative;
		opacity: 1;
		transition: opacity 0.5s;
	}

	.zero-opacity {
		opacity: 0 !important;
	}

	.icons {
		display: flex;
		flex-wrap: wrap;
		list-style: none;
	}

	.roboto {
		font-family: "Roboto";
	}

	/* .scratch-container {
		position: relative;
	} */

	.scratch-container,
	.game-board,
	.game-canvas {
		border-radius: 1rem;
		overflow: hidden;
	}

	.game-board {
		outline: 1px solid black;
	}

	.logo {
		font-family: "Boxed";
		font-size: 5em;
		margin-block: 1em;
		position: relative;
		z-index: 200;
	}

	.container {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
	}

	.game-board {
		position: absolute;
		display: grid;
	}

	.box {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.box > p {
		opacity: 0;
	}

	#size {
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
	}
</style>
