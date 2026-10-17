import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a NotificationProvider');
  }
  return ctx;
};

export const useConfirm = (): ConfirmContextValue => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a NotificationProvider');
  }
  return ctx;
};

// Global singleton bridge so standalone helpers can also trigger toasts if needed
let globalToastRef: ToastContextValue | null = null;
export const getGlobalToast = () => globalToastRef;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toast state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Confirm state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((val: boolean) => void) | null;
  }>({
    isOpen: false,
    options: { message: '' },
    resolve: null,
  });

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { id, message, type, duration };

      // Limit max visible toasts to 3
      setToasts((prev) => [...prev.slice(-2), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toastMethods: ToastContextValue = {
    show: showToast,
    success: (msg, dur = 3000) => showToast(msg, 'success', dur),
    error: (msg, dur = 3500) => showToast(msg, 'error', dur),
    warning: (msg, dur = 3000) => showToast(msg, 'warning', dur),
    info: (msg, dur = 3000) => showToast(msg, 'info', dur),
  };

  useEffect(() => {
    globalToastRef = toastMethods;
    return () => {
      globalToastRef = null;
    };
  }, [showToast]);

  // Safe window.alert and window.confirm override to prevent browser native dialogs
  useEffect(() => {
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    window.alert = (message?: any) => {
      const str = typeof message === 'string' ? message : String(message || '');
      // Determine type based on content
      if (str.includes('✅') || str.toLowerCase().includes('berhasil') || str.toLowerCase().includes('sukses')) {
        toastMethods.success(str.replace(/^[✅\s]+/, ''));
      } else if (
        str.toLowerCase().includes('gagal') ||
        str.toLowerCase().includes('salah') ||
        str.toLowerCase().includes('tidak mencukupi') ||
        str.toLowerCase().includes('tidak ditemukan')
      ) {
        toastMethods.error(str);
      } else {
        toastMethods.warning(str);
      }
    };

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, []);

  // Confirm method
  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opt: ConfirmOptions =
        typeof options === 'string'
          ? {
              message: options,
              title: 'Konfirmasi',
              confirmText: options.toLowerCase().includes('hapus') ? 'Ya, Hapus' : 'Ya, Lanjutkan',
              cancelText: 'Batal',
              isDestructive: options.toLowerCase().includes('hapus') || options.toLowerCase().includes('reset'),
            }
          : {
              title: options.title || 'Konfirmasi',
              message: options.message,
              confirmText: options.confirmText || (options.isDestructive ? 'Ya, Hapus' : 'Ya, Lanjutkan'),
              cancelText: options.cancelText || 'Batal',
              isDestructive: options.isDestructive ?? options.message.toLowerCase().includes('hapus'),
            };

      setConfirmState({
        isOpen: true,
        options: opt,
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState({
      isOpen: false,
      options: { message: '' },
      resolve: null,
    });
  };

  return (
    <ToastContext.Provider value={toastMethods}>
      <ConfirmContext.Provider value={{ confirm }}>
        {children}

        {/* TOP-CENTER FLOATING TOASTS CONTAINER */}
        <div
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none w-[94vw] max-w-md"
        >
          {toasts.map((toast) => (
            <ToastItemComponent key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
          ))}
        </div>

        {/* CUSTOM CONFIRMATION MODAL */}
        {confirmState.isOpen && (
          <div
            className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => handleConfirmClose(false)}
          >
            <div
              className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-hidden text-center relative animate-in zoom-in-95 duration-150 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                  confirmState.options.isDestructive
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {confirmState.options.title || 'Konfirmasi Tindakan'}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {confirmState.options.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer"
                >
                  {confirmState.options.cancelText || 'Batal'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmClose(true)}
                  className={`w-full py-2.5 px-3 rounded-xl text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer ${
                    confirmState.options.isDestructive
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-[#800000] hover:bg-[#660000]'
                  }`}
                >
                  {confirmState.options.confirmText || 'Ya, Lanjutkan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
};

const ToastItemComponent: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.duration <= 0) return;
    const intervalTime = 30;
    const step = (intervalTime / toast.duration) * 100;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(interval);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [toast.duration]);

  // Color schemes
  const config = {
    success: {
      bg: 'bg-white',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-700',
      barBg: 'bg-emerald-500',
      icon: <CheckCircle2 className="w-5 h-5 shrink-0" />,
      textColor: 'text-slate-900',
    },
    error: {
      bg: 'bg-white',
      border: 'border-rose-200',
      iconBg: 'bg-rose-100 text-rose-700',
      barBg: 'bg-rose-600',
      icon: <XCircle className="w-5 h-5 shrink-0" />,
      textColor: 'text-slate-900',
    },
    warning: {
      bg: 'bg-white',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100 text-amber-700',
      barBg: 'bg-amber-500',
      icon: <AlertTriangle className="w-5 h-5 shrink-0" />,
      textColor: 'text-slate-900',
    },
    info: {
      bg: 'bg-white',
      border: 'border-sky-200',
      iconBg: 'bg-sky-100 text-sky-700',
      barBg: 'bg-sky-500',
      icon: <Info className="w-5 h-5 shrink-0" />,
      textColor: 'text-slate-900',
    },
  }[toast.type];

  return (
    <div
      role="status"
      className={`pointer-events-auto w-full relative overflow-hidden rounded-2xl ${config.bg} border ${config.border} p-3 sm:p-3.5 shadow-xl transition-all duration-200 animate-in slide-in-from-top-3 fade-in`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.iconBg}`}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <p className={`text-xs font-bold leading-snug ${config.textColor}`}>
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0 cursor-pointer"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3-Second Micro Progress Bar at the bottom */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
          <div
            className={`h-full ${config.barBg} transition-all ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
