/* tslint:disable */
/* eslint-disable */
/**
* @param {string} path
* @returns {LineCollection}
*/
export function convert(path: string): LineCollection;
export interface Point {
    x: number;
    y: number;
}

export interface Line {
    is_closed: boolean;
    points: Point[];
}

export interface LineCollection {
    lines: Line[];
}

