# Implementation Plan - Proactive Multi-Tenant Security & Data Isolation Audit

## Problem Statement
To ensure professional-grade architecture that surpasses expectations, we need to proactively audit and enforce strict multi-tenant isolation across all Firestore collections (`transaksi`, `pelanggan`, `layanan`, `pengeluaran`, `settings`, `laundries`) so that data cannot leak or cross between different users and branches.

## Proposed Changes

### 1. Firestore Security Rules (`firestore.rules`)
- Review and harden rules for `/laundries/{laundryId}/{document=**}` to ensure users can only read/write to laundries they own or are assigned to.
- Ensure strict type validation and size limits on all incoming fields.

### 2. FirebaseSyncService (`src/utils/firebaseSync.ts`)
- Add runtime defensive guards to `fetchTransaksiAktif`, `fetchPelanggan`, `fetchLayanan`, `fetchPengeluaran`, `fetchSettings` to verify that `laundryId` is valid and non-empty.
- Ensure mutation helpers (`saveTransaksi`, `savePelanggan`, `saveLayanan`, `savePengeluaran`, `saveSettings`) attach and verify the correct `laundryId` payload before writing.

## Verification Plan
1. Compile app with `compile_applet`.
2. Run linter with `lint_applet`.
