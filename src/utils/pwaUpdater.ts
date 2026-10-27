import { registerSW } from 'virtual:pwa-register';

let swRegistration: ServiceWorkerRegistration | undefined;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | undefined;
let needRefreshState = false;
const listeners = new Set<(needRefresh: boolean) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener(needRefreshState));
}

/**
 * Langganan status ketersediaan pembaruan Service Worker secara reaktif
 */
export function subscribePwaUpdate(callback: (needRefresh: boolean) => void): () => void {
  listeners.add(callback);
  callback(needRefreshState);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Inisialisasi Service Worker PWA terpusat
 */
export function initPWA() {
  if (typeof window === 'undefined') return;

  updateSWFn = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      swRegistration = registration;
      if (registration?.waiting) {
        needRefreshState = true;
        notifyListeners();
      }
    },
    onNeedRefresh() {
      needRefreshState = true;
      notifyListeners();
    },
  });
}

function waitForInstallingWorker(worker: ServiceWorker, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    if (worker.state === 'installed') {
      resolve(true);
      return;
    }
    if (worker.state === 'activated' || worker.state === 'redundant') {
      resolve(false);
      return;
    }

    const timer = window.setTimeout(() => {
      worker.removeEventListener('statechange', onStateChange);
      resolve(worker.state === 'installed');
    }, timeoutMs);

    const onStateChange = () => {
      if (worker.state === 'installed') {
        window.clearTimeout(timer);
        worker.removeEventListener('statechange', onStateChange);
        resolve(true);
      } else if (worker.state === 'redundant' || worker.state === 'activated') {
        window.clearTimeout(timer);
        worker.removeEventListener('statechange', onStateChange);
        resolve(false);
      }
    };

    worker.addEventListener('statechange', onStateChange);
  });
}

async function hasNewerServerBundle(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  try {
    // Hanya bandingkan hash bundle produksi (/assets/*.js)
    const currentScripts = Array.from(document.querySelectorAll('script[src]'))
      .map((el) => el.getAttribute('src') || '')
      .filter((src) => /\/assets\/[^"']+\.js/.test(src));

    if (currentScripts.length === 0) return false;

    const res = await fetch(`/index.html?_cb=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!res.ok) return false;

    const html = await res.text();
    const match = html.match(/src=["'](\/assets\/[^"']+\.js)["']/);
    if (!match || !match[1]) return false;

    const latestEntrySrc = match[1];
    return !currentScripts.some((src) => src.endsWith(latestEntrySrc) || src === latestEntrySrc);
  } catch {
    return false;
  }
}

/**
 * Terapkan pembaruan Service Worker & muat ulang aplikasi ke versi terbaru
 */
export async function applyAppUpdate(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem('pwa_just_updated_at', String(Date.now()));
  } catch {
    // Abaikan jika sessionStorage diblokir
  }

  // Bersihkan runtime cache statis JS/CSS agar bundle terbaru langsung dimuat (tidak menyentuh IndexedDB/localStorage)
  if ('caches' in window) {
    try {
      await caches.delete('kafelas-static-resources');
    } catch {
      // Abaikan kegagalan hapus cache opsional
    }
  }

  if ('serviceWorker' in navigator) {
    try {
      const reg = swRegistration || (await navigator.serviceWorker.getRegistration());

      let reloaded = false;
      const reloadOnce = () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true });

      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      if (updateSWFn) {
        await updateSWFn(true);
      }

      window.setTimeout(reloadOnce, 1200);
      return;
    } catch (err) {
      console.warn('Gagal mengaktifkan SW baru, memuat ulang langsung:', err);
    }
  }

  window.location.reload();
}

export interface UpdateCheckResult {
  status: 'update-available' | 'up-to-date' | 'offline' | 'error';
  hasUpdate: boolean;
  message: string;
}

/**
 * Pengecekan versi baru secara manual dari menu Pengaturan
 */
export async function checkAppUpdateManually(): Promise<UpdateCheckResult> {
  if (typeof window === 'undefined') {
    return {
      status: 'up-to-date',
      hasUpdate: false,
      message: 'Aplikasi Anda sudah berjalan pada versi terbaru.',
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      status: 'offline',
      hasUpdate: false,
      message: 'Tidak ada koneksi internet. Hubungkan jaringan untuk memeriksa pembaruan.',
    };
  }

  // Cegah loop sesaat setelah baru saja reload pembaruan (< 10 detik)
  try {
    const justUpdatedAt = Number(sessionStorage.getItem('pwa_just_updated_at') || 0);
    if (justUpdatedAt > 0 && Date.now() - justUpdatedAt < 10_000) {
      needRefreshState = false;
      notifyListeners();
      return {
        status: 'up-to-date',
        hasUpdate: false,
        message: 'Aplikasi sudah berhasil diperbarui ke versi paling terbaru!',
      };
    }
  } catch {
    // Abaikan error sessionStorage
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = swRegistration || (await navigator.serviceWorker.getRegistration());
      if (reg) {
        swRegistration = reg;

        if (reg.waiting || needRefreshState) {
          needRefreshState = true;
          notifyListeners();
          return {
            status: 'update-available',
            hasUpdate: true,
            message: 'Pembaruan aplikasi ditemukan! Memperbarui sekarang...',
          };
        }

        await reg.update();

        if (reg.installing) {
          const installed = await waitForInstallingWorker(reg.installing);
          if (installed) {
            needRefreshState = true;
            notifyListeners();
            return {
              status: 'update-available',
              hasUpdate: true,
              message: 'Pembaruan aplikasi ditemukan! Memperbarui sekarang...',
            };
          }
        }

        if (reg.waiting || needRefreshState) {
          needRefreshState = true;
          notifyListeners();
          return {
            status: 'update-available',
            hasUpdate: true,
            message: 'Pembaruan aplikasi ditemukan! Memperbarui sekarang...',
          };
        }
      }
    }

    const bundleChanged = await hasNewerServerBundle();
    if (bundleChanged) {
      needRefreshState = true;
      notifyListeners();
      return {
        status: 'update-available',
        hasUpdate: true,
        message: 'Versi baru ditemukan di server! Memperbarui sekarang...',
      };
    }

    return {
      status: 'up-to-date',
      hasUpdate: false,
      message: 'Aplikasi Anda sudah menggunakan versi paling terbaru!',
    };
  } catch (error) {
    console.warn('Pengecekan update gagal:', error);
    return {
      status: 'error',
      hasUpdate: false,
      message: 'Gagal memeriksa pembaruan. Pastikan koneksi internet stabil.',
    };
  }
}
