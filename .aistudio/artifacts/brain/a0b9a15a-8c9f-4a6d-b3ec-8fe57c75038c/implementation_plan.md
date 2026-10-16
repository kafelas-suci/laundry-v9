# Rencana Implementasi: Perbaikan Rendering Logo & Tanda Tangan pada Struk (Base64 Conversion)

## Analisis Masalah
Masalah di mana logo dan tanda tangan muncul di *preview* (menggunakan `<img>` tag biasa) tetapi hilang saat di-*export* ke PNG (melalui `canvas.toDataURL()`) disebabkan oleh *Tainted Canvas*. 

Saat menggambar gambar dari domain lain ke `canvas`, browser membatasi akses jika gambar tersebut dianggap *cross-origin*. Bahkan dengan atribut `crossOrigin = 'anonymous'`, jika server tidak mengirimkan header CORS yang benar, `canvas` tetap akan ter-*taint* dan fungsi `toDataURL()` akan mengembalikan gambar kosong atau gagal.

## Langkah Perbaikan

### 1. Konversi ke Base64 (Data URL)
Sebelum menggambar gambar ke `canvas`, saya akan mengambil *blob* gambar tersebut dan mengonversinya menjadi *Data URL* (base64). Karena *Data URL* secara teknis berada dalam domain yang sama dengan *origin* aplikasi (tidak *cross-origin*), `canvas` tidak akan menjadi *tainted*, dan kita dapat dengan aman mengekspor kontennya ke PNG.

### 2. Implementasi
- Saya akan membuat fungsi baru `urlToDataUrl` yang mengambil URL gambar, melakukan `fetch`, mengubahnya menjadi `blob`, lalu mengonversinya menjadi *base64 string*.
- Fungsi `renderCanvasReceipt` di `StrukModal.tsx` akan diperbarui untuk menggunakan data base64 ini saat memanggil `loadImg`.

## Keuntungan
- **Tidak perlu konfigurasi CORS di Firebase Console** (solusi mandiri sisi klien).
- Memastikan gambar muncul di hasil *download* dan *share* meskipun gambar berasal dari domain yang berbeda.

---
**Status**: Menunggu konfirmasi Anda untuk menerapkan perbaikan ini.
