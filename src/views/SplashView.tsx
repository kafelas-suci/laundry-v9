import React, { useEffect } from 'react';
import { Building2 } from 'lucide-react';

interface SplashViewProps {
  onFinish: () => void;
  appName?: string;
}

export const SplashView: React.FC<SplashViewProps> = ({ onFinish, appName = "Kafela's Laundry" }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-[#800000] flex flex-col items-center justify-between p-8 text-white select-none animate-fade-in">
      <div />
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-2xl border border-white/20 flex items-center justify-center mx-auto overflow-hidden">
          <img src="/logo-kafela.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">{appName}</h1>
        <p className="text-xs text-white/80 font-medium">Sistem Manajemen Kasir & Operasional Laundry</p>
      </div>
      <div className="text-center space-y-2">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        <p className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">
          Memeriksa Data & Lisensi...
        </p>
      </div>
    </div>
  );
};
