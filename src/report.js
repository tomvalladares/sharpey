import fs from 'node:fs/promises';
import path from 'node:path';
import { getMimeType, formatBytes } from './utils.js';

export async function generateReport(results, config, outputDir) {
  const successResults = results.filter(r => !r.error);
  const sections = successResults.map(r => buildImageSection(r, config)).join('\n');
  const errors = buildErrorSection(results);

  const md = `# Sharpey Report

> ${results.length} image${results.length > 1 ? 's' : ''} processed | Sizes: ${config.sizes.join(', ')} | Formats: ${config.formats.join(', ')}

## Setup

1. Copy \`sharpey-manifest.json\` to your project (e.g. \`src/assets/\`)
2. Copy \`ImgLazy.vue\` to your components directory
3. Set \`VITE_SHARPEY_BASE_PATH\` in your \`.env\` to the public URL where images are served

\`\`\`env
VITE_SHARPEY_BASE_PATH=/images/
\`\`\`

---

${sections}
${errors}`;

  const reportPath = path.join(outputDir, 'sharpey-report.md');
  await fs.writeFile(reportPath, md, 'utf-8');
  return reportPath;
}

function buildImageSection(result, config) {
  const { stem, originalWidth, originalHeight, validSizes, skippedSizes, variants, lqip } = result;

  const totalSize = variants.reduce((s, v) => s + v.size, 0);
  const widths = [...new Set(variants.map(v => v.width))].sort((a, b) => a - b);

  const skippedNote = skippedSizes.length > 0
    ? `\n> Skipped sizes (larger than source): ${skippedSizes.join(', ')}\n`
    : '';

  return `## \`${stem}\`

Original: ${originalWidth}x${originalHeight} | Variants: ${variants.length} | Total: ${formatBytes(totalSize)}
${skippedNote}
### Preload hint (\`<head>\`)

\`\`\`html
${buildPreloadSnippet(stem, widths, config)}
\`\`\`

### ImgLazy component (recommended)

\`\`\`vue
${buildComponentSnippet(stem)}
\`\`\`

### Raw picture element

\`\`\`html
${buildPictureSnippet(stem, widths, config)}
\`\`\`

### Background CSS

\`\`\`css
${buildBackgroundSnippet(stem, validSizes, config)}
\`\`\`

---
`;
}

function buildPreloadSnippet(stem, widths, config) {
  const bestFormat = config.formats[0];
  const mime = getMimeType(bestFormat);
  const ext = bestFormat === 'jpeg' ? 'jpg' : bestFormat;
  const srcset = widths.map(w => `${stem}-${w}.${ext} ${w}w`).join(', ');

  return `<link
  rel="preload"
  as="image"
  type="${mime}"
  imagesrcset="${srcset}"
  fetchpriority="high"
>`;
}

function buildPictureSnippet(stem, widths, config) {
  const EXT_MAP = { avif: 'avif', webp: 'webp', jpeg: 'jpg' };
  const modernFormats = config.formats.slice(0, -1);
  const fallbackFormat = config.formats.at(-1);
  const fallbackExt = EXT_MAP[fallbackFormat] ?? fallbackFormat;
  const fallbackSrcset = widths.map(w => `${stem}-${w}.${fallbackExt} ${w}w`).join(', ');
  const fallbackSrc = `${stem}-${widths.at(-1)}.${fallbackExt}`;

  const sources = modernFormats.map(f => {
    const mime = getMimeType(f);
    const ext = EXT_MAP[f] ?? f;
    const srcset = widths.map(w => `${stem}-${w}.${ext} ${w}w`).join(', ');
    return `  <source type="${mime}" srcset="${srcset}">`;
  }).join('\n');

  return `<picture>
${sources}
  <img
    src="${fallbackSrc}"
    srcset="${fallbackSrcset}"
    width="${'/* originalWidth */'}"
    height="${'/* originalHeight */'}"
    loading="eager"
    decoding="async"
    fetchpriority="high"
    alt=""
  >
</picture>`;
}

function buildComponentSnippet(stem) {
  return `<script setup>
import manifest from '@/assets/sharpey-manifest.json'
import ImgLazy from '@/components/ImgLazy.vue'
</script>

<template>
  <!-- loading="eager" for LCP hero images, "lazy" for below-the-fold -->
  <ImgLazy
    :image="manifest.${stem}"
    loading="eager"
    alt=""
  />
</template>`;
}

function buildBackgroundSnippet(stem, validSizes, config) {
  const sorted = [...validSizes].sort((a, b) => a - b);
  const formats = config.formats;

  function imageSetForWidth(width) {
    const entries = formats.map(f => {
      const ext = f === 'jpeg' ? 'jpg' : f;
      const mime = getMimeType(f);
      return `    url('${stem}-${width}.${ext}') type('${mime}')`;
    });
    return `image-set(\n${entries.join(',\n')}\n  )`;
  }

  const blocks = [];

  const smallest = sorted[0];
  const smallExt = formats.includes('jpeg') ? 'jpg' : formats[formats.length - 1];
  blocks.push(`.bg-${stem} {
  background-size: cover;
  background-position: center;
  /* fallback */
  background-image: url('${stem}-${smallest}.${smallExt}');
  background-image: ${imageSetForWidth(smallest)};
}`);

  for (let i = 1; i < sorted.length; i++) {
    const width = sorted[i];
    const breakpoint = sorted[i - 1] + 1;
    const ext = formats.includes('jpeg') ? 'jpg' : formats[formats.length - 1];
    blocks.push(`@media (min-width: ${breakpoint}px) {
  .bg-${stem} {
    background-image: url('${stem}-${width}.${ext}');
    background-image: ${imageSetForWidth(width)};
  }
}`);
  }

  return blocks.join('\n\n');
}

function buildErrorSection(results) {
  const errors = results.filter(r => r.error);
  if (errors.length === 0) return '';

  const items = errors.map(r => `- **${r.stem}**: ${r.error} (\`${r.sourcePath}\`)`).join('\n');

  return `\n## Errors\n\n${items}\n`;
}
