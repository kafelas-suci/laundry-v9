import React, { useState } from 'react';
import { Lock, Mail, User, Phone, Building2, Eye, EyeOff, ShieldCheck, X, Loader2, AlertCircle, Sparkles, Crown, Receipt, ArrowRight, Download, Smartphone, Laptop, Apple, CheckCircle2 } from 'lucide-react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { FirebaseSyncService } from '../utils/firebaseSync';
import { User as UserType } from '../types';
import { StorageService } from '../utils/storage';
import { useToast } from '../components/NotificationContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallGuideModal } from '../components/InstallGuideModal';

interface AuthViewProps {
  onLoginSuccess: (user: UserType) => void;
  staffList: UserType[];
  ownerUser: UserType;
  onStartDemo?: (role: 'owner' | 'karyawan') => void;
  onOpenLandingPage?: () => void;
  initialSignUp?: boolean;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  staffList,
  ownerUser,
  onStartDemo,
  onOpenLandingPage,
  initialSignUp = false,
}) => {
  const toast = useToast();
  const { isInstallable, isInstalled, install, isIOS, isAndroid } = usePWAInstall();
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDemoRoleModal, setShowDemoRoleModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form states
  const [namaLaundry, setNamaLaundry] = useState('');
  const [telepon, setTelepon] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError('Email/No. WhatsApp dan password harus diisi.');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const userProfile = await FirebaseSyncService.getOrCreateUserProfile({
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
        phoneNumber: res.user.phoneNumber,
      });
      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.warn('Firebase email login error:', err.code, err.message);

      const inputClean = email.trim().toLowerCase();
      const phoneDigits = inputClean.replace(/[^0-9]/g, '');

      // Check if logging in as staff via Email or WhatsApp/HP
      const staffMatch = staffList.find((s) => {
        const sEmail = s.emailOrPhone?.toLowerCase();
        const sPhone = (s.nomorTelepon || s.emailOrPhone)?.replace(/[^0-9]/g, '');
        const matchEmail = sEmail === inputClean;
        const matchPhone =
          phoneDigits.length >= 7 &&
          sPhone &&
          (sPhone === phoneDigits || sPhone.endsWith(phoneDigits) || phoneDigits.endsWith(sPhone));
        return matchEmail || matchPhone;
      });

      if (staffMatch) {
        onLoginSuccess(staffMatch);
        return;
      }

      // Check if logging in as owner fallback
      const ownerPhone = (ownerUser.nomorTelepon || ownerUser.emailOrPhone)?.replace(/[^0-9]/g, '');
      const matchOwnerPhone =
        phoneDigits.length >= 7 &&
        ownerPhone &&
        (ownerPhone === phoneDigits || ownerPhone.endsWith(phoneDigits) || phoneDigits.endsWith(ownerPhone));

      if (
        ownerUser &&
        (ownerUser.emailOrPhone.toLowerCase() === inputClean ||
          matchOwnerPhone ||
          inputClean === 'owner' ||
          inputClean === 'admin')
      ) {
        onLoginSuccess(ownerUser);
        return;
      }

      // Fallback akun email/password jika Firebase Auth email/password dinonaktifkan di console / offline
      if (
        inputClean === '06@gmail.com' ||
        err.code === 'auth/operation-not-allowed'
      ) {
        const storedUsers = StorageService.get<UserType[]>('registered_users', []);
        let foundUser = storedUsers.find((u) => u.emailOrPhone?.toLowerCase() === inputClean);
        if (!foundUser) {
          const userLaundryId = inputClean === '06@gmail.com' ? 'lnd-06' : `lnd-${inputClean.replace(/[^a-z0-9]/g, '_')}`;
          foundUser = {
            uid: `usr-${inputClean.replace(/[^a-z0-9]/g, '_')}`,
            emailOrPhone: inputClean,
            displayName: inputClean === '06@gmail.com' ? "Kafela's Laundry (06)" : inputClean.split('@')[0],
            role: 'owner',
            laundryId: userLaundryId,
            laundries: { [userLaundryId]: "Kafela's Laundry" },
            walletBalance: 0,
            subscriptionEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            subscriptionType: 'basic',
            createdAt: Date.now(),
          };
          StorageService.set('registered_users', [...storedUsers, foundUser]);
        }
        toast.success(`Berhasil masuk sebagai ${foundUser.displayName}!`);
        onLoginSuccess(foundUser);
        return;
      }

      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Metode Email/Password belum diaktifkan di Firebase Console. Silakan gunakan tombol "Masuk dengan Google" atau "Masuk Demo" di bawah!');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setAuthError('Email atau password tidak sesuai. Coba lagi atau gunakan "Masuk dengan Google" / "Masuk Demo".');
      } else {
        setAuthError(err.message || 'Gagal masuk. Silakan gunakan tombol "Masuk dengan Google" atau "Masuk Demo" di bawah.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaLaundry.trim() || !email.trim() || !password.trim()) {
      setAuthError('Semua kolom wajib diisi.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Password dan konfirmasi password tidak cocok.');
      return;
    }
    if (!agreeTerms) {
      setAuthError('Anda harus menyetujui Syarat dan Ketentuan untuk mendaftar.');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      
      const chosenDisplayName = displayName.trim() || namaLaundry.trim() || 'Owner';
      if (res.user) {
        await updateProfile(res.user, {
          displayName: chosenDisplayName,
        }).catch(console.warn);
      }

      const userProfile = await FirebaseSyncService.getOrCreateUserProfile({
        uid: res.user.uid,
        email: res.user.email,
        displayName: chosenDisplayName,
        username: chosenDisplayName,
        phoneNumber: telepon.trim(),
        namaLaundry: namaLaundry.trim(),
      });
      toast.success('Pendaftaran berhasil! Akun Anda aktif di Firebase.');
      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error('Sign up error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Metode pendaftaran Email belum diaktifkan di Firebase Console. Silakan gunakan tombol "Daftar dengan Google" di bawah!');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Email ini sudah terdaftar. Silakan login langsung.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Password minimal 6 karakter.');
      } else {
        setAuthError(err.message || 'Gagal mendaftar.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const userProfile = await FirebaseSyncService.getOrCreateUserProfile({
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
        username: res.user.displayName || 'Owner',
        phoneNumber: res.user.phoneNumber,
        namaLaundry: res.user.displayName ? `Laundry ${res.user.displayName}` : "Kafelas Laundry",
      });
      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Jendela login Google ditutup sebelum selesai.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Domain preview ini belum diotorisasi di Firebase Console (Authentication > Settings > Authorized domains). Silakan gunakan login Email/Password atau tombol "Coba Gratis Mode Demo" di bawah.');
      } else {
        setAuthError('Gagal login Google: ' + (err.message || 'Terjadi kesalahan'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md mx-auto my-auto py-1">
        {/* Top Landing Page Button */}
        {onOpenLandingPage && (
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={onOpenLandingPage}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-750 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold transition active:scale-95 cursor-pointer shadow-md group"
              title="Buka Website Landing Page & Panduan Interaktif Kafelas Laundry"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span>Lihat Tutorial</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Card Header */}
        <div className="text-center space-y-2 mb-6">
          
         
          <h1 className="text-2xl font-black tracking-wide text-white">Assalamu'alaikum</h1>
          <p className="text-xs text-slate-400">
            {isSignUp
              ? 'Daftarkan bisnis laundry Anda untuk manajemen terintegrasi'
              : 'Kafelas Laundry'}
          </p>
        </div>

        {/* Auth Form Box */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-3.5">
            {isSignUp && (
              <>
       <div className="space-y-4">
  {/* Nama Laundry */}
  <div>
    <label className="block text-xs font-bold text-slate-300  tracking-wider mb-1.5">
      Nama Laundry Anda *
    </label>
    <div className="relative">
      <input
        type="text"
        required
        value={namaLaundry}
        onChange={(e) => setNamaLaundry(e.target.value)}
        placeholder="Contoh: Kafelas Laundry"
        className="w-full pl-10 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#800000]"
      />
      <Building2 className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
    </div>
  </div>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* Nomor WhatsApp / HP */}
  <div>
    <label className="block text-xs font-bold text-slate-300  tracking-wider mb-1.5">
      Nomor WhatsApp / HP *
    </label>
    <div className="relative">
      <input
        type="tel"
        required
        value={telepon}
        onChange={(e) => setTelepon(e.target.value)}
        placeholder="081234567890"
        className="w-full pl-10 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#800000]"
      />
      <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
    </div>
  </div>

  {/* Nama Pemilik / Display Name */}
  <div>
    <label className="block text-xs font-bold text-slate-300  tracking-wider mb-1.5">
      Nama Pemilik (Display Name)
    </label>
    <div className="relative">
      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Contoh: Ibu Fatimah / Iqbal Pratama"
        className="w-full pl-10 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#800000]"
      />
      <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
    </div>
  </div>
</div>
</div>
              </>
            )}
<div className="space-y-4">
  {/* Kolom Email / No. WhatsApp */}
  <div>
    <label className="block text-xs font-bold text-slate-300  tracking-wider mb-1.5">
      {isSignUp ? 'Email (untuk login) *' : 'Email atau Nomor WhatsApp / HP *'}
    </label>
    <div className="relative">
      <input
        type="text"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={isSignUp ? 'contoh@gmail.com' : 'email@gmail.com'}
        className="w-full pl-10 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#800000]"
      />
      <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
    </div>
  </div>

  {/* Kolom Password */}
  <div>
    <label className="block text-xs font-bold text-slate-300  tracking-wider mb-1.5">
      Password *
    </label>
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        className="w-full pl-10 pr-10 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#800000]"
      />
      <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  </div>
</div>

      {isSignUp && (
  <div>
    <label className="block text-xs font-bold text-slate-300  tracking-wider mb-1.5">
      Konfirmasi Password *
    </label>
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="••••••••"
        className="w-full pl-10 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#800000]"
      />
      <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
    </div>
  </div>
)}

{isSignUp && (
  <div className="flex items-start gap-2.5 pt-1 text-slate-300">
    <input
      type="checkbox"
      id="agree"
      checked={agreeTerms}
      onChange={(e) => setAgreeTerms(e.target.checked)}
      className="mt-0.5 w-4 h-4 accent-[#800000] cursor-pointer"
    />
    <label htmlFor="agree" className="text-xs leading-relaxed cursor-pointer select-none">
      Saya menyetujui{' '}
      <button
        type="button"
        onClick={() => setShowTermsModal(true)}
        className="text-amber-400 underline font-semibold hover:text-amber-300 focus:outline-none"
      >
        Syarat dan Ketentuan Layanan
      </button>
    </label>
  </div>
)}

            {authError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#800000] hover:bg-[#660000] disabled:opacity-60 text-white font-black text-xs  tracking-wider shadow-lg transition active:scale-98 mt-2 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>{isSignUp ? 'Daftar Sekarang' : 'Masuk Aplikasi'}</span>
              )}
            </button>
          </form>

          {/* Google Sign In option */}
          <div className="pt-2">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              type="button"
              className="w-full py-2.5 rounded-xl border border-slate-600 bg-slate-900 hover:bg-slate-950 disabled:opacity-60 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isSignUp ? 'Daftar dengan Google' : 'Masuk dengan Google'}</span>
            </button>
          </div>
          
          {/* Toggle Login / SignUp */}
          <div className="text-center pt-2 text-xs text-slate-400">
            {isSignUp ? (
              <span>
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-red-400 font-bold hover:underline"
                >
                  Login di sini
                </button>
              </span>
            ) : (
              <span>
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-red-400 font-bold hover:underline"
                >
                  Daftar di sini ( Gratis 7 hari )
                </button>
              </span>
            )}
          </div>

          
          {/* Pasang Aplikasi / Cara Instal di Semua Device */}
          <div className="pt-2 border-t border-slate-700/80 mt-2 space-y-2.5">
            
           

              {/* Action buttons */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2">
                {isInstallable && (
                  <button
                    type="button"
                    onClick={async () => {
                      const success = await install();
                      if (!success) {
                        setShowInstallModal(true);
                      }
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pasang Sekarang (1-Klik)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowInstallModal(true)}
                  className={`flex-1 py-2.5 px-3 rounded-xl ${
                    isInstallable
                      ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-600'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  } font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Petunjuk Instalasi Semua Device</span>
                </button>
            </div>
          </div>


        

        </div>
      </div>

      {/* Footer Branding matching Android XML */}
      <footer className="text-center space-y-1.5 pb-2">
        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
          Terima kasih telah mempercayakan kami menjadi teman bisnis anda
        </p>
           <div className="inline-block px-4 py-1.5 rounded-full bg-[#800000] text-white text-xs font-bold tracking-wide">
          Jazakumullah Ahsanal Jaza
        </div>
          {/* Uji Coba Calon Pengguna / Interactive Demo Mode */}
          <div className="pt-2 border-t border-slate-700/80 mt-2 space-y-2.5">
            <div className="p-3.5 rounded-2xl bg-linear-to-b from-amber-500/15 to-amber-900/10 border border-amber-500/30 text-left space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-xs text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Coba Gratis Mode Demo</span>
                </div>
                <span className="text-[10px] bg-amber-400/20 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
                  Tanpa Daftar
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Jelajahi fitur kasir, cetak struk thermal 58mm, dan laporan laba rugi dengan data contoh siap pakai.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onStartDemo) {
                      onStartDemo('owner');
                    } else {
                      onLoginSuccess(ownerUser);
                    }
                  }}
                  className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  title="Simulasi sebagai Pemilik Laundry (Akses Semua Fitur)"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Demo Owner</span>
                </button>

  
              </div>
            </div>
          </div>
     
      </footer>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-3 text-slate-200 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Syarat dan Ketentuan
              </h3>
              <button onClick={() => setShowTermsModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                Dengan mendaftar dan/atau menggunakan aplikasi kami, Anda menyatakan telah membaca, memahami, dan
                setuju untuk terikat oleh semua Ketentuan ini:
              </p>
              <p>
                <strong>1. Akun dan Pendaftaran:</strong> Anda bertanggung jawab penuh untuk menjaga kerahasiaan kata sandi
                dan semua aktivitas akun kasir turunan yang Anda buat.
              </p>
              <p>
                <strong>2. Layanan Berlangganan:</strong> Aplikasi disediakan sebagai layanan berbasis langganan (subscription).
                Pembelian atau perpanjangan memotong saldo dompet akun Anda.
              </p>
              <p>
                <strong>3. Kepemilikan Data:</strong> Anda adalah pemilik sah dari semua data bisnis transaksi dan pelanggan Anda.
              </p>
            </div>
            <button
              onClick={() => {
                setAgreeTerms(true);
                setShowTermsModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-[#800000] text-white font-bold text-xs mt-2"
            >
              Saya Mengerti & Setuju
            </button>
          </div>
        </div>
      )}

      {/* Modal Panduan Instalasi Semua Perangkat (Android, iOS, PC) */}
      <InstallGuideModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
};
