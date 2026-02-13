import sharp from 'sharp';
import path from 'node:path';
import { buildOutputFilename } from './utils.js';

export async function processImage(filePath, stem, config, outputDir) {
  const metadata = await sharp(filePath).metadata();
  const originalWidth = metadata.width;
  const originalHeight = metadata.height;

  const validSizes = config.sizes.filter(w => w <= originalWidth);
  const skippedSizes = config.sizes.filter(w => w > originalWidth);

  // If source is smaller than all targets, use original width
  if (validSizes.length === 0) {
    validSizes.push(originalWidth);
  }

  // Include original width when there's a significant gap (>20%) above the largest valid size
  const largest = validSizes.at(-1);
  if (skippedSizes.length > 0 && originalWidth > largest * 1.2) {
    validSizes.push(originalWidth);
  }

  const variants = [];

  for (const width of validSizes) {
    for (const format of config.formats) {
      const filename = buildOutputFilename(stem, width, format);
      const outputPath = path.join(outputDir, filename);

      const pipeline = sharp(filePath).resize(width);
      applyFormat(pipeline, format, config);
      const info = await pipeline.toFile(outputPath);

      variants.push({
        filename,
        width,
        height: info.height,
        format,
        size: info.size,
      });
    }
  }

  return {
    stem,
    originalWidth,
    originalHeight,
    validSizes,
    skippedSizes,
    variants,
  };
}

function applyFormat(pipeline, format, config) {
  switch (format) {
    case 'avif':
      pipeline.avif({ quality: config.qualityAvif });
      break;
    case 'webp':
      pipeline.webp({ quality: config.qualityWebp });
      break;
    case 'jpeg':
      pipeline.jpeg({ quality: config.qualityJpeg, mozjpeg: true });
      break;
  }
}
