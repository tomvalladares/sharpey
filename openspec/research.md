# Plan: SharpeyImage Vue 3 Component

## Objetivo
Crear un componente Vue 3 `<SharpeyImage>` que consuma el manifest JSON de sharpey y renderice imágenes responsivas optimizadas para LCP, con sizing automático (auto-sizes via ResizeObserver, igual que unlazy), soporte de placeholders (LQIP / BlurHash), y loading strategy configurable.

---

## Estructura de archivos a crear

```
examples/
├── package.json              # demo standalone (vue + vite)
├── vite.config.js            # publicDir → ../output (archivos de sharpey)
├── index.html
├── src/
│   ├── main.js
│   ├── App.vue               # demo: hero + grid + manual sizes
│   └── components/
│       └── SharpeyImage.vue  # EL componente
```

> `useBlurhash` se implementa inline en `SharpeyImage.vue` para mantener el componente autocontenido (sin composables externos que el dev deba copiar). Si crece, se extrae luego.

---

## API del componente (props)

```js
defineProps({
  image: { type: Object, required: true },
  // Forma esperada (del manifest):
  // { width, height, lqip, blurhash, src, srcset: {avif,webp,jpeg}, sizes, formats }

  alt:     { type: String,  default: '' },

  placeholder: {
    type: String, default: 'lqip',
    validator: v => ['lqip', 'blurhash', 'none'].includes(v)
  },

  loading: {
    type: String, default: 'eager',
    validator: v => ['eager', 'lazy'].includes(v)
  },

  // Override manual del sizes CSS. Si no se pasa → auto-measure via offsetWidth
  sizes: { type: String, default: null },
})
```

**Regla de `fetchpriority`:** cuando `loading === 'eager'` → `fetchpriority="high"` automático.

---

## Estrategia de sizes (núcleo del diseño)

### Problema
El manifest genera `sizes` genérico (`100vw` para todos los breakpoints). Una imagen en un grid de 3 columnas que no declare `sizes` descargará variantes 3x más grandes de lo necesario.

### Solución: auto-measurement post-layout (igual que unlazy)
1. Después de `onMounted` + `nextTick`, leer `imgRef.value.offsetWidth`
2. Setear `measuredSizes.value = "${w}px"`
3. Suscribir un `ResizeObserver` sobre el `<img>` para actualizar en resize
4. El computed `resolvedSizes` prioriza: `sizes prop` > `measuredSizes` > `image.sizes`

```
resolvedSizes = props.sizes ?? measuredSizes.value ?? props.image.sizes
```

**Por qué `offsetWidth` y no `getBoundingClientRect`:**
- `offsetWidth` es entero, en píxeles CSS, sin transforms → coincide con lo que el browser usa para seleccionar srcset
- `getBoundingClientRect` incluye transforms y devuelve decimals

**Por qué no auto-detect en SSR:**
- Todo el código de measurement está dentro de `onMounted` → el SSR renderiza con `image.sizes` (el genérico del manifest), que es un fallback válido
- Guardia adicional: `if (!imgRef.value) return`

---

## Estructura del template

```html
<template>
  <div ref="wrapperRef" class="si-wrapper" :style="wrapperStyle">

    <!-- Placeholder LQIP: div con background-image base64 -->
    <div
      v-if="placeholder === 'lqip' && image.lqip"
      class="si-placeholder si-placeholder--lqip"
      :class="{ 'si-placeholder--hidden': loaded }"
      :style="{ backgroundImage: `url(${image.lqip})` }"
      aria-hidden="true"
    />

    <!-- Placeholder BlurHash: canvas decodificado en onMounted -->
    <canvas
      v-if="placeholder === 'blurhash' && image.blurhash"
      ref="canvasRef"
      class="si-placeholder si-placeholder--canvas"
      :class="{ 'si-placeholder--hidden': loaded }"
      aria-hidden="true"
    />

    <picture>
      <!-- Sources modernos: avif primero, luego webp. JPEG va en <img> -->
      <source
        v-for="fmt in modernFormats"
        :key="fmt.format"
        :type="fmt.mime"
        :srcset="image.srcset[fmt.format]"
        :sizes="resolvedSizes"
      />

      <img
        ref="imgRef"
        :src="image.src"
        :srcset="image.srcset.jpeg || image.srcset[fallbackFormat]"
        :sizes="resolvedSizes"
        :width="image.width"
        :height="image.height"
        :alt="alt"
        :loading="loading"
        :fetchpriority="loading === 'eager' ? 'high' : undefined"
        decoding="async"
        class="si-img"
        :class="{ 'si-img--loaded': loaded }"
        @load="loaded = true"
      />
    </picture>
  </div>
</template>
```

**Notas críticas:**
- `width` + `height` en `<img>` → el browser calcula aspect-ratio antes de cargar → evita CLS
- `decoding="async"` siempre — nunca bloquea main thread
- `fetchpriority` es distinto de `loading`; ambos son necesarios para LCP real
- La guarda `v-if="image.srcset[fmt.format]"` previene sources con srcset vacío cuando sharpey se corrió sin AVIF

---

## CSS (scoped)

```css
.si-wrapper {
  display: block;
  position: relative;
  overflow: hidden;
}

/* aspect-ratio calculado desde image.width / image.height → previene CLS */
/* (aplicado via :style="wrapperStyle" computed) */

.si-placeholder {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  opacity: 1;
  transition: opacity 400ms ease;
}
.si-placeholder--lqip { background-size: cover; background-position: center; }
.si-placeholder--canvas { width: 100%; height: 100%; object-fit: cover; }
.si-placeholder--hidden { opacity: 0; pointer-events: none; }

.si-img {
  display: block; width: 100%; height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 400ms ease;
}
.si-img--loaded { opacity: 1; }
```

El cross-fade placeholder→imagen sucede simultáneamente al dispararse `@load`.

---

## BlurHash decoder (inline en SharpeyImage.vue)

Extraer el algoritmo de `src/catalog.js:170-207` y convertirlo en funciones ES module dentro del `<script setup>`. La lógica es idéntica al catalog — solo se reorganiza para llamada directa en lugar de `document.querySelectorAll`.

```js
function decodeBlurhash(canvas, hash, ow, oh) {
  const pw = Math.min(64, ow)
  const ph = Math.round(pw * oh / ow)
  canvas.width = pw
  canvas.height = ph
  // ... mismo algoritmo de catalog.js ...
}
```

Se llama en `onMounted` cuando `placeholder === 'blurhash'`.

---

## Vite demo config (crítico)

```js
// examples/vite.config.js
export default defineConfig({
  plugins: [vue()],
  publicDir: '../output'   // ← sirve los archivos de sharpey como assets estáticos
})
```

Esto permite que `image.src = "hero-1920.jpg"` resuelva a `http://localhost:5173/hero-1920.jpg` sin path manipulation en el componente.

---

## App.vue demo (3 escenarios de test)

1. **Hero LCP** — `loading="eager"`, `placeholder="lqip"`, full-width → verifica `fetchpriority=high` en DevTools Network
2. **Grid 3 columnas** — `loading="lazy"`, `placeholder="blurhash"` → auto-sizes mide ~33vw → verifica que descarga variante más pequeña que el hero
3. **Manual override** — `sizes="50vw"` → verifica que ignora auto-measure

---

## Archivos críticos de referencia

| Archivo | Para qué |
|---------|----------|
| `src/catalog.js:170-207` | Decoder BlurHash a extraer inline |
| `src/manifest.js:32-41` | Forma exacta del objeto `image` prop |
| `src/report.js:96-168` | Vue snippets existentes (el componente debe ser superset) |
| `src/config.js` | Defaults de sizes y formats para alinear lógica |

---

## Orden de implementación

1. **Correr sharpey** con imágenes de test → generar `output/` con manifest real
2. Crear `examples/package.json` + `npm install` (vue + vite + @vitejs/plugin-vue)
3. Crear `vite.config.js` → verificar que `localhost:5173/sharpey-manifest.json` responde
4. Crear `SharpeyImage.vue` solo estructura estática (sin sizes auto, sin placeholder)
5. Agregar LQIP placeholder + `@load` handler + CSS transitions
6. Agregar BlurHash canvas inline decoder
7. Agregar auto-sizes via `offsetWidth` + `ResizeObserver`
8. Crear `App.vue` con los 3 escenarios de demo
9. Verificar en DevTools: Network (tamaños correctos), LCP score, CLS = 0

---

## Verificación end-to-end

```bash
# 1. Generar output con sharpey
cd /path/to/strange-cori
node bin/sharpey.js ./test-imgs -o ./output

# 2. Correr demo
cd examples
npm install
npm run dev
# → http://localhost:5173
```

**Checklist DevTools:**
- [ ] Hero: `<img fetchpriority="high" loading="eager">` en Elements
- [ ] Grid items: `<img loading="lazy">`, `sizes="Npx"` actualizado post-mount
- [ ] Network: grid images cargan variante más pequeña que el hero
- [ ] No layout shift al cargar (CLS = 0 en Performance tab)
- [ ] BlurHash canvas visible durante carga en throttled connection
- [ ] LQIP base64 visible como background antes del load event
