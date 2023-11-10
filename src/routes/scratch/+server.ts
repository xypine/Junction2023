import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	function shuffle(array: Array<number>) {
		let currentIndex = array.length,
			randomIndex;

		while (currentIndex > 0) {
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
		}

		return array;
	}

	const { winningChance, width, height } = await request.json();

	const isWin = Math.random() < winningChance;

	const possibleValues = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
	// usedValues, array of the same size as possibleValues, with each value being zero
	// usedValues[i] is the number of times possibleValues[i] has been used
	// usedValues[i] is at most 2
	const usedValues = Array.from({ length: possibleValues.length }, () => 0);

	const wonAmount = possibleValues[Math.floor(Math.random() * possibleValues.length)];

	possibleValues.splice(possibleValues.indexOf(wonAmount), 1);

	// if the board has 3 of the same value anywhere, it's a win
	// create a width x height board of random values from possibleValues
	// also make sure that every non-winning value is on the board at most twice

	const board = Array.from({ length: height * width }, () => {
		const index = Math.floor(Math.random() * possibleValues.length);
		const returnValue = possibleValues[index];
		usedValues[index]++;
		if (usedValues[index] === 2) {
			possibleValues.splice(index, 1);
			usedValues.splice(index, 1);
		}
		return returnValue;
	});

	if (isWin) {
		for (let i = 0; i < 3; i++) {
			board[i] = wonAmount;
		}
		shuffle(board);
	}

	return json({
		isWin,
		board,
		wonAmount
	});
};
