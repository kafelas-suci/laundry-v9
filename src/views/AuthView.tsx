import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Download,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  LogIn,
  UserPlus,
  Store,
  Shirt,
} from 'lucide-react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { FirebaseSyncService } from '../utils/firebaseSync';
import { User as UserType } from '../types';
import { useToast } from '../components/NotificationContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallGuideModal } from '../components/InstallGuideModal';

interface AuthViewProps {
  onLoginSuccess: (user: UserType) => void | Promise<void>;
  staffList: UserType[];
  ownerUser: UserType;
  onOpenLandingPage?: () => void;
  initialSignUp?: boolean;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  staffList,
  ownerUser,
  onOpenLandingPage,
  initialSignUp = false,
}) => {
  const toast = useToast();
  const { isInstallable, install } = usePWAInstall();
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [logoLoadError, setLogoLoadError] = useState(false);

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
      setAuthError('Email/No. WhatsApp dan kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);
    setAuthError(null);
    FirebaseSyncService.beginAuthFlow();

    try {
      const rawIdentifier = email.trim();
      const primaryAuthEmail = FirebaseSyncService.resolveCashierAuthEmail(rawIdentifier);
      let res;

      try {
        res = await signInWithEmailAndPassword(auth, primaryAuthEmail, password.trim());
      } catch (firstErr: any) {
        const rawDigits = rawIdentifier.replace(/[^0-9]/g, '');
        const legacyFallbackEmail = !rawIdentifier.includes('@') && rawDigits ? `${rawDigits}@kafelas.app` : '';
        if (
          legacyFallbackEmail &&
          legacyFallbackEmail !== primaryAuthEmail &&
          (firstErr?.code === 'auth/user-not-found' || firstErr?.code === 'auth/invalid-credential')
        ) {
          res = await signInWithEmailAndPassword(auth, legacyFallbackEmail, password.trim());
        } else {
          throw firstErr;
        }
      }

      const userProfile = await FirebaseSyncService.getOrCreateUserProfile({
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
        phoneNumber: res.user.phoneNumber,
      });

      if (userProfile.role === 'admin' || userProfile.role === 'karyawan') {
        toast.success(`Berhasil masuk sebagai kasir ${userProfile.displayName}`);
      }
      await onLoginSuccess(userProfile);
    } catch (err: any) {
      if (err?.code === 'CASHIER_REVOKED') {
        await auth.signOut().catch(() => undefined);
        setAuthError(err.message || 'Akses akun kasir ini telah dinonaktifkan oleh Owner.');
        return;
      }

      console.warn('Firebase email login error:', err.code, err.message);

      if (err.code === 'auth/operation-not-allowed') {
        setAuthError(
          'Metode login Email/Password belum diaktifkan di Firebase Console. Silakan gunakan tombol "Masuk dengan Akun Google" di bawah.'
        );
      } else if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password'
      ) {
        setAuthError('Email/WhatsApp belum terdaftar atau kata sandi tidak cocok. Silakan periksa kembali.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('Format alamat email atau nomor WhatsApp tidak valid.');
      } else if (err.code === 'auth/too-many-requests') {
        setAuthError('Akses diblokir sementara karena terlalu banyak percobaan gagal. Coba beberapa saat lagi.');
      } else {
        setAuthError(err.message || 'Gagal masuk. Pastikan akun sudah terdaftar.');
      }
    } finally {
      FirebaseSyncService.endAuthFlow();
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLaundryName = namaLaundry.trim();
    const cleanPhone = telepon.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanLaundryName || !cleanPhone || !cleanEmail || !cleanPassword) {
      setAuthError('Semua kolom bertanda bintang (*) wajib diisi (termasuk Nama Laundry & No. WhatsApp).');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Kata sandi dan konfirmasi kata sandi tidak cocok.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (!agreeTerms) {
      setAuthError('Anda harus menyetujui Syarat dan Ketentuan untuk mendaftar.');
      return;
    }

    const chosenDisplayName = displayName.trim() || cleanLaundryName;

    setIsLoading(true);
    setAuthError(null);
    FirebaseSyncService.beginAuthFlow({
      namaLaundry: cleanLaundryName,
      phoneNumber: cleanPhone,
      displayName: chosenDisplayName,
      email: cleanEmail,
    });

    try {
      const res = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);

      if (res.user) {
        await updateProfile(res.user, {
          displayName: chosenDisplayName,
        }).catch(console.warn);
      }

      const userProfile = await FirebaseSyncService.getOrCreateUserProfile({
        uid: res.user.uid,
        email: res.user.email || cleanEmail,
        displayName: chosenDisplayName,
        username: chosenDisplayName,
        phoneNumber: cleanPhone,
        namaLaundry: cleanLaundryName,
        isSignUp: true,
      });
      toast.success('Pendaftaran berhasil! Akun Anda siap digunakan.');
      await onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error('Sign up error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Metode pendaftaran Email belum diaktifkan di Firebase Console.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Email ini sudah terdaftar. Silakan langsung masuk pada tab Masuk Akun.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Kata sandi terlalu pendek. Gunakan minimal 6 karakter.');
      } else {
        setAuthError(err.message || 'Gagal mendaftar. Silakan coba lagi.');
      }
    } finally {
      FirebaseSyncService.endAuthFlow();
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);

    const typedLaundryName = namaLaundry.trim();
    const typedPhone = telepon.trim();
    const typedOwnerName = displayName.trim();

    FirebaseSyncService.beginAuthFlow(
      typedLaundryName || typedPhone || typedOwnerName
        ? {
            namaLaundry: typedLaundryName || undefined,
            phoneNumber: typedPhone || undefined,
            displayName: typedOwnerName || undefined,
          }
        : undefined
    );

    try {
      const res = await signInWithPopup(auth, googleProvider);
      const resolvedOwnerName = typedOwnerName || res.user.displayName || 'Owner';
      const resolvedLaundryName =
        typedLaundryName || (res.user.displayName ? `Laundry ${res.user.displayName}` : "Kafela's Laundry");
      const resolvedPhone = typedPhone || res.user.phoneNumber || '';

      const userProfile = await FirebaseSyncService.getOrCreateUserProfile({
        uid: res.user.uid,
        email: res.user.email,
        displayName: resolvedOwnerName,
        username: resolvedOwnerName,
        phoneNumber: resolvedPhone,
        namaLaundry: resolvedLaundryName,
      });
      await onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Jendela login Google ditutup sebelum proses selesai.');
      } else {
        setAuthError('Gagal login Google: ' + (err.message || 'Terjadi kendala jaringan'));
      }
    } finally {
      FirebaseSyncService.endAuthFlow();
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-[#800000]/10 selection:text-[#800000]">
      {/* Top Navigation Bar */}
      <header className=" w-full border-b border-slate-100 bg-[#800000] backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 ml-4">
           
            <div className="flex flex-col">
              <span className="text-xm sm:text-sm font-bold text-white leading-none">
                Kafelas Laundry
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                Sistem Laundry Profesional
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
 <a
  href="/tutorial.html"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 shadow-sm hover:from-amber-600 hover:to-yellow-500 transition-all"
>
  <Sparkles className="w-3.5 h-3.5 text-slate-900" />
  <span className="sm:inline">Tutorial</span>
</a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 pt-6 pb-0 sm:py-5">
        <div className="w-full max-w-[440px] space-y-1">
          {/* Header Brand Section */}
          <div className="text-center space-y-3">
         

            <div>
              <p className="text-[18px] pt-4 pb-8 tracking-wider font-bold text-[#800000]">
                Assalamu'alaikum 
              </p>
              
           
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 sm:p-7 shadow-xs space-y-4">
            {/* Segmented Switcher (Masuk / Daftar) */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setAuthError(null);
                }}
                className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !isSignUp
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-[#800000]" />
                <span>Masuk Akun</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setAuthError(null);
                }}
                className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSignUp
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-[#800000]" />
                <span>Daftar Baru</span>
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
              {/* Login Helper Notice */}
             

              {/* Extra SignUp Fields */}
              {isSignUp && (
                <div className="space-y-3.5">
                  {/* Nama Laundry */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Nama Laundry <span className="text-[#800000]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={namaLaundry}
                        onChange={(e) => setNamaLaundry(e.target.value)}
                        placeholder="Contoh: Kafelas Laundry"
                        className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800000] focus:ring-3 focus:ring-[#800000]/10 transition-colors"
                      />
                    </div>
                  </div>

                  {/* WhatsApp & Nama Pemilik Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        No. WhatsApp <span className="text-[#800000]">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={telepon}
                          onChange={(e) => setTelepon(e.target.value)}
                          placeholder="08123456789"
                          className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800000] focus:ring-3 focus:ring-[#800000]/10 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Nama Pemilik
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Nama Anda"
                          className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800000] focus:ring-3 focus:ring-[#800000]/10 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Email / Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {isSignUp ? (
                    <>
                      Alamat Email <span className="text-[#800000]">*</span>
                    </>
                  ) : (
                    <>
                      Email atau No. WhatsApp <span className="text-[#800000]">*</span>
                    </>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      isSignUp
                        ? 'nama@email.com'
                        : 'email@gmail.com atau 08123456789'
                    }
                    className="w-full pl-10 pr-4 h-11 bg-white border  rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800000] focus:ring-3 focus:ring-[#800000]/10 transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Kata Sandi <span className="text-[#800000]">*</span>
                  </label>
                  {!isSignUp && (
                    <span className="text-[11px] text-slate-400">Min. 6 karakter</span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-10 pr-10 h-11 bg-white border  rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800000] focus:ring-3 focus:ring-[#800000]/10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Kata Sandi (Daftar Baru) */}
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Konfirmasi Kata Sandi <span className="text-[#800000]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi"
                      className="w-full pl-10 pr-10 h-11 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#800000] focus:ring-3 focus:ring-[#800000]/10 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi sandi' : 'Tampilkan konfirmasi sandi'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Terms & Conditions Checkbox */}
              {isSignUp && (
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="agree"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#800000] rounded cursor-pointer"
                  />
                  <label htmlFor="agree" className="text-xs text-slate-600 leading-snug cursor-pointer select-none">
                    Saya menyetujui{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-[#800000] font-semibold underline underline-offset-2 hover:text-[#660000]"
                    >
                      Syarat & Ketentuan Layanan
                    </button>
                  </label>
                </div>
              )}

              {/* Error Notice */}
              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#800000] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{authError}</span>
                </div>
              )}

              {/* Login/Signup Primary Button with Strong Visual Identity (#800000) */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-[#800000] hover:bg-[#680000] active:bg-[#550000] text-white font-bold text-sm tracking-wide shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUp ? 'Daftarkan Laundry Saya' : 'Masuk ke Aplikasi'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Separator Divider */}
            <div className="relative flex items-center justify-center pt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative px-3 bg-white text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                atau
              </span>
            </div>

            {/* Google Authentication Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              type="button"
              className="w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>{isSignUp ? 'Daftar dengan Akun Google' : 'Masuk dengan Akun Google'}</span>
            </button>

            {/* PWA Direct Installation Card */}
           <div className="p border-t border-slate-100">
  <div className="">
      {/* Tombol Petunjuk Pasang */}
      <button
        type="button"
        onClick={() => setShowInstallModal(true)}
        className="w-full h-9 px-3  text-slate-700 font-semibold text-xs flex items-center justify-center gap-2  cursor-pointer "
      >
        <div className="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center text-[#800000] shrink-0">
          <Smartphone className="w-3.5 h-3.5" />
        </div>
        <span>Petunjuk Pasang Aplikasi Kasir</span>
      </button>

      {/* Tombol Install Langsung (Muncul jika tersedia) */}
      {isInstallable && (
        <button
          type="button"
          onClick={async () => {
            const success = await install();
            if (!success) {
              setShowInstallModal(true);
            }
          }}
          className="w-full h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
        >
          <div className="w-6 h-6 rounded-md bg-emerald-500/30 flex items-center justify-center text-white shrink-0">
            <Download className="w-3.5 h-3.5" />
          </div>
          <span>Pasang Aplikasi (1-Klik)</span>
        </button>
      )}
  </div>
</div>
          </div>
        </div>
      </main>

      {/* Clean Trust & Islamic Footer */}
      <footer className="w-full border-t border-slate-100 py-4 px-4 bg-white">
        <div className="max-w-md mx-auto text-center space-y-1.5">
          <p className="text-xs font-bold text-[#800000]">
            Jazakumullah Ahsanal Jaza
          </p>
          <p className="text-[11px] text-slate-500">
            Amanah, transparan, dan berkah dalam setiap transaksi laundry Anda.
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium pt-1">
            <span>Kafelas Laundry</span>
            <span>·</span>
            <span>Versi 40</span>
            <span>·</span>
            <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Cloud Sync Aktif
            </span>
          </div>
        </div>
      </footer>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-4 text-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#800000]" />
                Syarat dan Ketentuan Layanan
              </h3>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                Dengan mendaftar dan/atau menggunakan aplikasi <strong>Kafelas Laundry</strong>, Anda menyatakan
                telah membaca, memahami, dan menyetujui ketentuan berikut:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <p>
                  <strong>1. Akun dan Keamanan:</strong> Anda bertanggung jawab penuh untuk menjaga kerahasiaan kata
                  sandi akun Anda dan staf kasir.
                </p>
                <p>
                  <strong>2. Kepemilikan Data:</strong> Data transaksi, pelanggan, dan laporan keuangan adalah milik
                  Anda sepenuhnya dan tersimpan aman di database Cloud Firestore.
                </p>
                <p>
                  <strong>3. Integritas Operasional:</strong> Gunakan sistem Laundry dengan amanah untuk pencatatan yang
                  akurat, transparan, dan berkah.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setAgreeTerms(true);
                setShowTermsModal(false);
              }}
              className="w-full h-11 rounded-xl bg-[#800000] hover:bg-[#680000] text-white font-bold text-xs cursor-pointer shadow-xs transition active:scale-98"
            >
              Saya Mengerti & Setuju
            </button>
          </div>
        </div>
      )}

      {/* Modal Panduan Instalasi Semua Perangkat (Android, iOS, PC) */}
      <InstallGuideModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </div>
  );
};