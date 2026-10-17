import React, { useState } from 'react';
import { Sparkles, RotateCcw, UserPlus, LogOut, Info, ShieldCheck, ChevronDown } from 'lucide-react';
import { User } from '../types';
import { useConfirm, useToast } from './NotificationContext';

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
  const toast = useToast();
  const { confirm } = useConfirm();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isOwner = currentUser.role === 'owner';

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Reset Data Demo',
      message: 'Kembalikan data demo ke contoh awal? Semua transaksi uji coba yang baru Anda tambahkan akan di-reset.',
      confirmText: 'Ya, Reset Data Demo',
      isDestructive: true,
    });
    if (ok) {
      setIsResetting(true);
      onResetDemoData();
      toast.success('Data demo berhasil di-reset ke kondisi awal.');
      setTimeout(() => setIsResetting(false), 500);
    }
  };

  return null;
};
