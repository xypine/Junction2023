export const x_scale = 1.035;

import type { Font } from "opentype.js";

export function measureText(text: string, font_data: Font, fontSize: number, x_scale = 1) {
	let ascent = 0;
	let descent = 0;
	let width = 0;
	const scale = (1 / font_data.unitsPerEm) * fontSize;
	const glyphs = font_data.stringToGlyphs(text);

	for (let i = 0; i < glyphs.length; i++) {
		const glyph = glyphs[i];
		if (glyph.advanceWidth) {
			width += glyph.advanceWidth * scale * x_scale;
		}
		if (i < glyphs.length - 1) {
			const kerningValue = font_data.getKerningValue(glyph, glyphs[i + 1]);
			width += kerningValue * scale;
		}
		if (glyph.yMax == null || glyph.yMin == null) {
			continue;
		}
		ascent = Math.max(ascent, glyph.yMax);
		descent = Math.min(descent, glyph.yMin);
	}

	return {
		width: width,
		actualBoundingBoxAscent: ascent * scale,
		actualBoundingBoxDescent: descent * scale,
		fontBoundingBoxAscent: font_data.ascender * scale,
		fontBoundingBoxDescent: font_data.descender * scale
	};
}
