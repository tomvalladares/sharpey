## Why

Sharpey generates optimized image sets and a manifest JSON, but developers still have to hand-write `<picture>` markup with correct `srcset`, `sizes`, `fetchpriority`, and placeholder logic every time. `ImgLazy` closes that gap: a single copy-paste Vue 3 SFC that consumes the sharpey manifest and renders a Lighthouse-optimal image with zero boilerplate.

## What Changes

- **New `ImgLazy.vue` component** in `examples/components/` — a self-contained Vue 3 SFC for rendering responsive images from the sharpey manifest
- **Lean manifest format** — `sharpey-manifest.json` simplified: pre-computed `srcset` strings and `sizes` removed; replaced with `name`, `widths[]`, and `formats[]` arrays from which the component reconstructs paths at runtime
- **`examples/` Vite demo** — standalone Vite app that serves sharpey output and demonstrates the component in 3 scenarios (hero LCP, lazy grid, manual override)
- Sharpey manifest generator (`src/manifest.js`) updated to emit the new lean schema

## Capabilities

### New Capabilities
- `img-lazy`: Vue 3 component that renders a responsive `<picture>` element from a sharpey manifest entry, with auto-sizes measurement, LQIP/BlurHash placeholder, and loading strategy control
- `manifest-lean`: Simplified manifest schema emitted by sharpey — `name`, `widths`, `formats`, `lqip`, `blurhash`, `width`, `height` — eliminating redundant pre-computed strings

### Modified Capabilities
- none

## Impact

- `src/manifest.js` — output schema changes (non-breaking for the new component; old verbose fields removed)
- `examples/` directory created (new, standalone Vite app)
- No changes to the sharpey CLI interface or processing pipeline
- New dev dependency in `examples/`: `vue`, `vite`, `@vitejs/plugin-vue`, `blurhash`
- Requires `VITE_SHARPEY_BASE_PATH` env var in the demo app to resolve image URLs
