## Context

Sharpey is a Node.js CLI that processes source images into multi-format, multi-size responsive sets and emits a `sharpey-manifest.json`. The manifest currently contains pre-computed `srcset` strings and a generic `sizes` string. Developers are expected to hand-write `<picture>` markup by following the report snippets.

The new `ImgLazy.vue` component closes this loop: it reads the lean manifest entry and produces a fully-optimized `<picture>` element. It lives in `examples/components/` and is designed to be copied into any Vue 3 / Nuxt project.

## Goals / Non-Goals

**Goals:**
- Single SFC, no external dependencies beyond `blurhash` (inline decoder for BlurHash)
- Auto-measure `sizes` at runtime via `offsetWidth` (same approach as unlazy) — no manual `sizes` required for lazy images
- DEV warning with suggested `sizes` value when `loading="eager"` and no explicit `:sizes` prop is passed
- LQIP placeholder via `div` background-image (not `<img>` swap) to avoid CLS
- BlurHash canvas decoder inline in the SFC
- `fetchpriority="high"` auto-applied when `loading="eager"`
- SSR-safe: all measurement inside `onMounted`
- `VITE_SHARPEY_BASE_PATH` env var for image URL prefix

**Non-Goals:**
- Not a published npm package (copy-paste SFC)
- No ResizeObserver in production by default (opt-in prop)
- No Vite build-time sizes injection (runtime offsetWidth is sufficient)
- No TypeScript (keep SFC self-contained and readable)

## Decisions

### 1. Lean manifest schema over verbose pre-computed strings

**Decision**: Remove `srcset` strings and `sizes` string from manifest. Store `name`, `widths[]`, `formats[]` instead. Component reconstructs srcset paths.

**Rationale**: srcset strings are 100% derivable from `name + widths + formats`. Storing them is redundant data that grows with every added format/size. The component reconstruction is trivial (`widths.map(w => \`${basePath}${name}-${w}.ext ${w}w\`).join(', ')`).

**Alternative considered**: Keep verbose manifest for dumb component. Rejected because manifest size grows quadratically with formats × sizes, and any path prefix change requires regenerating the manifest.

---

### 2. LQIP as `div` background, not `<img>` src swap

**Decision**: Render LQIP as `background-image` on wrapper div. Real `<img>` starts transparent, fades in on `@load`.

**Rationale**: The `<img>` must always carry the real `width`/`height` attributes (from manifest) so the browser can compute aspect-ratio before load and reserve space (prevents CLS). Setting `src` to the LQIP DataURI and swapping to real src after load loses the width/height guarantee and breaks the browser's preload scanner.

**Alternative considered**: `<img src="lqip" data-src="real">` swap pattern. Rejected: preloader cannot see final srcset at parse time, causing suboptimal resource scheduling for eager/LCP images.

---

### 3. Auto-sizes via `offsetWidth` in `onMounted` (runtime, not build-time)

**Decision**: After mount + nextTick, read `imgRef.value.offsetWidth` and set `measuredSizes`. For eager images in DEV, emit a console warning with the measured value suggesting the dev add an explicit `:sizes` prop.

**Rationale**: This is the same approach unlazy uses. It's SSR-safe (guard: `if (!imgRef.value) return`), works for all lazy images (which haven't loaded yet when measurement runs), and requires zero build tooling. For eager/LCP images, the warning teaches the developer to bake in the correct value.

**Priority**: `sizes prop > measuredSizes > undefined` (browser uses srcset widths as fallback).

**Alternative considered**: Vite plugin for build-time sizes injection. Rejected: requires server-side layout computation which is impractical for a general-purpose SFC; adds tooling complexity.

---

### 4. `modernFormats` derived from manifest `formats` array

**Decision**: `modernFormats = formats.slice(0, -1)` (all except last). Last format is the `<img>` fallback. Order in manifest determines `<source>` priority (avif first, webp second).

**Rationale**: The manifest `formats` array is already ordered by preference. Slicing cleanly separates sources from fallback without hardcoding format names in the component.

---

### 5. BlurHash decoder inline in SFC

**Decision**: Copy the BlurHash decode algorithm from `src/catalog.js:170-207` directly into `<script setup>`.

**Rationale**: Keeps the SFC self-contained for copy-paste use. No composable files to track. If the component eventually becomes a package, extraction to a composable is trivial.

---

### 6. `VITE_SHARPEY_BASE_PATH` for image URL prefix

**Decision**: Component reads `import.meta.env.VITE_SHARPEY_BASE_PATH` and prepends it to all reconstructed image filenames. Defaults to `''` if not set.

**Rationale**: Images can be served from CDN, `/public`, `/assets/images`, or any path. The env var is the standard Vite way to inject build-time config without hardcoding paths in the component.

---

## Risks / Trade-offs

- **Eager image first-load sizes**: For `loading="eager"` without explicit `:sizes`, the browser may fetch using full-width heuristics before JS measures `offsetWidth`. The DEV warning mitigates this by training developers to set `:sizes` explicitly on LCP images. → Mitigation: warn in dev, document clearly.

- **BlurHash bundle cost**: Inline BlurHash decoder adds ~2KB to the component. Acceptable for a copy-paste SFC; the developer can remove the BlurHash branch if unused. → Mitigation: `placeholder` prop defaults to `'lqip'`; BlurHash canvas only rendered when explicitly opted in.

- **Manifest schema change**: Removing pre-computed fields from the manifest is a breaking change for anyone using the old verbose schema. Since this is an internal tool with no published API, acceptable. → Mitigation: `src/manifest.js` is the single source of truth; update it and the report snippets together.

## Migration Plan

1. Update `src/manifest.js` to emit lean schema
2. Update `src/report.js` snippet templates to match new schema
3. Regenerate `output/` with `node bin/sharpey.js ./input`
4. Create `examples/` Vite demo app
5. Create `ImgLazy.vue` and verify in demo

No rollback needed — sharpey has no external consumers.

## Open Questions

- None. All decisions made during explore session.
