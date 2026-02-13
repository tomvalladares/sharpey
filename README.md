# Sharpey

Genera sets de imágenes responsivas optimizadas para LCP. Toma imágenes fuente y produce múltiples tamaños y formatos (AVIF, WebP, JPEG), placeholders LQIP, un manifest JSON para consumir en build time, y un reporte Markdown con snippets Vue.js listos para copiar.

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
# Defaults: 3 tamaños, 3 formatos, output en ./output
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

`sharpey-manifest.json` contiene los datos de cada imagen para consumir en build time:

```json
{
  "hero": {
    "width": 2400,
    "height": 1600,
    "lqip": "data:image/webp;base64,...",
    "blurhash": "LEHV6nWB2yk8...",
    "src": "hero-1920.jpg",
    "srcset": {
      "avif": "hero-320.avif 320w, hero-640.avif 640w, ...",
      "webp": "hero-320.webp 320w, ...",
      "jpeg": "hero-320.jpg 320w, ..."
    },
    "sizes": "(max-width: 320px) 100vw, ..."
  }
}
```

## Reporte Markdown

`sharpey-report.md` contiene por cada imagen snippets Vue.js listos para copiar:

- **Preload hint** — `<link>` con binding al manifest
- **Picture element** — `<picture>` con `:srcset`, `:sizes`, LQIP y BlurHash
- **Background CSS** — `image-set()` + `@media` queries responsive
- **Reusable component** — SFC completo con import del manifest

Copiar el JSON a `src/assets/` y ajustar `sizes` y `alt` según el uso real.

## Catálogo visual

`sharpey-catalog.html` es un grid visual para comparar lado a lado cada imagen con sus placeholders:

| LQIP | BlurHash | Picture |
|------|----------|---------|
| Base64 inline escalado | Canvas con hash decodificado | Imagen real (smallest) |

Abrir en el browser para revisión visual rápida.

## Formatos soportados

Entrada: `.jpg`, `.jpeg`, `.png`, `.webp`, `.tiff`, `.avif`

Salida: AVIF, WebP, JPEG (con mozjpeg)
