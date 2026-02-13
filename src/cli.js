import { Command } from 'commander';
import { DEFAULTS } from './config.js';

export function createProgram() {
  const program = new Command();

  program
    .name('sharpey')
    .description('Generate responsive image sets optimized for LCP')
    .version('1.0.0')
    .argument('<inputDir>', 'Directory containing source images')
    .option('-o, --output <dir>', `Output directory (default: "${DEFAULTS.output}")`)
    .option('-s, --sizes <widths>', `Widths separated by comma (default: "${DEFAULTS.sizes.join(',')}")`)
    .option('-f, --formats <formats>', `Output formats (default: "${DEFAULTS.formats.join(',')}")`)
    .option('--quality-avif <n>', `AVIF quality 1-100 (default: ${DEFAULTS.qualityAvif})`)
    .option('--quality-webp <n>', `WebP quality 1-100 (default: ${DEFAULTS.qualityWebp})`)
    .option('--quality-jpeg <n>', `JPEG quality 1-100 (default: ${DEFAULTS.qualityJpeg})`)
    .option('--lqip-size <pixels>', `Max LQIP dimension in px (default: ${DEFAULTS.lqipSize})`)
    .option('--concurrency <n>', `Images processed in parallel (default: ${DEFAULTS.concurrency})`);

  return program;
}
