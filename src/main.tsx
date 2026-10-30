import React from 'react';
import { createRoot } from 'react-dom/client';
import App, { InitialBootData, resolveInitialLaundryId } from './App.tsx';
import './index.css';
import { initPWA, recoverFromCacheAndReload } from './utils/pwaUpdater';
import { NotificationProvider } from './components/NotificationContext';
import { StorageService } from './utils/storage';
import { IndexedDbService } from './utils/indexedDb';

declare global {
  interface Window {
    __KAFELAS_MOUNTED__?: boolean;
  }
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isRecovering: boolean;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('[Kafelas ErrorBoundary] Render crash tertangkap:', error, errorInfo);
  }

  handleHardReload = () => {
    this.setState({ isRecovering: true });
    recoverFromCacheAndReload().catch(() => {
      window.location.reload();
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-5 text-slate-800">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#800000]/10 text-[#800000] flex items-center justify-center mx-auto font-black text-xl">
              !
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-black text-slate-900">Gagal Memuat Tampilan</h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                Terjadi kendala saat menginisialisasi aplikasi pada perangkat ini. Seluruh data transaksi lokal Anda tetap aman.
              </p>
            </div>

            {this.state.errorMessage && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Detail Diagnostik
                </p>
                <p className="text-[11px] font-mono text-rose-700 break-words">
                  {this.state.errorMessage}
                </p>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={this.state.isRecovering}
                onClick={this.handleHardReload}
                className="w-full py-3 px-4 rounded-xl bg-[#800000] hover:bg-[#660000] disabled:opacity-60 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                {this.state.isRecovering
                  ? 'Menyegarkan Cache...'
                  : 'Segarkan Cache & Muat Ulang'}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Muat Ulang Biasa
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const PREHYDRATE_BUDGET_MS = 100;

async function prepareInitialBootData(): Promise<InitialBootData> {
  // 1. Inisialisasi skema dasar LocalStorage satu kali secara sinkron sebelum komponen dipasang
  StorageService.initData();
  const initialLaundryId = resolveInitialLaundryId();

  // 2. Pre-hydrate transaksi IndexedDB lokal dengan batas anggaran super singkat (~5-15ms di perangkat normal)
  //    agar render pertama React langsung memiliki data lengkap tanpa memicu re-render kedua / efek berkedip.
  const hydrationPromise = IndexedDbService.hydrateBranchTransaksi(initialLaundryId);

  const raced = await Promise.race<
    | { hydrated: true; list: Awaited<typeof hydrationPromise> }
    | { hydrated: false }
  >([
    hydrationPromise
      .then((list) => ({ hydrated: true as const, list }))
      .catch(() => ({ hydrated: true as const, list: [] })),
    new Promise<{ hydrated: false }>((resolve) => {
      window.setTimeout(() => resolve({ hydrated: false }), PREHYDRATE_BUDGET_MS);
    }),
  ]);

  if (raced.hydrated) {
    return {
      laundryId: initialLaundryId,
      transaksi: raced.list,
      hydrated: true,
    };
  }

  return {
    laundryId: initialLaundryId,
    transaksi: null,
    hydrated: false,
    pendingHydration: hydrationPromise,
  };
}

async function bootstrapApplication() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error('[Kafelas Boot] Elemen #root tidak ditemukan di DOM!');
    return;
  }

  // Tandai bundle JS aktif lebih awal agar watchdog boot tidak menganggap bundle gagal dimuat
  window.__KAFELAS_MOUNTED__ = true;
  try {
    sessionStorage.removeItem('kafelas_sw_autorecover_v2');
  } catch {
    // Abaikan jika sessionStorage dibatasi pada browser/WebView
  }

  const initialBootData = await prepareInitialBootData();

  createRoot(rootElement).render(
    <ErrorBoundary>
      <NotificationProvider>
        <App initialBootData={initialBootData} />
      </NotificationProvider>
    </ErrorBoundary>
  );

  // Inisialisasi PWA dijalankan non-blocking setelah render utama terpasang
  initPWA();
}

bootstrapApplication();
