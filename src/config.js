export const DEFAULTS = {
  output: './output',
  sizes: [320, 640, 1024, 1920],
  formats: ['avif', 'webp', 'jpeg'],
  qualityAvif: 75,
  qualityWebp: 80,
  qualityJpeg: 85,
  lqipSize: 16,
  concurrency: 3,
};

export const SUPPORTED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.avif',
]);

const FORMAT_EXTENSIONS = {
  avif: '.avif',
  webp: '.webp',
  jpeg: '.jpg',
};

export function getFormatExtension(format) {
  return FORMAT_EXTENSIONS[format] || `.${format}`;
}

export function buildConfig(cliOpts, inputDir) {
  const sizes = cliOpts.sizes
    ? cliOpts.sizes.split(',').map(s => {
        const n = parseInt(s.trim(), 10);
        if (isNaN(n) || n <= 0) throw new Error(`Invalid size: "${s.trim()}"`);
        return n;
      })
    : DEFAULTS.sizes;

  const formats = cliOpts.formats
    ? cliOpts.formats.split(',').map(f => {
        const fmt = f.trim().toLowerCase();
        if (!FORMAT_EXTENSIONS[fmt]) throw new Error(`Unsupported format: "${fmt}". Use avif, webp, or jpeg.`);
        return fmt;
      })
    : DEFAULTS.formats;

  const qualityAvif = parseQuality(cliOpts.qualityAvif, DEFAULTS.qualityAvif, 'quality-avif');
  const qualityWebp = parseQuality(cliOpts.qualityWebp, DEFAULTS.qualityWebp, 'quality-webp');
  const qualityJpeg = parseQuality(cliOpts.qualityJpeg, DEFAULTS.qualityJpeg, 'quality-jpeg');

  const lqipSize = parseInt(cliOpts.lqipSize, 10) || DEFAULTS.lqipSize;
  const concurrency = parseInt(cliOpts.concurrency, 10) || DEFAULTS.concurrency;

  return {
    inputDir,
    output: cliOpts.output || DEFAULTS.output,
    sizes: sizes.sort((a, b) => a - b),
    formats,
    qualityAvif,
    qualityWebp,
    qualityJpeg,
    lqipSize,
    concurrency,
  };
}

function parseQuality(value, fallback, name) {
  if (value === undefined || value === null) return fallback;
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 100) throw new Error(`--${name} must be between 1 and 100`);
  return n;
}
