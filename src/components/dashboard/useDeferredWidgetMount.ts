import { useEffect, useState } from 'react';

let hasHydratedDashboardWidgetsOnce = false;

/**
 * Menunda pemasangan (mount) widget dashboard yang berat (seperti ringkasan laporan kas
 * dan grafik tren) hingga browser selesai menggambar antrean transaksi utama (First Paint),
 * sehingga di perangkat kelas bawah thread utama tetap responsif.
 */
export function useDeferredWidgetMount(timeoutMs = 120): boolean {
  const [isReady, setIsReady] = useState<boolean>(() => hasHydratedDashboardWidgetsOnce);

  useEffect(() => {
    if (hasHydratedDashboardWidgetsOnce) {
      if (!isReady) setIsReady(true);
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    let timerId: number | null = null;

    const markReady = () => {
      if (cancelled) return;
      hasHydratedDashboardWidgetsOnce = true;
      setIsReady(true);
    };

    const rafId = window.requestAnimationFrame(() => {
      const win = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      };
      if (typeof win.requestIdleCallback === 'function') {
        idleId = win.requestIdleCallback(markReady, { timeout: timeoutMs });
      } else {
        timerId = window.setTimeout(markReady, 48);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      const win = window as Window & {
        cancelIdleCallback?: (id: number) => void;
      };
      if (idleId !== null && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [isReady, timeoutMs]);

  return isReady;
}
