# Rencana Konfigurasi CORS Firebase Storage (via CLI)

Karena file `cors.json` sudah tersedia di root direktori aplikasi, kita akan menggunakan Google Cloud CLI (`gsutil`) untuk menerapkan konfigurasi tersebut langsung dari terminal.

## Langkah-langkah:

1.  **Pastikan File Sudah Benar**: File `cors.json` di root sudah berisi daftar domain yang diizinkan:
    ```json
    [
      {
        "origin": [
          "https://ais-dev-mpn5hkeua4gpz4zlxpvsca-211022736644.asia-east1.run.app",
          "https://kflsagnd.web.app"
        ],
        "method": ["GET"],
        "maxAgeSeconds": 3600
      }
    ]
    ```

2.  **Terapkan melalui CLI**:
    Gunakan perintah berikut untuk menerapkan konfigurasi ke bucket Anda:
    ```bash
    gsutil cors set cors.json gs://kafilasuci3.appspot.com
    ```

3.  **Verifikasi**:
    Setelah perintah dijalankan, verifikasi dengan:
    ```bash
    gsutil cors get gs://kafilasuci3.appspot.com
    ```
