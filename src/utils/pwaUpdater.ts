import { registerSW } from 'virtual:pwa-register';

let swRegistration: ServiceWorkerRegistration | undefined;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | undefined;

/**
 * Inisialisasi Service Worker PWA tanpa auto-reload atau background interval
 */
export function initPWA() {
  if (typeof window === 'undefined') return;

  updateSWFn = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      swRegistration = registration;
    },
    onNeedRefresh() {
      // Tidak melakukan auto-reload otomatis sesuai permintaan pengguna
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

    await reg.update();

    if (reg.waiting) {
      return {
        hasUpdate: true,
        message: 'Versi baru tersedia. Silakan refresh halaman jika ingin memperbarui.',
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
