use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(tsify::Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(tsify::Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Line {
    pub is_closed: bool,
    pub points: Vec<Point>,
}

#[derive(tsify::Tsify)]
#[tsify(into_wasm_abi, from_wasm_abi)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LineCollection {
    pub lines: Vec<Line>,
}

#[wasm_bindgen]
pub fn convert(path: String) -> LineCollection {
    let result = svg_path_parser::parse(&path).collect::<Vec<(bool, Vec<(f64, f64)>)>>();
    let lines = result
        .iter()
        .map(|(is_closed, points)| Line {
            is_closed: *is_closed,
            points: points.iter().map(|(x, y)| Point { x: *x, y: *y }).collect(),
        })
        .collect();
    LineCollection { lines }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = convert(include_str!("testdata.txt").to_string());
        assert_ne!(result.len(), 0);
    }
}
