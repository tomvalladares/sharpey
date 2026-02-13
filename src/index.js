import fs from 'node:fs/promises';
import path from 'node:path';
import { buildConfig } from './config.js';
import { runPipeline } from './pipeline.js';
import { generateReport } from './report.js';
import { generateManifest } from './manifest.js';
import { generateCatalog } from './catalog.js';
import * as logger from './logger.js';

export async function run(inputDir, cliOpts = {}) {
  // Validate input directory exists
  const resolvedInput = path.resolve(inputDir);
  try {
    const stat = await fs.stat(resolvedInput);
    if (!stat.isDirectory()) {
      throw new Error(`"${inputDir}" is not a directory`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Input directory "${inputDir}" does not exist`);
    }
    throw err;
  }

  const config = buildConfig(cliOpts, resolvedInput);

  const { results, outputDir } = await runPipeline(config);

  const manifestPath = await generateManifest(results, config, outputDir);
  logger.success(`Manifest: ${manifestPath}`);

  const reportPath = await generateReport(results, config, outputDir);
  logger.success(`Report: ${reportPath}`);

  const catalogPath = await generateCatalog(results, config, outputDir);
  logger.success(`Catalog: ${catalogPath}`);

  logger.printSummary(results, config);

  return { results, manifestPath, reportPath, catalogPath };
}
