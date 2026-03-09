## 1. Update Manifest Schema

- [x] 1.1 Update `src/manifest.js` to add `name` field to each entry (value = stem key)
- [x] 1.2 Replace `srcset` object and `sizes` string with `widths` array (sorted ascending) and `formats` array (strings only, e.g. `["avif","webp","jpeg"]`)
- [x] 1.3 Remove `src` and verbose `formats` array of objects from manifest output
- [x] 1.4 Update `src/report.js` snippet templates to reference new lean schema fields
- [x] 1.5 Regenerate `output/` with `node bin/sharpey.js ./input` and verify `sharpey-manifest.json` has new shape

## 2. Vite Demo App Setup

- [x] 2.1 Create `examples/package.json` with deps: `vue`, `vite`, `@vitejs/plugin-vue`, `blurhash`
- [x] 2.2 Create `examples/vite.config.js` with `publicDir: '../output'` and vue plugin
- [x] 2.3 Create `examples/index.html` with `<div id="app">` and script module entry
- [x] 2.4 Create `examples/src/main.js` mounting the App
- [x] 2.5 Create `examples/.env` with `VITE_SHARPEY_BASE_PATH=` (empty = root served by Vite)
- [x] 2.6 Run `npm install` in `examples/` and verify `npm run dev` starts without errors
- [ ] 2.7 Verify `http://localhost:5173/sharpey-manifest.json` returns the lean manifest

## 3. ImgLazy Component — Core Structure

- [x] 3.1 Create `examples/src/components/ImgLazy.vue` with `<template>`, `<script setup>`, `<style scoped>`
- [x] 3.2 Define all props: `image` (required Object), `alt`, `placeholder`, `loading`, `sizes`, `autoSizes`
- [x] 3.3 Add prop validators for `placeholder` (`lqip|blurhash|none`) and `loading` (`eager|lazy`)
- [x] 3.4 Implement `basePath` constant from `import.meta.env.VITE_SHARPEY_BASE_PATH ?? ''`
- [x] 3.5 Implement `EXT_MAP` constant: `{ avif: '.avif', webp: '.webp', jpeg: '.jpg' }`
- [x] 3.6 Implement `modernFormats` computed: `image.formats.slice(0, -1)` with `{format, mime}` shape
- [x] 3.7 Implement `fallbackFormat` computed: `image.formats.at(-1)`
- [x] 3.8 Implement `srcsetFor(format)` helper that builds `"name-320.ext 320w, ..."` string
- [x] 3.9 Implement `wrapperStyle` computed: `{ aspectRatio: '${image.width} / ${image.height}' }`
- [x] 3.10 Render wrapper div, `<picture>` with `v-for` sources, and `<img>` fallback with all required attributes (`width`, `height`, `loading`, `decoding="async"`, `fetchpriority` when eager)

## 4. ImgLazy Component — Sizes Auto-Measurement

- [x] 4.1 Add `imgRef`, `measuredSizes` (ref), `loaded` (ref) reactive state
- [x] 4.2 Implement `resolvedSizes` computed: `props.sizes ?? measuredSizes.value ?? undefined`
- [x] 4.3 Implement `measureSizes()` function: reads `imgRef.value?.offsetWidth`, sets `measuredSizes.value = "${w}px"`
- [x] 4.4 Call `measureSizes()` in `onMounted` after `await nextTick()`
- [x] 4.5 Add DEV warning in `onMounted`: when `loading==="eager"` and no explicit `sizes` prop, emit `console.warn` with image name and measured value
- [x] 4.6 Implement `autoSizes` prop behavior: when `true`, attach `ResizeObserver` on `imgRef` calling `measureSizes()` on resize; disconnect in `onUnmounted`

## 5. ImgLazy Component — Placeholders

- [x] 5.1 Add LQIP `div` (`v-if="placeholder==='lqip' && image.lqip"`) with `background-image` style and `aria-hidden="true"`
- [x] 5.2 Add BlurHash `<canvas>` (`v-if="placeholder==='blurhash' && image.blurhash"`) with `ref="canvasRef"` and `aria-hidden="true"`
- [x] 5.3 Extract BlurHash decode algorithm from `src/catalog.js:170-207` and adapt as `decodeBlurhash(canvas, hash, ow, oh)` function in `<script setup>`
- [x] 5.4 Call `decodeBlurhash` in `onMounted` when `placeholder==='blurhash'`
- [x] 5.5 Add `@load="loaded = true"` on `<img>` to trigger cross-fade

## 6. ImgLazy Component — CSS

- [x] 6.1 Add `.si-wrapper` styles: `display: block; position: relative; overflow: hidden`
- [x] 6.2 Add `.si-placeholder` styles: `position: absolute; inset: 0; width: 100%; height: 100%; opacity: 1; transition: opacity 400ms ease`
- [x] 6.3 Add `.si-placeholder--lqip` styles: `background-size: cover; background-position: center`
- [x] 6.4 Add `.si-placeholder--canvas` styles: `width: 100%; height: 100%; object-fit: cover`
- [x] 6.5 Add `.si-placeholder--hidden` styles: `opacity: 0; pointer-events: none`
- [x] 6.6 Add `.si-img` styles: `display: block; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 400ms ease`
- [x] 6.7 Add `.si-img--loaded` styles: `opacity: 1`

## 7. Demo App — Three Test Scenarios

- [x] 7.1 Create `examples/src/App.vue` importing manifest and `ImgLazy`
- [x] 7.2 Implement **Hero LCP scenario**: `loading="eager"` `placeholder="lqip"` full-width image (no explicit `:sizes` — verify DEV warning fires)
- [x] 7.3 Implement **Grid 3-column scenario**: `loading="lazy"` `placeholder="blurhash"` three images in CSS grid — verify auto-sizes measures ~33% of viewport
- [x] 7.4 Implement **Manual override scenario**: `loading="lazy"` `:sizes="'50vw'"` — verify measured sizes is ignored
- [x] 7.5 Add basic grid CSS and layout styles to App.vue

## 8. Verification

- [x] 8.1 DevTools Elements: hero has `fetchpriority="high" loading="eager"` and grid items have `loading="lazy"`
- [x] 8.2 DevTools Elements: grid items have `sizes="Xpx"` set to ~33vw after mount
- [x] 8.3 DevTools Network: grid images load a smaller width variant than the hero
- [x] 8.4 DevTools Performance: CLS = 0 (no layout shift during load)
- [x] 8.5 DevTools Network (throttled): LQIP background visible before real image in hero scenario
- [x] 8.6 DevTools Console (dev): warning appears for hero with suggested `:sizes` value
- [x] 8.7 BlurHash canvas visible and blurry before grid images load on throttled connection
