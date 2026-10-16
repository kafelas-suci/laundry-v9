import React, { useState } from 'react';
import { Sparkles, RotateCcw, UserPlus, LogOut, Info, ShieldCheck, ChevronDown } from 'lucide-react';
import { User } from '../types';

interface DemoBannerProps {
  currentUser: User;
  onResetDemoData: () => void;
  onSwitchToRealRegister: () => void;
  onExitDemo: () => void;
  onSwitchDemoRole: (role: 'owner' | 'karyawan') => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  currentUser,
  onResetDemoData,
  onSwitchToRealRegister,
  onExitDemo,
  onSwitchDemoRole,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isOwner = currentUser.role === 'owner';

  const handleReset = () => {
    if (confirm('Kembalikan data demo ke contoh awal? Semua transaksi uji coba yang baru Anda tambahkan akan di-reset.')) {
      setIsResetting(true);
      onResetDemoData();
      setTimeout(() => setIsResetting(false), 500);
    }
  };


};
