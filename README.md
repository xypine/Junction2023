# VeikkAS

A proof of concept for the Veikkaus "Next Level of Interactive Gaming Experiences" WebGPU/WebWorker challenge for Junction 2023. Built with Typescript, Sveltekit and Rust and using BabylonJS for WebGPU rendering.

Features include but are not limited to:

- [x] Transforming DOM text into physics objects with a WebWorker
- [x] Physics simulation with Matter.js
- [x] Rendering with WebGPU
- [x] Thrilling and innovative gameplay with a scratch off game that's handled in the backend (awesome graphics included !!)

Future plans:

- [ ] Move *all* rendering to the GPU
- [ ] Utilize WebGPU compute shaders for physics simulation
- [ ] Cooler effects like attractors and boids that can react to whatever is happening in the DOM
- [ ] Ditch external renderer (BabylonJS) and write a custom one
- [ ] Font deformation utilizing the physics engine
- [ ] More indepth gameplay
- [x] ~~More awesome graphics~~ (update: no need for this, the current graphics can't be beat 😎)

## Building and running

```bash
# Install dependencies
pnpm install

# Build & start the devserver
pnpm run dev
```

The libraries used can be found in `package.json` and `textToSurface/Cargo.toml.`
