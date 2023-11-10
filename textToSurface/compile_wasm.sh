#!/bin/sh

set -ex

# Compile our wasm module and run `wasm-bindgen`
wasm-pack build --release --features wasm

rm -rf ./pkg/.gitignore

# Run patch_wasm.js to patch the wasm file
node patch_wasm.js