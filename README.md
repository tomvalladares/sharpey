# Sharpey

Genera sets de imágenes responsivas optimizadas para LCP. Toma imágenes fuente y produce múltiples tamaños y formatos (AVIF, WebP, JPEG), placeholders LQIP y BlurHash, un manifest JSON lean, y un reporte Markdown con snippets listos para copiar.

El output está diseñado para ser consumido por `ImgLazy.vue`, un componente Vue 3 de copy-paste que renderiza `<picture>` nativo con auto-sizes, placeholders y `fetchpriority` automático.

## Instalación

```bash
npm install
```

Requiere Node >= 18.17.0.

### Dependencias

- **[sharp](https://sharp.pixelplumbing.com/)** — resize y encoding (AVIF, WebP, JPEG con mozjpeg)
- **[blurhash](https://blurha.sh/)** — encoding de BlurHash placeholders
- **[commander](https://github.com/tj/commander.js)** — CLI parsing
- **chalk**, **ora**, **p-map** — logging, spinners y concurrencia

## Uso

```bash
node bin/sharpey.js <directorio-de-imágenes>
```

### Ejemplos

```bash
# Defaults: 4 tamaños, 3 formatos, output en ./output
node bin/sharpey.js ./imgs

# Output custom
node bin/sharpey.js ./imgs -o ./dist

# Tamaños custom
node bin/sharpey.js ./imgs --sizes 320,640,1024,1920

# Sin AVIF (más rápido)
node bin/sharpey.js ./imgs -f webp,jpeg

# Todo junto
node bin/sharpey.js ./imgs -o ./dist --sizes 320,768,1440 -f avif,webp,jpeg --quality-avif 60
```

## Opciones

| Flag | Default | Descripción |
|------|---------|-------------|
| `-o, --output <dir>` | `./output` | Directorio de salida |
| `-s, --sizes <anchos>` | `320,640,1024,1920` | Anchos separados por coma |
| `-f, --formats <formatos>` | `avif,webp,jpeg` | Formatos de salida |
| `--quality-avif <n>` | `75` | Calidad AVIF (1-100) |
| `--quality-webp <n>` | `80` | Calidad WebP (1-100) |
| `--quality-jpeg <n>` | `85` | Calidad JPEG (1-100) |
| `--lqip-size <px>` | `16` | Dimensión max del placeholder |
| `--concurrency <n>` | `3` | Imágenes procesadas en paralelo |

## Output

Dado `hero.jpg` (2400x1600) con defaults, genera:

```
output/
├── hero-320.avif
├── hero-320.webp
├── hero-320.jpg
├── hero-640.avif
├── hero-640.webp
├── hero-640.jpg
├── hero-1024.avif
├── hero-1024.webp
├── hero-1024.jpg
├── hero-1920.avif
├── hero-1920.webp
├── hero-1920.jpg
├── sharpey-manifest.json
├── sharpey-report.md
└── sharpey-catalog.html
```

Si la imagen fuente tiene un ancho intermedio (ej. 1080px), se incluye automáticamente como breakpoint adicional para no desperdiciar resolución.

Si la imagen fuente es más chica que un tamaño objetivo, ese tamaño se salta (nunca hace upscale).

## Manifest JSON

`sharpey-manifest.json` contiene un entry por imagen con los datos necesarios para que `ImgLazy.vue` reconstruya los srcsets en runtime:

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

| Campo | Descripción |
|-------|-------------|
| `name` | Stem del archivo fuente — usado por el componente para reconstruir paths |
| `width` / `height` | Dimensiones originales en píxeles |
| `lqip` | DataURI base64 del placeholder LQIP (WebP, máx 16px), o `null` |
| `blurhash` | Hash BlurHash string, o `null` |
| `widths` | Anchos generados, ordenados ascendente (sin upscale) |
| `formats` | Formatos en orden de prioridad — define el orden de `<source>` en `<picture>` |

El componente mapea `jpeg → .jpg`, `avif → .avif`, `webp → .webp` para reconstruir los filenames.

## ImgLazy.vue

`examples/src/components/ImgLazy.vue` es un SFC Vue 3 de copy-paste que consume el manifest y renderiza un `<picture>` nativo optimizado para Lighthouse.

### Setup

1. Copiar `ImgLazy.vue` a tu proyecto
2. Copiar `sharpey-manifest.json` a `src/assets/` (o donde prefieras)
3. Configurar la env var con el path público donde sirves las imágenes:

```env
# .env
VITE_SHARPEY_BASE_PATH=/images/
```

### Uso básico

```vue
<script setup>
import manifest from '@/assets/sharpey-manifest.json'
import ImgLazy from '@/components/ImgLazy.vue'
</script>

<template>
  <!-- Hero LCP: eager + fetchpriority="high" automático -->
  <ImgLazy :image="manifest.hero" loading="eager" alt="Hero" />

  <!-- Imagen lazy: auto-sizes via offsetWidth -->
  <ImgLazy :image="manifest.hero" alt="Hero" />
</template>
```

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `image` | Object | requerido | Entry del manifest |
| `alt` | String | `''` | Alt text del `<img>` |
| `placeholder` | String | `'lqip'` | `'lqip'`, `'blurhash'` o `'none'` |
| `loading` | String | `'lazy'` | `'lazy'` o `'eager'` |
| `sizes` | String | `null` | Override manual del sizes CSS |
| `autoSizes` | Boolean | `false` | Activa ResizeObserver para actualizar sizes en resize |

### Comportamiento

**Auto-sizes** — El componente mide `offsetWidth` después de mount y lo convierte a `vw` para calcular un `sizes` proporcional que funciona en cualquier resolución. Si se pasa `:sizes`, se usa ese valor y no se mide nada.

**LCP / eager** — Cuando `loading="eager"`, se agrega `fetchpriority="high"` automáticamente. En modo desarrollo, si no se pasó `:sizes`, el componente emite un warning en consola con el valor sugerido:

```
[ImgLazy] "hero": loading=eager without explicit :sizes.
  Measured: 1200px = 83vw (viewport: 1440px)
  → Use :sizes="83vw" if the image scales with the viewport
  → Use :sizes="1200px" if the image has a fixed pixel width
```

**CLS = 0** — El wrapper tiene `aspect-ratio` calculado desde `width/height` del manifest. El `<img>` siempre lleva `width` y `height` reales para que el browser reserve el espacio antes de cargar.

**Placeholders** — LQIP se muestra como `background-image` en un div absoluto (no en el `<img>`, para no afectar el preloader del browser). Al dispararse el evento `load`, ambos hacen cross-fade vía CSS transition de 400ms. BlurHash se decodifica en un `<canvas>` en `onMounted`.

### Demo

```bash
cd examples
npm install
npm run dev
# → http://localhost:5173
```

El demo incluye tres escenarios: hero LCP, grid de 3 columnas con BlurHash, y override manual de sizes.

## Reporte Markdown

`sharpey-report.md` contiene por cada imagen:

- **Preload hint** — `<link rel="preload">` con srcset estático listo para pegar en `<head>`
- **ImgLazy snippet** — uso del componente con el manifest entry
- **Raw picture element** — `<picture>` manual sin depender del componente
- **Background CSS** — `image-set()` + `@media` queries responsive

## Catálogo visual

`sharpey-catalog.html` es un grid visual para comparar lado a lado cada imagen con sus placeholders:

| LQIP | BlurHash | Picture |
|------|----------|---------|
| Base64 inline escalado | Canvas con hash decodificado | Imagen real (smallest) |

Abrir en el browser para revisión visual rápida.

## Formatos soportados

Entrada: `.jpg`, `.jpeg`, `.png`, `.webp`, `.tiff`, `.avif`

Salida: AVIF, WebP, JPEG (con mozjpeg)
