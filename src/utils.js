import path from 'node:path';
import { SUPPORTED_EXTENSIONS, getFormatExtension } from './config.js';

export function isSupportedImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function getStem(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

export function buildOutputFilename(stem, width, format) {
  const ext = getFormatExtension(format);
  return `${stem}-${width}${ext}`;
}

export function deduplicateStems(filePaths) {
  const stemCounts = new Map();
  const results = [];

  for (const filePath of filePaths) {
    const stem = getStem(filePath);
    const count = stemCounts.get(stem) || 0;
    stemCounts.set(stem, count + 1);

    const dedupedStem = count === 0 ? stem : `${stem}-${count + 1}`;
    results.push({ filePath, stem: dedupedStem, isDuplicate: count > 0 });
  }

  return results;
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getMimeType(format) {
  const mimes = {
    avif: 'image/avif',
    webp: 'image/webp',
    jpeg: 'image/jpeg',
  };
  return mimes[format] || `image/${format}`;
}
