import React, { useEffect, useRef, useState } from 'react';
import { Transaksi, SettingsData } from '../types';
import { formatDateIndo, formatNumberOnly } from '../utils/formatters';
import { getCachedThermalLogoDataUrl, getThermalLogoDataUrl } from '../utils/logoHelper';

export interface ReceiptPaperProps {
  transaksi: Transaksi;
  settings: SettingsData;
  laundryName?: string;
  laundryPhone?: string;
  laundryAddress?: string;
  id?: string;
  isCaptureNode?: boolean;
  className?: string;
  onLogoReady?: () => void;
}

export const ReceiptPaper = React.forwardRef<HTMLDivElement, ReceiptPaperProps>(
  (
    {
      transaksi,
      settings,
      laundryName,
      laundryPhone,
      laundryAddress,
      id,
      isCaptureNode = false,
      className = '',
      onLogoReady,
    },
    ref
  ) => {
    const logoImgRef = useRef<HTMLImageElement | null>(null);
    const hasLogoEnabled = Boolean(settings.useLogo && settings.logoPath && settings.logoPath.trim());
    const [thermalLogoSrc, setThermalLogoSrc] = useState<string>(() =>
      hasLogoEnabled ? getCachedThermalLogoDataUrl(settings) : ''
    );

    useEffect(() => {
      let active = true;

      if (!hasLogoEnabled) {
        setThermalLogoSrc('');
        const raf = requestAnimationFrame(() => {
          if (active) onLogoReady?.();
        });
        return () => {
          active = false;
          cancelAnimationFrame(raf);
        };
      }

      const cached = getCachedThermalLogoDataUrl(settings);
      if (cached) {
        setThermalLogoSrc(cached);
        const raf = requestAnimationFrame(() => {
          if (active && (!logoImgRef.current || logoImgRef.current.complete)) {
            onLogoReady?.();
          }
        });
        return () => {
          active = false;
          cancelAnimationFrame(raf);
        };
      }

      getThermalLogoDataUrl(settings)
        .then((url) => {
          if (!active) return;
          if (url) {
            setThermalLogoSrc(url);
            requestAnimationFrame(() => {
              if (active && logoImgRef.current?.complete) {
                onLogoReady?.();
              }
            });
          } else {
            setThermalLogoSrc('');
            requestAnimationFrame(() => {
              if (active) onLogoReady?.();
            });
          }
        })
        .catch(() => {
          if (!active) return;
          setThermalLogoSrc('');
          requestAnimationFrame(() => {
            if (active) onLogoReady?.();
          });
        });

      return () => {
        active = false;
      };
    }, [transaksi.id, hasLogoEnabled, settings.logoPath, settings.useLogo]);

    const headerTitle = laundryName || settings.headerStruk || 'Kafelas Laundry';
    const headerAddress = laundryAddress || settings.address || '';
    const headerPhone = laundryPhone || settings.phoneNumber || '';

    const isLunas = transaksi.statusPembayaran === 'Lunas';
    const sisaBayar = isLunas ? 0 : Math.max(0, transaksi.totalHarga - (transaksi.jumlahDp || 0));
    const statusFinal = isLunas || sisaBayar <= 0 ? 'LUNAS' : 'BELUM LUNAS';

    const items = Array.isArray(transaksi.items) && transaksi.items.length > 0 ? transaksi.items : [];

    return (
      <div
        ref={ref}
        id={id}
        data-receipt-capture={isCaptureNode ? 'true' : undefined}
        data-trx-id={transaksi.id}
        className={`w-[320px] bg-white p-5 border border-slate-200 relative overflow-hidden text-slate-900 font-mono text-[11px] leading-tight select-none ${
          isCaptureNode ? '' : 'shadow-md'
        } ${className}`}
        style={{
          fontFamily: '"Courier New", Courier, monospace',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-0 flex flex-wrap content-start select-none"
          style={{
            opacity: 0.04,
            transform: 'rotate(-20deg) scale(1.3)',
            transformOrigin: 'center center',
          }}
        >
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="text-[12px] font-black text-slate-900 m-3 whitespace-nowrap">
              {headerTitle.toUpperCase()} •
            </div>
          ))}
        </div>

        <div className="relative z-10 space-y-2">
          {hasLogoEnabled && thermalLogoSrc && (
            <div className="flex justify-center mb-1">
              <img
                ref={logoImgRef}
                src={thermalLogoSrc}
                alt="Logo Toko"
                referrerPolicy="no-referrer"
                onLoad={() => {
                  requestAnimationFrame(() => onLogoReady?.());
                }}
                onError={() => {
                  requestAnimationFrame(() => onLogoReady?.());
                }}
                className={`w-auto object-contain ${
                  settings.logoSize === 'kecil'
                    ? 'h-7 max-w-[70px]'
                    : settings.logoSize === 'besar'
                    ? 'h-13 max-w-[130px]'
                    : 'h-9 max-w-[95px]'
                }`}
              />
            </div>
          )}

          <div className="text-center space-y-0.5">
            <h2 className="text-sm font-bold uppercase tracking-wide">{headerTitle}</h2>
            {headerPhone && <p className="text-[10px]">{headerPhone}</p>}
            {headerAddress && <p className="text-[9px] text-slate-700">{headerAddress}</p>}
          </div>

          <div className="border-b border-dashed border-slate-800 my-2"></div>

          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>No.</span>
              <span className="font-bold">{transaksi.nomorTransaksi || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Terima</span>
              <span>{formatDateIndo(transaksi.tanggalMasuk, true)}</span>
            </div>
            {transaksi.tanggalSelesai && (
              <div className="flex justify-between">
                <span>Selesai</span>
                <span className="font-semibold">{formatDateIndo(transaksi.tanggalSelesai)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1">
              <span>Yth. Bapak/Ibu</span>
            </div>
          </div>

          <div className="border-b border-dashed border-slate-800 my-1"></div>

          <div className="text-center py-1">
            <div className="text-base font-extrabold uppercase">{transaksi.namaPelanggan}</div>
            {transaksi.alamat && <div className="text-[10px] text-slate-600">({transaksi.alamat})</div>}
            <div
              className={`text-xs font-black tracking-widest mt-1 ${
                statusFinal === 'LUNAS' ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {statusFinal}
            </div>
            {sisaBayar > 0 && (
              <div className="text-sm font-black text-red-700 mt-0.5">
                Rp.{formatNumberOnly(sisaBayar)},-
              </div>
            )}
          </div>

          <div className="border-b border-dashed border-slate-800 my-1"></div>

          <div className="space-y-1.5 py-1">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold text-[11px]">{item?.namaLayanan || 'Layanan'}</div>
                  <div className="flex justify-between text-[10px]">
                    <span>
                      {item?.berat || 0} {item?.satuan || ''} x{' '}
                      {formatNumberOnly(item?.hargaPerKg || item?.hargaSatuan || 0)}
                    </span>
                    <span>= {formatNumberOnly(item?.subtotal || 0)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-0.5">
                <div className="font-bold text-[11px]">Cucian Laundry</div>
                <div className="flex justify-between text-[10px]">
                  <span>1 Paket</span>
                  <span>= {formatNumberOnly(transaksi.totalHarga)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-b border-dashed border-slate-800 my-1"></div>

          <div className="space-y-1 text-[11px]">
            {transaksi.diskon && transaksi.diskon > 0 ? (
              <div className="flex justify-between text-rose-700">
                <span>Potongan Diskon</span>
                <span>-Rp {formatNumberOnly(transaksi.diskon)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-bold">
              <span>Total Transaksi</span>
              <span>Rp {formatNumberOnly(transaksi.totalHarga)}</span>
            </div>
            {transaksi.jumlahDp > 0 && (
              <div className="flex justify-between">
                <span>Pembayaran Awal</span>
                <span>Rp {formatNumberOnly(transaksi.jumlahDp)}</span>
              </div>
            )}
            {sisaBayar > 0 ? (
              <div className="flex justify-between font-bold text-red-700">
                <span>Sisa Pembayaran</span>
                <span>Rp {formatNumberOnly(sisaBayar)}</span>
              </div>
            ) : isLunas && transaksi.jumlahDp > 0 && transaksi.jumlahDp < transaksi.totalHarga ? (
              <div className="flex justify-between font-bold text-emerald-700">
                <span>Pelunasan</span>
                <span>Rp {formatNumberOnly(transaksi.totalHarga - transaksi.jumlahDp)}</span>
              </div>
            ) : null}
          </div>

          <div className="border-b border-dashed border-slate-800 my-1"></div>

          <div className="text-center space-y-1 text-[10px] pt-1">
            {transaksi.metodePembayaran && (
              <div>
                Metode: {transaksi.metodePembayaran}
                {transaksi.metodePembayaranDetail ? ` (${transaksi.metodePembayaranDetail})` : ''}
              </div>
            )}
            {transaksi.catatan && (
              <div className="font-bold italic text-slate-800">Catatan: {transaksi.catatan}</div>
            )}
            {settings.footerStruk && (
              <div className="text-[10px] text-slate-600 leading-tight pt-1">{settings.footerStruk}</div>
            )}
            {settings.chattyFooter && (
              <div className="text-[10px] font-semibold italic text-slate-800 pt-1">
                {settings.chattyFooter}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ReceiptPaper.displayName = 'ReceiptPaper';
