import fs from 'node:fs/promises';
import path from 'node:path';
import pMap from 'p-map';
import { processImage } from './processor.js';
import { generateLqip } from './lqip.js';
import { isSupportedImage, deduplicateStems } from './utils.js';
import * as logger from './logger.js';

export async function runPipeline(config) {
  // Read and filter input images
  const entries = await fs.readdir(config.inputDir);
  const imagePaths = entries
    .filter(f => isSupportedImage(f))
    .sort()
    .map(f => path.join(config.inputDir, f));

  if (imagePaths.length === 0) {
    throw new Error(`No supported images found in "${config.inputDir}". Supported: .jpg, .png, .webp, .tiff, .avif`);
  }

  // Deduplicate stems
  const images = deduplicateStems(imagePaths);
  const duplicates = images.filter(i => i.isDuplicate);
  for (const dup of duplicates) {
    logger.warn(`Duplicate stem detected: "${path.basename(dup.filePath)}" → using "${dup.stem}"`);
  }

  // Create output dir
  const outputDir = path.resolve(config.output);
  await fs.mkdir(outputDir, { recursive: true });

  logger.info(`Processing ${images.length} image${images.length > 1 ? 's' : ''} → ${outputDir}`);
  logger.info(`Sizes: ${config.sizes.join(', ')} | Formats: ${config.formats.join(', ')}`);

  // Process images with concurrency
  let processed = 0;
  logger.startSpinner(`Processing images (0/${images.length})`);

  const results = await pMap(
    images,
    async ({ filePath, stem }) => {
      try {
        const result = await processImage(filePath, stem, config, outputDir);
        const lqip = await generateLqip(filePath, config.lqipSize);
        processed++;
        logger.updateSpinner(`Processing images (${processed}/${images.length})`);
        return { ...result, lqip, sourcePath: filePath };
      } catch (err) {
        processed++;
        logger.updateSpinner(`Processing images (${processed}/${images.length})`);
        logger.warn(`Skipped "${path.basename(filePath)}": ${err.message}`);
        return { stem, sourcePath: filePath, error: err.message, variants: [] };
      }
    },
    { concurrency: config.concurrency }
  );

  logger.succeedSpinner(`Processed ${images.length} image${images.length > 1 ? 's' : ''}`);

  return { results, outputDir };
}
