# Rencana Implementasi Keamanan Firestore

## 1. Audit Struktur Data & Blueprint
- Memastikan `firebase-blueprint.json` mencerminkan hierarki: `owners/{ownerId}` sebagai akar data.
- Menetapkan `tim_studio/{uid}` sebagai lookup table untuk otorisasi peran secara cepat.

## 2. Definisi Aturan Keamanan (firestore.rules)
- **Global**: Default-deny (`allow read, write: if false`).
- **Helpers**:
  - `isSignedIn()`: Cek `request.auth != null`.
  - `getUserRole()`: Ambil peran dari `tim_studio/{uid}` atau pemilik `owners/{uid}`.
  - `isOwner(ownerId)`: Cek jika `request.auth.uid == ownerId`.
  - `isAdmin(ownerId)`: Cek peran 'admin' di koleksi tim.
  - `isStaff(ownerId)`: Cek peran 'anggota' di koleksi tim.
- **Rules Mapping**:
  - `owners/{ownerId}`: Read (Owner/Admin), Write (Owner saja).
  - `owners/{ownerId}/jadwal/{jadwalId}`: Read (Owner/Admin/Staff yg terkait), Write (Owner/Admin).
  - `owners/{ownerId}/paket_layanan` & `pengaturan`: Read (Owner/Admin/Staff), Write (Owner saja).
  - `arsip_kompresi`: Read (Owner/Admin/Staff terbatas).

## 3. Implementasi Frontend (Error Handling)
- Menambahkan fungsi `handleFirestoreError` di `firebaseClient.ts`.
- Membungkus setiap operasi Firestore (`getDocs`, `setDoc`, dll) dengan try-catch yang memanggil `handleFirestoreError` untuk diagnostik keamanan.

## 4. Audit Red Team
- Pengujian "Shadow Update" untuk mencegah penambahan ghost fields.
- Pengujian isolasi akses staff terhadap arsip.
