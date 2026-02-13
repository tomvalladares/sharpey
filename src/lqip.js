import sharp from 'sharp';
import { encode } from 'blurhash';

export async function generateLqip(filePath, lqipSize) {
  const [base64DataUri, blurhash] = await Promise.all([
    generateBase64(filePath, lqipSize),
    generateBlurhash(filePath, lqipSize),
  ]);

  return { base64DataUri, blurhash };
}

async function generateBase64(filePath, maxDim) {
  const buffer = await sharp(filePath)
    .resize(maxDim, maxDim, { fit: 'inside' })
    .webp({ quality: 20 })
    .toBuffer();

  return `data:image/webp;base64,${buffer.toString('base64')}`;
}

async function generateBlurhash(filePath, maxDim) {
  const { data, info } = await sharp(filePath)
    .resize(maxDim, maxDim, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const componentX = 4;
  const componentY = 3;

  return {
    hash: encode(new Uint8ClampedArray(data), info.width, info.height, componentX, componentY),
    width: info.width,
    height: info.height,
  };
}
