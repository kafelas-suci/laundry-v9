import { SettingsData } from '../types';
import { DEFAULT_KAFELA_LOGO_BASE64 } from './defaultLogo';

let cachedLogoKey = '';
let cachedLogoBase64 = '';
let cachedThermalKey = '';
let cachedThermalDataUrl = '';

export async function getLogoBase64(settings: SettingsData): Promise<string> {
  if (!settings.useLogo || !settings.logoPath || !settings.logoPath.trim()) {
    return '';
  }

  const rawPath = settings.logoPath.trim();

  if (rawPath.startsWith('data:image/')) {
    const commaIdx = rawPath.indexOf(',');
    const b64 = commaIdx !== -1 ? rawPath.slice(commaIdx + 1) : rawPath;
    cachedLogoKey = rawPath;
    cachedLogoBase64 = b64.trim();
    return cachedLogoBase64;
  }

  if (rawPath === '/logo-kafela.png' || rawPath.includes('logo-kafela')) {
    return DEFAULT_KAFELA_LOGO_BASE64;
  }

  if (cachedLogoKey === rawPath && cachedLogoBase64) {
    return cachedLogoBase64;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(rawPath, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return '';
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = (reader.result as string) || '';
        const commaIdx = result.indexOf(',');
        const b64 = commaIdx !== -1 ? result.slice(commaIdx + 1) : result;
        const cleanB64 = b64.trim();
        cachedLogoKey = rawPath;
        cachedLogoBase64 = cleanB64;
        resolve(cleanB64);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

export function getCachedThermalLogoDataUrl(settings: SettingsData): string {
  if (!settings.useLogo || !settings.logoPath || !settings.logoPath.trim()) {
    return '';
  }
  const key = settings.logoPath.trim();
  return cachedThermalKey === key ? cachedThermalDataUrl : '';
}

export async function getThermalLogoDataUrl(settings: SettingsData): Promise<string> {
  if (!settings.useLogo || !settings.logoPath || !settings.logoPath.trim()) {
    return '';
  }

  const key = settings.logoPath.trim();
  if (cachedThermalKey === key && cachedThermalDataUrl) {
    return cachedThermalDataUrl;
  }

  const b64 = await getLogoBase64(settings);
  if (!b64) return '';

  const srcDataUrl = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;

  if (typeof document === 'undefined') {
    return srcDataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const natW = img.naturalWidth || img.width || 120;
          const natH = img.naturalHeight || img.height || 120;
          const scale = natW > 480 ? 480 / natW : 1;
          const targetW = Math.max(1, Math.round(natW * scale));
          const targetH = Math.max(1, Math.round(natH * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(srcDataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, targetW, targetH);
          const imageData = ctx.getImageData(0, 0, targetW, targetH);
          const pixels = imageData.data;

          for (let i = 0; i < pixels.length; i += 4) {
            const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            const contrasted = Math.max(0, Math.min(255, Math.round((lum - 128) * 1.25 + 128)));
            pixels[i] = contrasted;
            pixels[i + 1] = contrasted;
            pixels[i + 2] = contrasted;
          }

          ctx.putImageData(imageData, 0, 0);
          const outUrl = canvas.toDataURL('image/png');
          cachedThermalKey = key;
          cachedThermalDataUrl = outUrl;
          resolve(outUrl);
        } catch {
          resolve(srcDataUrl);
        }
      };
      img.onerror = () => resolve(srcDataUrl);
      img.src = srcDataUrl;
    } catch {
      resolve(srcDataUrl);
    }
  });
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
