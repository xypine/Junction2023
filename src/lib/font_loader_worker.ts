import { convert } from "textToSurface";
import { x_scale, type measureText } from "./metrics";

console.log("Worker loaded");

export type FontLoadRequest = {
	type: "font_load_request";
	id: number;
	paths_properties: ReturnType<typeof measureText>;
	paths_str: string[];
	text: string;
	iteration: number;
	bounding_box: DOMRect;
};

export type FontLoadResponse = {
	type: "font_load_response";
	id: number;
	vertices: { x: number; y: number }[];
	lines: { is_closed: boolean; points: { x: number; y: number }[] }[];
	svgBoundingBox: { height: number; width: number; x: number; y: number };
	svgOrigin: { x: number; y: number };
	x_scale: number;
	iteration: number;
};

self.onmessage = async (e: MessageEvent<FontLoadRequest>) => {
	console.log("Worker got message", e.data);
	console.log("Loading wasm...");

	if (e.data.type === "font_load_request") {
		await part1(e.data);
	}
};

async function part1(data: FontLoadRequest) {
	if (data.type !== "font_load_request") {
		throw new Error("Unexpected message type");
	}

	const paths_properties = data.paths_properties;
	const paths_str = data.paths_str;

	const svgBoundingBox = {
		height: paths_properties.fontBoundingBoxDescent - paths_properties.fontBoundingBoxAscent,
		width: paths_properties.width,
		x: 0,
		y: -paths_properties.fontBoundingBoxDescent
	};

	const svgOrigin = {
		x: svgBoundingBox.x,
		y: svgBoundingBox.y + svgBoundingBox.height
	};

	const results = paths_str.map((path_str) => {
		const result = convert(path_str);

		const vertices = result.lines
			.map((line) => {
				const v = line.points.map((point) => {
					return { x: point.x * x_scale, y: point.y - svgOrigin.y };
				});
				// add interpolated points
				let interpolated: { x: number; y: number }[] = [];
				let last = null;
				for (const vertex of v) {
					if (last) {
						const n = interpVectors(vertex, last, data.bounding_box, 5, 10);
						interpolated = [...interpolated, ...n];
						if (n.length > 0) last = n[n.length - 1];
					} else {
						last = vertex;
						interpolated = [vertex];
					}
				}
				// return all
				return interpolated;
			})
			.flat();
		const lines = result.lines.map((line) => {
			return {
				is_closed: line.is_closed,
				points: line.points.map((point) => {
					return { x: point.x * x_scale, y: point.y };
				})
			};
		});
		return {
			vertices,
			lines
		};
	});
	console.log("Result", results);

	const resp: FontLoadResponse = {
		type: "font_load_response",
		id: data.id,
		vertices: results.map((r) => r.vertices).flat(),
		lines: results.map((r) => r.lines).flat(),
		svgBoundingBox,
		svgOrigin,
		x_scale: x_scale,
		iteration: data.iteration
	};
	self.postMessage(resp);
}

function interpVectors(
	vertex: { x: number; y: number },
	last: { x: number; y: number },
	boundingBox: DOMRect,
	min_dist = 10,
	max_dist = 20,
	recursion_counter = 0
): { x: number; y: number }[] {
	if (recursion_counter > 1) return [];
	const dist = Math.sqrt(Math.pow(vertex.x - last.x, 2) + Math.pow(vertex.y - last.y, 2));
	if (dist < min_dist) return [];
	if (dist > max_dist) {
		// add a circle to the middle
		const new_x = (vertex.x + last.x) / 2;
		const new_y = (vertex.y + last.y) / 2;
		return [
			...interpVectors(
				{ x: last.x, y: last.y },
				{ x: new_x, y: new_y },
				boundingBox,
				min_dist,
				max_dist,
				recursion_counter + 1
			),
			{
				x: new_x,
				y: new_y
			},
			...interpVectors(
				{ x: vertex.x, y: vertex.y },
				{ x: new_x, y: new_y },
				boundingBox,
				min_dist,
				max_dist,
				recursion_counter + 1
			),
			vertex
		];
	}
	return [vertex];
}
