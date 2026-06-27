# KidzPlayful — M13: Bahan+Link Marketplace & Aktivitas Bergrup — Implementation Plan

**Goal:**
1. **Bahan** kelas bermain jadi daftar item `{nama, link}` — tiap bahan boleh punya **link marketplace** (opsional). Tombol **🛒 Beli** muncul di mana saja (termasuk layar anak), tapi **klik → konfirmasi dulu** sebelum membuka toko.
2. **Aktivitas bergrup**: satu kelas berisi banyak **Aktivitas**, tiap aktivitas punya `{judul, cara_membuat, langkah[]}` sendiri.
3. Tampilan kelas bermain (sisi user) bisa **diunduh PDF**.

**Keputusan:** Bahan = kelas-level (1 daftar belanja). Cara membuat = per-aktivitas. Aktivitas bebas, min 1.

## Perubahan data (migrasi 0016)
- `bahan` text → `jsonb [{nama, link}]` (konversi: string koma → item tanpa link).
- `aktivitas` text → `jsonb [{judul, cara_membuat, langkah[]}]` (lebur aktivitas+cara_membuat+langkah lama jadi Aktivitas 1).
- drop kolom `cara_membuat`, `langkah`.

## File berubah
- `supabase/migrations/0016_kelas_bahan_aktivitas.sql` (baru)
- `src/lib/game/tipe.ts` — `BahanItem`, `AktivitasItem`, `KelasBermain` baru.
- `src/lib/data/kelas-bermain.ts`, `favorit.ts`, `kelas-bermain-actions.ts` — COLS (buang cara_membuat,langkah); `KelasInput` (BahanInput/AktivitasInput) + `row()`.
- `src/app/admin/kelas-bermain/KelasAdmin.tsx` — form repeater Bahan + repeater Aktivitas (nested langkah).
- `src/components/BeliBtn.tsx` (baru) — tombol Beli + modal konfirmasi → window.open.
- `src/components/UnduhPdfBtn.tsx` (baru) — window.print (Simpan sebagai PDF), set document.title.
- `src/app/kelas/[id]/page.tsx` — render struktur baru + BeliBtn + UnduhPdfBtn (kanonik printable).
- `src/app/main/[anakId]/MenuAnak.tsx` — render kelas-detail baru + BeliBtn + link Unduh PDF.
- `src/app/ortu/[anakId]/page.tsx` — render baru + BeliBtn + link Unduh PDF.
- `src/app/globals.css` — `@media print .no-print{display:none}`.

## Definition of Done
- Build/tsc/test/lint hijau. Migrasi dijalankan di Supabase. Admin bisa input banyak aktivitas + bahan berlink; user lihat tombol Beli (dengan konfirmasi) & bisa Unduh PDF.

## Catatan
- PDF via dialog cetak browser (Simpan sebagai PDF) — tanpa dependency tambahan.
- Tabel `panduan` legacy TIDAK diubah (terpisah dari `kelas_bermain`).
