<script setup>
import manifest from '../../output/sharpey-manifest.json'
import ImgLazy from './components/ImgLazy.vue'
</script>

<template>
  <main>

    <!-- ── Scenario 1: Hero LCP ───────────────────────────────────────────
         loading=eager → fetchpriority=high auto-applied
         No :sizes → DEV warning fires in console with measured value
         placeholder=lqip → base64 blurry background fades out on load
    ─────────────────────────────────────────────────────────────────────── -->
    <section class="section">
      <h2 class="label">1 — Hero LCP <code>loading="eager" placeholder="lqip"</code></h2>
      <div class="hero">
        <ImgLazy
          class="hero-image"
          :image="manifest.biennale"
          loading="eager"
          placeholder="lqip"
          alt="Biennale"
        />
      </div>
    </section>

    <!-- ── Scenario 2: Grid 3 columns ────────────────────────────────────
         loading=lazy → images defer until in viewport
         placeholder=blurhash → canvas decoded on mount
         auto-sizes measures ~33vw → smaller srcset variant selected
    ─────────────────────────────────────────────────────────────────────── -->
    <section class="section">
      <h2 class="label">2 — Grid 3 cols <code>loading="lazy" placeholder="blurhash"</code></h2>
      <div class="grid">
        <ImgLazy
          :image="manifest.arch"
          loading="lazy"
          placeholder="blurhash"
          alt="Architecture"
        />
        <ImgLazy
          :image="manifest.biennale"
          loading="lazy"
          placeholder="blurhash"
          alt="Biennale"
        />
        <ImgLazy
          :image="manifest.chile"
          loading="lazy"
          placeholder="blurhash"
          alt="Chile"
        />
      </div>
    </section>

    <!-- ── Scenario 3: Manual sizes override ─────────────────────────────
         :sizes="'50vw'" → auto-measurement is ignored
         Check DevTools Elements: sizes attr is exactly "50vw"
    ─────────────────────────────────────────────────────────────────────── -->
    <section class="section">
      <h2 class="label">3 — Manual <code>:sizes="'50vw'"</code></h2>
      <div class="half">
        <ImgLazy
          :image="manifest.biennale"
          loading="lazy"
          placeholder="lqip"
          sizes="50vw"
          alt="Biennale"
        />
      </div>
    </section>

  </main>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  background: #111;
  color: #eee;
  padding: 2rem;
}

main {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #94a3b8;
  letter-spacing: 0.02em;
}

.label code {
  font-size: 0.8rem;
  color: #60a5fa;
  background: #1e293b;
  padding: 0.15em 0.4em;
  border-radius: 4px;
}

/* Scenario 1: full-width hero */
.hero {
  width: 100%;
  max-height: 60vh;
  overflow: hidden;
}

/* Scenario 2: 3-column grid */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

/* Scenario 3: half-width */
.half {
  width: 50%;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
