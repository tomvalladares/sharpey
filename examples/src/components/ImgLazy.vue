<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  image: { type: Object, required: true },
  alt: { type: String, default: '' },
  placeholder: {
    type: String,
    default: 'lqip',
    validator: v => ['lqip', 'blurhash', 'none'].includes(v),
  },
  loading: {
    type: String,
    default: 'lazy',
    validator: v => ['lazy', 'eager'].includes(v),
  },
  sizes: { type: String, default: null },
  autoSizes: { type: Boolean, default: false },
})

// ─── Path reconstruction ───────────────────────────────────────────────────

const basePath = import.meta.env.VITE_SHARPEY_BASE_PATH ?? ''

const EXT_MAP = { avif: '.avif', webp: '.webp', jpeg: '.jpg' }
const MIME_MAP = { avif: 'image/avif', webp: 'image/webp', jpeg: 'image/jpeg' }

const modernFormats = computed(() =>
  props.image.formats.slice(0, -1).map(f => ({ format: f, mime: MIME_MAP[f] ?? `image/${f}` }))
)

const fallbackFormat = computed(() => props.image.formats.at(-1))

function srcsetFor(format) {
  const ext = EXT_MAP[format] ?? `.${format}`
  return props.image.widths
    .map(w => `${basePath}${props.image.name}-${w}${ext} ${w}w`)
    .join(', ')
}

const fallbackSrc = computed(() => {
  const ext = EXT_MAP[fallbackFormat.value] ?? `.${fallbackFormat.value}`
  return `${basePath}${props.image.name}-${props.image.widths.at(-1)}${ext}`
})

const wrapperStyle = computed(() => ({
  aspectRatio: `${props.image.width} / ${props.image.height}`,
}))

// ─── Sizes auto-measurement ────────────────────────────────────────────────

const imgRef = ref(null)
const canvasRef = ref(null)
const measuredSizes = ref(null)
const loaded = ref(false)

const resolvedSizes = computed(() => props.sizes ?? measuredSizes.value ?? undefined)

function measureSizes() {
  if (!imgRef.value) return null
  const px = imgRef.value.offsetWidth
  if (!px) return null
  const vw = Math.round(px / window.innerWidth * 100)
  measuredSizes.value = `${vw}vw`
  return { px, vw }
}

let ro = null

onMounted(async () => {
  await nextTick()
  const measured = measureSizes()

  if (import.meta.env.DEV && props.loading === 'eager' && !props.sizes && measured) {
    const { px, vw } = measured
    console.warn(
      `[ImgLazy] "${props.image.name}": loading=eager without explicit :sizes.\n` +
      `  Measured: ${px}px = ${vw}vw (viewport: ${window.innerWidth}px)\n` +
      `  → Use :sizes="${vw}vw" if the image scales with the viewport\n` +
      `  → Use :sizes="${px}px" if the image has a fixed pixel width\n` +
      `  → Use a media-query string if width ratio changes at different breakpoints`
    )
  }

  if (props.placeholder === 'blurhash' && props.image.blurhash && canvasRef.value) {
    decodeBlurhash(canvasRef.value, props.image.blurhash, props.image.width, props.image.height)
  }

  if (props.autoSizes && imgRef.value) {
    ro = new ResizeObserver(measureSizes)
    ro.observe(imgRef.value)
  }
})

onUnmounted(() => {
  ro?.disconnect()
})

// ─── BlurHash decoder (adapted from src/catalog.js) ───────────────────────

function decodeBlurhash(canvas, hash, ow, oh) {
  const C = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~'
  function d83(s) { let v = 0; for (let i = 0; i < s.length; i++) v = v * 83 + C.indexOf(s[i]); return v }
  function sL(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  function lS(v) { v = Math.max(0, Math.min(1, v)); return v <= 0.0031308 ? Math.round(v * 12.92 * 255 + 0.5) : Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5) }
  function sP(v, e) { return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), e) }
  function dDC(v) { return [sL(v >> 16), sL((v >> 8) & 255), sL(v & 255)] }
  function dAC(v, m) { const r = Math.floor(v / 361), g = Math.floor(v / 19) % 19, b = v % 19; return [sP((r - 9) / 9, 2) * m, sP((g - 9) / 9, 2) * m, sP((b - 9) / 9, 2) * m] }

  const sf = d83(hash[0]), ny = Math.floor(sf / 9) + 1, nx = (sf % 9) + 1
  const m = (d83(hash[1]) + 1) / 166
  const colors = [dDC(d83(hash.substring(2, 6)))]
  for (let i = 1; i < nx * ny; i++) colors.push(dAC(d83(hash.substring(4 + i * 2, 6 + i * 2)), m))

  const pw = Math.min(64, ow)
  const ph = Math.round(pw * oh / ow)
  canvas.width = pw
  canvas.height = ph

  const px = new Uint8ClampedArray(pw * ph * 4)
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      let r = 0, g = 0, b = 0
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const basis = Math.cos(Math.PI * x * i / pw) * Math.cos(Math.PI * y * j / ph)
          const c = colors[i + j * nx]
          r += c[0] * basis; g += c[1] * basis; b += c[2] * basis
        }
      }
      const idx = 4 * (x + y * pw)
      px[idx] = lS(r); px[idx + 1] = lS(g); px[idx + 2] = lS(b); px[idx + 3] = 255
    }
  }

  try {
    const ctx = canvas.getContext('2d')
    const imgData = ctx.createImageData(pw, ph)
    imgData.data.set(px)
    ctx.putImageData(imgData, 0, 0)
  } catch (e) {
    console.error('[ImgLazy] BlurHash decode error:', e)
  }
}
</script>

<template>
  <div class="si-wrapper" :style="wrapperStyle">

    <!-- LQIP: div with background-image (keeps <img> width/height intact for CLS) -->
    <div
      v-if="placeholder === 'lqip' && image.lqip"
      class="si-placeholder si-placeholder--lqip"
      :class="{ 'si-placeholder--hidden': loaded }"
      :style="{ backgroundImage: `url(${image.lqip})` }"
      aria-hidden="true"
    />

    <!-- BlurHash: canvas decoded on mount -->
    <canvas
      v-if="placeholder === 'blurhash' && image.blurhash"
      ref="canvasRef"
      class="si-placeholder si-placeholder--canvas"
      :class="{ 'si-placeholder--hidden': loaded }"
      aria-hidden="true"
    />

    <picture>
      <source
        v-for="fmt in modernFormats"
        :key="fmt.format"
        :type="fmt.mime"
        :srcset="srcsetFor(fmt.format)"
        :sizes="resolvedSizes"
      />
      <img
        ref="imgRef"
        :src="fallbackSrc"
        :srcset="srcsetFor(fallbackFormat)"
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

<style scoped>
.si-wrapper {
  display: block;
  position: relative;
  overflow: hidden;
}

.si-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 1;
  transition: opacity 400ms ease;
}

.si-placeholder--lqip {
  background-size: cover;
  background-position: center;
}

.si-placeholder--canvas {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.si-placeholder--hidden {
  opacity: 0;
  pointer-events: none;
}

.si-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 400ms ease;
}

.si-img--loaded {
  opacity: 1;
}
</style>
