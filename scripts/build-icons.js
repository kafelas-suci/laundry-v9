import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateAllIcons() {
  const sourceImage = path.resolve('src/assets/images/kafelas_laundry_icon_1791784117311.jpg');
  if (!fs.existsSync(sourceImage)) {
    throw new Error('Source image not found: ' + sourceImage);
  }

  console.log('Reading source image:', sourceImage);

  // Helper to place resized logo onto a white square canvas with safe-zone margin
  async function createPaddedIcon(size, scaleRatio = 0.65) {
    const innerSize = Math.round(size * scaleRatio);
    const offset = Math.round((size - innerSize) / 2);

    const innerLogoBuffer = await sharp(sourceImage)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: innerLogoBuffer,
          top: offset,
          left: offset,
        },
      ])
      .png({ quality: 100 })
      .toBuffer();
  }

  // 1. Generate 512x512 master PNG & PWA icons with comfortable 65% safe-zone ratio (~330px centered)
  const pwa512Buffer = await createPaddedIcon(512, 0.65);
  fs.writeFileSync('public/logo-kafela.png', pwa512Buffer);
  fs.writeFileSync('public/pwa-512x512.png', pwa512Buffer);
  fs.writeFileSync('public/pwa-maskable-512x512.png', pwa512Buffer);

  // 2. Generate 192x192 PWA icon
  const pwa192Buffer = await createPaddedIcon(192, 0.65);
  fs.writeFileSync('public/pwa-192x192.png', pwa192Buffer);
  fs.writeFileSync('public/favicon.ico', pwa192Buffer);

  // 3. Generate Apple Touch Icon 180x180
  const appleTouchBuffer = await createPaddedIcon(180, 0.68);
  fs.writeFileSync('public/apple-touch-icon.png', appleTouchBuffer);

  // 4. Generate high-quality SVG icons with 65% proportion inside squircle
  const base64Png = pwa512Buffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Clean white background with rounded squircle corners -->
  <rect width="512" height="512" fill="#ffffff" rx="108"/>
  <!-- Kafela's Laundry Logo Centered with Safe Zone Margins -->
  <image width="512" height="512" x="0" y="0" href="data:image/png;base64,${base64Png}"/>
</svg>
`;

  fs.writeFileSync('public/icon.svg', svgContent);
  fs.writeFileSync('public/favicon.svg', svgContent);
  fs.writeFileSync('public/logo-kafela.svg', svgContent);

  console.log('All icons generated successfully!');
}

generateAllIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
