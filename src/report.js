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

Import the manifest in your Vue component:

\`\`\`vue
<script setup>
import manifest from '@/assets/sharpey-manifest.json'
</script>
\`\`\`

> Adjust the import path to where you place \`sharpey-manifest.json\` in your project.

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

  const skippedNote = skippedSizes.length > 0
    ? `\n> Skipped sizes (larger than source): ${skippedSizes.join(', ')}\n`
    : '';

  const preloadSnippet = buildPreloadSnippet(stem, config);
  const pictureSnippet = buildPictureSnippet(stem, config);

  const backgroundSnippet = buildBackgroundSnippet(stem, validSizes, config);

  return `## \`${stem}\`

Original: ${originalWidth}x${originalHeight} | Variants: ${variants.length} | Total: ${formatBytes(totalSize)}
${skippedNote}
### Preload hint (\`<head>\`)

\`\`\`vue
${preloadSnippet}
\`\`\`

### Picture element

\`\`\`vue
${pictureSnippet}
\`\`\`

### Background CSS

\`\`\`css
${backgroundSnippet}
\`\`\`

### Reusable component

\`\`\`vue
${buildComponentSnippet(stem, config)}
\`\`\`

---
`;
}

function buildPreloadSnippet(stem, config) {
  const bestFormat = config.formats[0];
  const mime = getMimeType(bestFormat);

  return `<link
  rel="preload"
  as="image"
  type="${mime}"
  :imagesrcset="manifest.${stem}.srcset.${bestFormat}"
  :imagesizes="manifest.${stem}.sizes"
  fetchpriority="high"
>`;
}

function buildPictureSnippet(stem, config) {
  const sources = config.formats
    .filter(f => f !== 'jpeg')
    .map(f => {
      const mime = getMimeType(f);
      return `  <source
    type="${mime}"
    :srcset="manifest.${stem}.srcset.${f}"
    :sizes="manifest.${stem}.sizes"
  >`;
    })
    .join('\n');

  const fallbackFormat = config.formats.includes('jpeg')
    ? 'jpeg'
    : config.formats[config.formats.length - 1];

  return `<picture>
${sources}
  <img
    :src="manifest.${stem}.src"
    :srcset="manifest.${stem}.srcset.${fallbackFormat}"
    :sizes="manifest.${stem}.sizes"
    :width="manifest.${stem}.width"
    :height="manifest.${stem}.height"
    :style="{ backgroundImage: \`url(\${manifest.${stem}.lqip})\`, backgroundSize: 'cover' }"
    :data-blurhash="manifest.${stem}.blurhash"
    alt=""
    loading="eager"
    decoding="async"
    fetchpriority="high"
  >
</picture>`;
}

function buildComponentSnippet(stem, config) {
  const fallbackFormat = config.formats.includes('jpeg')
    ? 'jpeg'
    : config.formats[config.formats.length - 1];

  const sources = config.formats
    .filter(f => f !== 'jpeg')
    .map(f => {
      const mime = getMimeType(f);
      return `    <source type="${mime}" :srcset="img.srcset.${f}" :sizes="img.sizes">`;
    })
    .join('\n');

  return `<script setup>
import manifest from '@/assets/sharpey-manifest.json'

const img = manifest.${stem}
</script>

<template>
  <picture>
${sources}
    <img
      :src="img.src"
      :srcset="img.srcset.${fallbackFormat}"
      :sizes="img.sizes"
      :width="img.width"
      :height="img.height"
      :style="{ backgroundImage: \`url(\${img.lqip})\`, backgroundSize: 'cover' }"
      :data-blurhash="img.blurhash"
      alt=""
      loading="eager"
      decoding="async"
      fetchpriority="high"
    >
  </picture>
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

  // Base (smallest)
  const smallest = sorted[0];
  const smallExt = formats.includes('jpeg') ? 'jpg' : (formats[formats.length - 1] === 'jpeg' ? 'jpg' : formats[formats.length - 1]);
  blocks.push(`.bg-${stem} {
  background-size: cover;
  background-position: center;
  /* fallback */
  background-image: url('${stem}-${smallest}.${smallExt}');
  background-image: ${imageSetForWidth(smallest)};
}`);

  // Media queries for larger sizes
  for (let i = 1; i < sorted.length; i++) {
    const width = sorted[i];
    const breakpoint = sorted[i - 1] + 1;
    const ext = formats.includes('jpeg') ? 'jpg' : (formats[formats.length - 1] === 'jpeg' ? 'jpg' : formats[formats.length - 1]);
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
