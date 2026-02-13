import fs from 'node:fs/promises';
import path from 'node:path';
import { getMimeType } from './utils.js';

export async function generateManifest(results, config, outputDir) {
  const manifest = {};

  for (const result of results) {
    if (result.error) continue;

    const { stem, originalWidth, originalHeight, variants, lqip } = result;

    const srcset = {};
    for (const format of config.formats) {
      srcset[format] = variants
        .filter(v => v.format === format)
        .sort((a, b) => a.width - b.width)
        .map(v => `${v.filename} ${v.width}w`)
        .join(', ');
    }

    const sorted = [...config.sizes].sort((a, b) => a - b);
    const parts = sorted.slice(0, -1).map(s => `(max-width: ${s}px) 100vw`);
    parts.push(`${sorted[sorted.length - 1]}px`);
    const sizes = parts.join(', ');

    const jpegVariants = variants.filter(v => v.format === 'jpeg');
    const fallbackFormat = jpegVariants.length > 0 ? 'jpeg' : config.formats[config.formats.length - 1];
    const fallbackVariants = variants.filter(v => v.format === fallbackFormat);
    const src = fallbackVariants.sort((a, b) => b.width - a.width)[0]?.filename || '';

    manifest[stem] = {
      width: originalWidth,
      height: originalHeight,
      lqip: lqip?.base64DataUri || null,
      blurhash: lqip?.blurhash?.hash || null,
      src,
      srcset,
      sizes,
      formats: config.formats.map(f => ({ format: f, mime: getMimeType(f) })),
    };
  }

  const manifestPath = path.join(outputDir, 'sharpey-manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  return manifestPath;
}
