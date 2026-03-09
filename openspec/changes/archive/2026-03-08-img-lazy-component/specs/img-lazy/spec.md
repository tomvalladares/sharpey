## ADDED Requirements

### Requirement: Render responsive picture element from manifest entry
The component SHALL accept a manifest entry object as the `image` prop and render a `<picture>` element with one `<source>` per modern format (all formats except the last) and an `<img>` fallback using the last format. Srcset paths SHALL be reconstructed as `${basePath}${image.name}-${width}.${ext} ${width}w` for each width in `image.widths`.

#### Scenario: Renders sources in manifest format order
- **WHEN** `image.formats` is `["avif", "webp", "jpeg"]`
- **THEN** component renders `<source type="image/avif">`, `<source type="image/webp">`, and `<img>` with jpeg srcset, in that order

#### Scenario: Skips missing formats gracefully
- **WHEN** a format has no widths (empty srcset would result)
- **THEN** no `<source>` element is rendered for that format

#### Scenario: Applies base path to all image URLs
- **WHEN** `VITE_SHARPEY_BASE_PATH` is set to `/assets/images/`
- **THEN** all srcset entries are prefixed: `/assets/images/hero-320.avif 320w, ...`

---

### Requirement: Prevent Cumulative Layout Shift (CLS)
The component SHALL render a wrapper `div` with `aspect-ratio` computed from `image.width / image.height`, and the `<img>` SHALL always carry `width` and `height` attributes matching the original image dimensions.

#### Scenario: Wrapper reserves space before image loads
- **WHEN** component mounts with `image.width=2400` and `image.height=1600`
- **THEN** wrapper has `style="aspect-ratio: 2400 / 1600"` and `<img width="2400" height="1600">`

---

### Requirement: Auto-measure sizes via offsetWidth
The component SHALL, after mount and nextTick, read `imgRef.offsetWidth` and use it as the `sizes` attribute value (`"${w}px"`). An explicit `:sizes` prop SHALL take priority over the measured value.

#### Scenario: Auto-sizes applied for lazy image
- **WHEN** `loading="lazy"` and no `:sizes` prop is passed
- **THEN** after mount, `sizes` attribute on all sources and img equals `"${offsetWidth}px"`

#### Scenario: Explicit sizes prop overrides measurement
- **WHEN** `:sizes="'50vw'"` is passed
- **THEN** `sizes="50vw"` is used and no measurement occurs

#### Scenario: SSR renders without measurement
- **WHEN** component is server-rendered (onMounted does not run)
- **THEN** no `sizes` attribute is set (browser uses srcset widths as fallback)

---

### Requirement: LCP optimization for eager images
When `loading="eager"`, the component SHALL automatically add `fetchpriority="high"` to the `<img>` element. In development mode, if no explicit `:sizes` prop is provided, the component SHALL emit a `console.warn` after measurement with the suggested sizes value.

#### Scenario: fetchpriority applied on eager
- **WHEN** `loading="eager"`
- **THEN** `<img fetchpriority="high" loading="eager">` is rendered

#### Scenario: DEV warning for eager without explicit sizes
- **WHEN** `loading="eager"`, no `:sizes` prop, running in dev mode (`import.meta.env.DEV`)
- **THEN** `console.warn` is emitted: `[ImgLazy] "${image.name}": loading=eager without explicit :sizes. Measured ${w}px — add :sizes="${w}px" for optimal LCP.`

#### Scenario: No warning when sizes provided
- **WHEN** `loading="eager"` and `:sizes="'640px'"` is provided
- **THEN** no console warning is emitted

---

### Requirement: LQIP placeholder via background-image
When `placeholder="lqip"` and `image.lqip` is present, the component SHALL render a `div` with `background-image: url(${image.lqip})` and `background-size: cover` positioned absolutely over the wrapper. The placeholder SHALL fade to `opacity: 0` when the real image fires its `load` event.

#### Scenario: LQIP visible before image loads
- **WHEN** `placeholder="lqip"` and image is still loading
- **THEN** LQIP div is visible (`opacity: 1`) and real `<img>` is transparent (`opacity: 0`)

#### Scenario: Cross-fade on image load
- **WHEN** real image fires `load` event
- **THEN** LQIP div transitions to `opacity: 0` and `<img>` transitions to `opacity: 1` simultaneously via CSS transition

#### Scenario: LQIP not rendered when image.lqip is null
- **WHEN** `image.lqip` is `null`
- **THEN** no LQIP div is rendered regardless of `placeholder` prop

---

### Requirement: BlurHash canvas placeholder
When `placeholder="blurhash"` and `image.blurhash` is present, the component SHALL render a `<canvas>` element and decode the BlurHash into it on `onMounted`. The canvas SHALL be sized to a maximum of 64px width (maintaining aspect ratio) and SHALL fade out on image load, identically to the LQIP placeholder.

#### Scenario: BlurHash decoded on mount
- **WHEN** `placeholder="blurhash"` and `image.blurhash` is a valid hash
- **THEN** canvas is visible and filled with the decoded blurry preview before the real image loads

#### Scenario: BlurHash not rendered without hash
- **WHEN** `image.blurhash` is `null`
- **THEN** no canvas element is rendered

---

### Requirement: Props API
The component SHALL expose the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `image` | Object | required | Lean manifest entry (`name`, `width`, `height`, `lqip`, `blurhash`, `widths`, `formats`) |
| `alt` | String | `''` | Alt text for the `<img>` |
| `placeholder` | String | `'lqip'` | `'lqip'`, `'blurhash'`, or `'none'` |
| `loading` | String | `'lazy'` | `'lazy'` or `'eager'` |
| `sizes` | String | `null` | Override auto-measured sizes |
| `autoSizes` | Boolean | `false` | Opt-in ResizeObserver to update sizes on container resize |

#### Scenario: All props have valid defaults
- **WHEN** component is used with only required `image` prop
- **THEN** renders with `loading="lazy"`, LQIP placeholder, `decoding="async"`, no fetchpriority

#### Scenario: Invalid placeholder value rejected
- **WHEN** `placeholder="invalid"` is passed
- **THEN** Vue prop validator emits a warning and falls back to default behavior
