import { SettingsData } from '../types';
import { DEFAULT_KAFELA_LOGO_BASE64 } from './defaultLogo';

let cachedLogoBase64: string = DEFAULT_KAFELA_LOGO_BASE64;

/**
 * Dapatkan string Base64 logo toko siap cetak untuk printer Bluetooth thermal.
 * Selalu mengembalikan Base64 yang valid dan instan (tanpa delay).
 */
export async function getLogoBase64(settings: SettingsData): Promise<string> {
  if (!settings.useLogo) {
    return '';
  }

  // 1. Jika logoPath berupa Base64 Data URL (misal hasil upload gambar baru di Pengaturan)
  if (settings.logoPath && settings.logoPath.startsWith('data:image/')) {
    const commaIdx = settings.logoPath.indexOf(',');
    const b64 = commaIdx !== -1 ? settings.logoPath.slice(commaIdx + 1) : settings.logoPath;
    cachedLogoBase64 = b64.trim();
    return cachedLogoBase64;
  }

  // 2. Jika logoPath adalah default logo toko Kafela
  if (!settings.logoPath || settings.logoPath === '/logo-kafela.png' || settings.logoPath.includes('logo-kafela')) {
    cachedLogoBase64 = DEFAULT_KAFELA_LOGO_BASE64;
    return DEFAULT_KAFELA_LOGO_BASE64;
  }

  // 3. Jika logoPath adalah URL kustom lain
  if (cachedLogoBase64 && cachedLogoBase64 !== DEFAULT_KAFELA_LOGO_BASE64) {
    return cachedLogoBase64;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(settings.logoPath, { signal: controller.signal });
    clearTimeout(timeoutId);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = (reader.result as string) || '';
        const commaIdx = result.indexOf(',');
        const b64 = commaIdx !== -1 ? result.slice(commaIdx + 1) : result;
        cachedLogoBase64 = b64.trim() || DEFAULT_KAFELA_LOGO_BASE64;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => resolve(DEFAULT_KAFELA_LOGO_BASE64);
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback aman ke logo Kafela default jika gagal fetch
    return DEFAULT_KAFELA_LOGO_BASE64;
  }
}

/**
 * Konversi Base64 gambar ke format ESC/POS Raster Bit Image (GS v 0 0)
 * untuk Web Bluetooth API di Chrome browser.
 */
export async function convertBase64ToEscPosRaster(
  base64Data: string,
  maxTargetWidth = 240
): Promise<Uint8Array | null> {
  if (!base64Data) return null;
  const cleanBase64 = base64Data.includes(',') ? base64Data.slice(base64Data.indexOf(',') + 1) : base64Data;
  if (!cleanBase64.trim()) return null;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;
        let targetWidth = originalWidth > maxTargetWidth ? maxTargetWidth : originalWidth;
        targetWidth = Math.floor(targetWidth / 8) * 8;
        if (targetWidth <= 0) targetWidth = 8;
        const targetHeight = Math.floor((originalHeight * targetWidth) / originalWidth);
        if (targetHeight <= 0) {
          resolve(null);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Latar putih
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;
        const xBytes = targetWidth / 8;
        const xL = xBytes % 256;
        const xH = Math.floor(xBytes / 256);
        const yL = targetHeight % 256;
        const yH = Math.floor(targetHeight / 256);

        // Header ESC/POS Raster: GS v 0 0 xL xH yL yH
        const header = [0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH];
        const rasterBytes: number[] = [...header];

        for (let y = 0; y < targetHeight; y++) {
          for (let xb = 0; xb < xBytes; xb++) {
            let byteVal = 0;
            for (let b = 0; b < 8; b++) {
              const x = xb * 8 + b;
              if (x < targetWidth) {
                const idx = (y * targetWidth + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const bVal = data[idx + 2];
                const alpha = data[idx + 3];
                const lum = 0.299 * r + 0.587 * g + 0.114 * bVal;
                const isBlack = alpha > 50 && lum < 165;
                if (isBlack) {
                  byteVal |= 1 << (7 - b);
                }
              }
            }
            rasterBytes.push(byteVal);
          }
        }

        resolve(new Uint8Array(rasterBytes));
      };
      img.onerror = () => resolve(null);
      img.src = `data:image/png;base64,${cleanBase64}`;
    } catch {
      resolve(null);
    }
  });
}
