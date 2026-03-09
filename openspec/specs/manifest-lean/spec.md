## ADDED Requirements

### Requirement: Lean manifest schema
The sharpey manifest (`sharpey-manifest.json`) SHALL emit one entry per processed image with the following fields only. Pre-computed `srcset` strings, `sizes` strings, and the verbose `formats` array of objects SHALL be removed.

```json
{
  "hero": {
    "name": "hero",
    "width": 2400,
    "height": 1600,
    "lqip": "data:image/webp;base64,...",
    "blurhash": "LEHV6nWB2yk8...",
    "widths": [320, 640, 1024, 1920],
    "formats": ["avif", "webp", "jpeg"]
  }
}
```

Fields:
- `name`: stem of the source filename (same as manifest key) — required for component path reconstruction
- `width` / `height`: original image dimensions in pixels
- `lqip`: base64 DataURI of the LQIP placeholder (WebP, max 16px), or `null` if generation failed
- `blurhash`: BlurHash string, or `null` if generation failed
- `widths`: sorted ascending array of generated widths (skips widths larger than source)
- `formats`: ordered array of output format identifiers; order defines `<source>` priority in `<picture>` (first = highest priority)

#### Scenario: name field matches manifest key
- **WHEN** source image is `hero.jpg`
- **THEN** manifest contains `{ "hero": { "name": "hero", ... } }`

#### Scenario: widths excludes upscaled sizes
- **WHEN** source image is 800px wide and config sizes are [320, 640, 1024, 1920]
- **THEN** `widths` is `[320, 640, 800]` — 1024 and 1920 are omitted, 800 (original) added

#### Scenario: formats preserves config order
- **WHEN** sharpey is run with `--formats avif,webp,jpeg`
- **THEN** `formats` is `["avif", "webp", "jpeg"]`

---

### Requirement: File extension mapping
The manifest `formats` field SHALL use the canonical format identifier. The component SHALL map identifiers to file extensions using: `avif → .avif`, `webp → .webp`, `jpeg → .jpg`.

#### Scenario: jpeg maps to .jpg extension
- **WHEN** format identifier is `"jpeg"`
- **THEN** reconstructed filename uses `.jpg` extension (e.g., `hero-640.jpg`)

#### Scenario: avif and webp map to own extension
- **WHEN** format identifiers are `"avif"` and `"webp"`
- **THEN** reconstructed filenames use `.avif` and `.webp` respectively
