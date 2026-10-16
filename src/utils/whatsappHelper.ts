/**
 * Helper utilitas untuk pengiriman pesan nota struk ke WhatsApp
 * Mendukung WhatsApp Reguler (Biasa), WhatsApp Business, dan Universal Chooser.
 */

export type WhatsAppVariant = 'regular' | 'business' | 'universal';

export function sendToWhatsApp(
  phone: string,
  message: string,
  appType: WhatsAppVariant = 'universal'
): void {
  const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
  const encodedText = encodeURIComponent(message);
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isAndroid) {
    if (appType === 'business') {
      // Direct intent Android ke paket resmi WhatsApp Business (com.whatsapp.w4b)
      const intentUrl = `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
      try {
        window.location.href = intentUrl;
        return;
      } catch {
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
        return;
      }
    } else if (appType === 'regular') {
      // Direct intent Android ke paket resmi WhatsApp Reguler (com.whatsapp)
      const intentUrl = `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
      try {
        window.location.href = intentUrl;
        return;
      } catch {
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
        return;
      }
    }
  }

  // Universal URL untuk iOS, Desktop, atau fallback Android
  if (isMobile) {
    // Protokol whatsapp:// memunculkan dialog sistem Android (bisa memilih antara WA biasa / WA Business)
    const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    window.location.href = appUrl;
    setTimeout(() => {
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
    }, 1200);
  } else {
    // Desktop / Web Browser
    window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, '_blank');
  }
}
