import { registerSW } from 'virtual:pwa-register';

let swRegistration: ServiceWorkerRegistration | undefined;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | undefined;

/**
 * Inisialisasi Service Worker PWA dengan pengecekan hemat (1 hari sekali)
 */
export function initPWA() {
  if (typeof window === 'undefined') return;

  updateSWFn = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      swRegistration = registration;
      if (registration) {
        // Pengecekan otomatis hanya 1 hari sekali (24 jam = 86.400.000 ms) agar sangat hemat kuota & baterai
        setInterval(() => {
          registration.update().catch(() => {});
        }, 24 * 60 * 60 * 1000);
      }
    },
    onNeedRefresh() {
      // Saat versi baru terdeteksi, aktifkan dan muat versi terbaru
      if (updateSWFn) {
        updateSWFn(true);
      }
    },
  });
}

/**
 * Pengecekan versi baru secara manual (dipanggil dari tombol Pengaturan)
 */
export async function checkAppUpdateManually(): Promise<{ hasUpdate: boolean; message: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      hasUpdate: false,
      message: 'Browser saat ini tidak menggunakan Service Worker offline cache.',
    };
  }

  try {
    const reg = swRegistration || (await navigator.serviceWorker.getRegistration());
    if (!reg) {
      return {
        hasUpdate: false,
        message: 'Aplikasi Anda sudah berjalan pada versi terbaru!',
      };
    }

    // Minta browser memverifikasi versi terbaru ke server
    await reg.update();

    if (reg.waiting) {
      if (updateSWFn) {
        await updateSWFn(true);
      } else {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
      return {
        hasUpdate: true,
        message: 'Versi baru ditemukan! Aplikasi sedang disegarkan ke versi terbaru...',
      };
    }

    if (reg.installing) {
      return {
        hasUpdate: true,
        message: 'Versi baru sedang diunduh di latar belakang. Silakan buka kembali sesaat lagi.',
      };
    }

    return {
      hasUpdate: false,
      message: 'Aplikasi Anda sudah menggunakan versi paling terbaru!',
    };
  } catch (error) {
    console.warn('Pengecekan update gagal:', error);
    return {
      hasUpdate: false,
      message: 'Gagal menghubungi server. Pastikan koneksi internet aktif.',
    };
  }
}
