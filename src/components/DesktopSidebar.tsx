import React, { useState } from 'react';
import {
  LayoutDashboard,
  Clock,
  Archive,
  DollarSign,
  FileText,
  Users,
  Tag,
  Building2,
  UserCheck,
  Settings as SettingsIcon,
  Plus,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
  Sparkles,
  Lock,
  Crown,
  Shirt,
  BarChart3,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { User, Laundry, Transaksi } from '../types';
import { isProTier, getLaundryLimits } from '../utils/subscription';

export type NavViewType =
  | 'splash'
  | 'auth'
  | 'dashboard'
  | 'tambah_edit'
  | 'detail_transaksi'
  | 'status_pengerjaan'
  | 'buku_kas'
  | 'laporan'
  | 'arsip'
  | 'kelola_pelanggan'
  | 'kelola_layanan'
  | 'kelola_owner'
  | 'kelola_kasir'
  | 'settings';

interface DesktopSidebarProps {
  activeView: string;
  onSelectView: (view: any) => void;
  onOpenNewTransaksi: () => void;
  onOpenAturKas: () => void;
  onOpenSwitchBranch: () => void;
  onLogout: () => void;
  currentUser: User;
  activeLaundry: Laundry;
  laundries: Laundry[];
  transaksiList: Transaksi[];
  pelangganCount: number;
  layananCount: number;
  currentTier?: string | null;
  onOpenUpgradeModal?: (reason?: string) => void;
  onOpenExpiredModal?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeView,
  onSelectView,
  onOpenNewTransaksi,
  onOpenAturKas,
  onOpenSwitchBranch,
  onLogout,
  currentUser,
  activeLaundry,
  laundries,
  transaksiList,
  pelangganCount,
  layananCount,
  currentTier,
  onOpenUpgradeModal,
  onOpenExpiredModal,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isOwner = currentUser.role === 'owner';

  // Calculate active counts for badges
  const branchTrx = transaksiList.filter((t) => t.laundryId === activeLaundry.id);
  const activeQueueCount = branchTrx.filter((t) => t.status !== 'Diambil').length;
  const inProgressCount = branchTrx.filter(
    (t) => t.status === 'Diterima' || t.status === 'Proses'
  ).length;
  const archivedCount = branchTrx.filter((t) => t.status === 'Diambil').length;

  // Subscription calculation
  const limits = getLaundryLimits(currentTier || currentUser.subscriptionType);
  const isNewcomer = limits.tier === 'newcomer';
  const subNow = Date.now();
  const subEnd = currentUser.subscriptionEndDate || (subNow + 7 * 24 * 60 * 60 * 1000);
  const subDiffMs = subEnd - subNow;
  const subSisaHari = Math.max(0, Math.ceil(subDiffMs / (1000 * 60 * 60 * 24)));
  const subIsExpired = !isNewcomer && subDiffMs <= 0;
  const subPaketNama = limits.label;

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: string | number;
    badgeColor?: string;
    isExternal?: boolean;
    href?: string;
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      title: 'Operasional Kasir',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Antrean',
          icon: LayoutDashboard,
          badge: activeQueueCount > 0 ? activeQueueCount : undefined,
          badgeColor: 'bg-rose-100 text-[#800000]',
        },
        {
          id: 'status_pengerjaan',
          label: 'Status Pengerjaan',
          icon: Shirt,
          badge: inProgressCount > 0 ? inProgressCount : undefined,
          badgeColor: 'bg-amber-100 text-amber-800',
        },
        {
          id: 'arsip',
          label: 'Arsip Diambil',
          icon: Archive,
          badge: archivedCount > 0 ? archivedCount : undefined,
          badgeColor: 'bg-slate-100 text-slate-600',
        },
      ],
    },
    {
      title: 'Keuangan & Analitik',
      items: [
        {
          id: 'buku_kas',
          label: 'Buku Kas Harian',
          icon: Wallet,
        },
        ...(isOwner
          ? [
              {
                id: 'laporan',
                label: 'Laporan Keuangan',
                icon: BarChart3,
              },
            ]
          : []),
      ],
    },
    ...(isOwner
      ? [
          {
            title: 'Master Data & Outlet',
            items: [
              {
                id: 'kelola_pelanggan',
                label: 'Data Pelanggan',
                icon: Users,
                badge: pelangganCount > 0 ? pelangganCount : undefined,
                badgeColor: 'bg-slate-100 text-slate-600',
              },
              {
                id: 'kelola_layanan',
                label: 'Harga Layanan',
                icon: Tag,
                badge: layananCount > 0 ? layananCount : undefined,
                badgeColor: 'bg-slate-100 text-slate-600',
              },
              {
                id: 'kelola_kasir',
                label: 'Kelola Kasir / Staf',
                icon: UserCheck,
              },
              {
                id: 'kelola_owner',
                label: 'Owner & Cabang',
                icon: Building2,
                badge: laundries.length > 1 ? `${laundries.length}` : undefined,
                badgeColor: 'bg-emerald-100 text-emerald-800',
              },
            ],
          },
        ]
      : []),
    {
      title: 'Sistem & Publik',
      items: [
        {
          id: 'settings',
          label: 'Pengaturan Laundry',
          icon: SettingsIcon,
        },
        {
          id: 'landing_link',
          label: 'Web Profil',
          icon: Globe,
          isExternal: true,
          href: '/landing.html',
        },
        {
          id: 'tutorial_link',
          label: 'Tutorial Garis Penunjuk',
          icon: HelpCircle,
          isExternal: true,
          href: '/tutorial.html',
        },
      ],
    },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-[76px]' : 'w-64'
      } shrink-0 h-screen bg-white border-r border-slate-200/90 flex flex-col justify-between transition-all duration-200 select-none z-40 shadow-xs`}
    >
      {/* 1. TOP BRAND & ACTIVE BRANCH SWITCHER */}
      <div>
        <div className="h-16 px-3.5 bg-[#800000] text-white flex items-center justify-between gap-2 border-b border-white/10">
          {!collapsed && (
            <button
              type="button"
              onClick={laundries.length > 1 ? onOpenSwitchBranch : () => onSelectView('dashboard')}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left py-1 px-1.5 rounded-xl hover:bg-white/10 transition group"
              title={laundries.length > 1 ? 'Klik untuk ganti cabang laundry' : (typeof activeLaundry.namaLaundry === 'object' ? (activeLaundry.namaLaundry as any)?.namaLaundry || "Kafela's Laundry" : activeLaundry.namaLaundry)}
            >
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-black text-sm tracking-tight truncate text-white">
                    {typeof activeLaundry.namaLaundry === 'object' ? (activeLaundry.namaLaundry as any)?.namaLaundry || "Kafela's Laundry" : (activeLaundry.namaLaundry || "Kafela's Laundry")}
                  </span>
                  {laundries.length > 1 && (
                    <ChevronDown className="w-3.5 h-3.5 text-white/80 shrink-0 group-hover:translate-y-0.5 transition-transform" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-rose-100/90 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate">
                    {laundries.length > 1 ? `${laundries.length} Cabang Terhubung` : 'Cabang Utama Aktif'}
                  </span>
                </div>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Perluas Sidebar' : 'Perkecil Sidebar'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white/85 hover:text-white hover:bg-white/15 transition ${
              collapsed ? 'mx-auto' : 'shrink-0'
            }`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. PRIMARY QUICK ACTIONS (+ Transaksi Baru & Catat Kas) */}
        <div className="p-3 border-b border-slate-100 space-y-2">
          {activeQueueCount >= 400 ? (
            <button
              type="button"
              onClick={onOpenNewTransaksi}
              title="Transaksi Baru Terkunci (Capai 400+ Pesanan). Klik untuk kelola arsip."
              className={`w-full rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-xs bg-red-600 hover:bg-red-700 text-white ${
                collapsed ? 'h-10 px-0' : 'py-2.5 px-3'
              }`}
            >
              <Lock className="w-4 h-4 shrink-0 text-white" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Transaksi Baru</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-black">
                    Terkunci
                  </span>
                </div>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenNewTransaksi}
              title={
                activeQueueCount >= 300
                  ? 'Peringatan: 300+ pesanan aktif belum diambil'
                  : 'Buat Transaksi Baru'
              }
              className={`w-full rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-xs ${
                activeView === 'tambah_edit'
                  ? 'bg-[#660000] text-white ring-2 ring-rose-200'
                  : activeQueueCount >= 300
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-[#800000] hover:bg-[#660000] text-white'
              } ${collapsed ? 'h-10 px-0' : 'py-2.5 px-3.5'}`}
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Transaksi Baru</span>
                  {activeQueueCount >= 300 && (
                    <span className="text-[10px] bg-amber-800 text-amber-100 px-1.5 py-0.5 rounded font-black">
                      300+
                    </span>
                  )}
                </div>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAturKas}
            title="Catat Pemasukan / Pengeluaran Kas"
            className={`w-full rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-2xs ${
              collapsed ? 'h-10 px-0' : 'py-2 px-3.5'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {!collapsed && <span>Catat Kas Harian</span>}
          </button>
        </div>
      </div>

      {/* 3. NAVIGATION GROUPS */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeView === item.id ||
                  (item.id === 'dashboard' && activeView === 'detail_transaksi');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if ((item as any).isExternal && (item as any).href) {
                        window.open((item as any).href, '_blank');
                        return;
                      }
                      if (
                        (item.id === 'kelola_kasir' ||
                          item.id === 'kelola_owner' ||
                          item.id === 'kelola_pelanggan' ||
                          item.id === 'kelola_layanan' ||
                          item.id === 'laporan') &&
                        currentUser.role !== 'owner'
                      ) {
                        return;
                      }
                      onSelectView(item.id as NavViewType);
                    }}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      collapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2'
                    } rounded-xl text-xs font-bold transition-all group relative ${
                      isActive
                        ? 'bg-rose-50/90 text-[#800000] border border-rose-200/80 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#800000]'
                            : 'text-slate-400 group-hover:text-slate-700'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                          isActive
                            ? 'bg-[#800000] text-white'
                            : item.badgeColor || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 4. USER PROFILE & LOGOUT FOOTER */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70">
        {!collapsed && (
          <div
            onClick={() => {
              if (subIsExpired && onOpenExpiredModal) {
                onOpenExpiredModal();
              } else if (onOpenUpgradeModal) {
                onOpenUpgradeModal();
              } else {
                onSelectView('kelola_owner');
              }
            }}
            title={
              isNewcomer
                ? `Paket Langganan: ${subPaketNama} • Gratis . Klik untuk lihat detail & komparasi paket.`
                : `Paket Langganan: ${subPaketNama} • Sisa ${subSisaHari} Hari. Klik untuk lihat detail & komparasi paket.`
            }
            className="mb-2.5 p-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 shadow-2xs cursor-pointer hover:border-amber-300 transition active:scale-98"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-600 shrink-0" />
                {subPaketNama}
              </span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  isNewcomer
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/60'
                    : subIsExpired
                    ? 'bg-red-200 text-red-900'
                    : 'bg-amber-200 text-amber-950'
                }`}
              >
                {isNewcomer ? 'Gratis' : subIsExpired ? 'Habis' : `${subSisaHari} Hari`}
              </span>
            </div>
          </div>
        )}

        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectView('kelola_owner')}
              title={isNewcomer ? `${subPaketNama} • Gratis. Klik untuk kelola.` : `${subPaketNama} • Sisa ${subSisaHari} Hari. Klik untuk kelola.`}
              className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center justify-center transition hover:bg-amber-200 active:scale-95 cursor-pointer shadow-2xs"
            >
              <Crown className="w-4 h-4 text-amber-700" />
            </button>
            <div
              className="w-9 h-9 rounded-xl bg-[#800000] text-white font-black text-xs flex items-center justify-center uppercase shadow-2xs"
              title={`${currentUser.displayName} (${isOwner ? 'Owner' : 'Kasir'})`}
            >
              {(currentUser.displayName || 'U').slice(0, 2)}
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title="Keluar Akun"
              className="w-9 h-9 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#800000] text-white font-black text-xs flex items-center justify-center uppercase shrink-0 shadow-2xs">
                {(currentUser.displayName || 'U').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 truncate">
                  {typeof currentUser.displayName === 'object' ? (currentUser.displayName as any)?.displayName || (currentUser.displayName as any)?.namaLaundry || 'Owner' : (currentUser.displayName || 'Owner')}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                  <span className="capitalize">{isOwner ? 'Owner Utama' : 'Kasir Cabang'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title="Keluar Akun"
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0 cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Desktop Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">Keluar dari Akun?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin keluar dari akun? Anda perlu memasukkan email & kata sandi untuk masuk kembali.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
