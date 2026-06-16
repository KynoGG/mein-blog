import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#0F1113"/>
  <text x="50%" y="58%" text-anchor="middle" font-family="'Space Grotesk', 'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="300" fill="#6BAF7E">L</text>
</svg>
`;

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'maskable-icon-512.png', size: 512, maskable: true },
];

for (const { name, size, maskable } of sizes) {
  const buf = Buffer.from(svg);
  let pipeline = sharp(buf).resize(size, size);
  if (maskable) {
    // safe zone padding for maskable icons (~10%)
    const inner = Math.round(size * 0.8);
    pipeline = sharp(buf)
      .resize(inner, inner)
      .extend({
        top: Math.round((size - inner) / 2),
        bottom: Math.round((size - inner) / 2),
        left: Math.round((size - inner) / 2),
        right: Math.round((size - inner) / 2),
        background: '#0F1113',
      });
  }
  await pipeline.png().toFile(path.join(outDir, name));
  console.log('wrote', name);
}

// favicon.ico replacement (32px png used as favicon via app/icon.png convention)
await sharp(Buffer.from(svg)).resize(32, 32).png().toFile(path.join(__dirname, '..', 'src', 'app', 'icon.png'));
console.log('wrote src/app/icon.png');
