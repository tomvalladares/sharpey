import fs from 'node:fs/promises';
import path from 'node:path';

export async function generateManifest(results, config, outputDir) {
  const manifest = {};

  for (const result of results) {
    if (result.error) continue;

    const { stem, originalWidth, originalHeight, variants, lqip } = result;

    const widths = [...new Set(variants.map(v => v.width))].sort((a, b) => a - b);

    manifest[stem] = {
      name: stem,
      width: originalWidth,
      height: originalHeight,
      lqip: lqip?.base64DataUri || null,
      blurhash: lqip?.blurhash?.hash || null,
      widths,
      formats: config.formats,
    };
  }

  const manifestPath = path.join(outputDir, 'sharpey-manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  return manifestPath;
}
