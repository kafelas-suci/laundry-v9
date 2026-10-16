import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean; // True specifically for HP / Phone or small screen (< 768px)
  isPcOrTablet: boolean; // True for PC / Desktop / Tablet
  isPhone: boolean; // Phone specifically
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
  os: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Linux' | 'Other';
  screenWidth: number;
  screenHeight: number;
  isTouchDevice: boolean;
}

export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isPcOrTablet: true,
      isPhone: false,
      isTablet: false,
      isDesktop: true,
      userAgent: '',
      os: 'Other',
      screenWidth: 1024,
      screenHeight: 768,
      isTouchDevice: false,
    };
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
  const uaLower = userAgent.toLowerCase();

  const isAndroid = /android/i.test(uaLower);
  const isIOS = /iphone|ipad|ipod/i.test(uaLower);
  const isIPad = /ipad/i.test(uaLower) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPhone = /iphone|ipod/i.test(uaLower);
  const isWindows = /windows/i.test(uaLower);
  const isMac = /macintosh|mac os x/i.test(uaLower) && !isIPad;
  const isLinux = /linux/i.test(uaLower) && !isAndroid;

  let os: DeviceInfo['os'] = 'Other';
  if (isAndroid) os = 'Android';
  else if (isIOS || isIPad) os = 'iOS';
  else if (isWindows) os = 'Windows';
  else if (isMac) os = 'macOS';
  else if (isLinux) os = 'Linux';

  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const isSmallScreen = screenWidth < 768;
  const isMediumScreen = screenWidth >= 768 && screenWidth < 1024;

  const isPhoneUA = /mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/i.test(uaLower);
  const isTabletUA = isIPad || (!isPhoneUA && (/tablet|android/i.test(uaLower)));

  const isPhone = isPhoneUA || (isSmallScreen && !isTabletUA);
  const isTablet = isTabletUA || (isMediumScreen && !isPhone);
  const isDesktop = !isPhone && !isTablet && screenWidth >= 1024;

  // HP category (phone or narrow screen under 768px)
  const isMobile = isPhone || isSmallScreen;
  const isPcOrTablet = !isMobile;

  return {
    isMobile,
    isPcOrTablet,
    isPhone,
    isTablet,
    isDesktop,
    userAgent,
    os,
    screenWidth,
    screenHeight,
    isTouchDevice,
  };
}

export function useDeviceDetect() {
  const [device, setDevice] = useState<DeviceInfo>(detectDevice);

  useEffect(() => {
    const handleResize = () => {
      setDevice(detectDevice());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return device;
}
