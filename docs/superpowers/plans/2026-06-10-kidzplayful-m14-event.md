# KidzPlayful — M14: Event Kelas Bermain Offline + Pendaftaran — Implementation Plan

**Goal:** Admin membuat event offline (CRUD); user lihat carousel di dashboard + halaman list, daftar (pilih >1 anak, total otomatis, upload bukti bayar); admin lihat & Terima/Tolak pendaftaran.

**Keputusan:** harga **per anak** (total = harga × jumlah anak, otomatis). Admin **Lihat + Terima/Tolak**.

## Data (migrasi 0017)
- `event(id, judul, lokasi, tanggal, jam_mulai, jam_selesai, deskripsi, gambar_url, harga_per_anak, status['tampil'|'arsip'])`. RLS: baca tampil/admin; kelola admin.
- `pendaftaran_event(id, event_id, ortu_id, anak_ids[], anak_nama[], jumlah_anak, total, bukti_url, status['menunggu'|'diterima'|'ditolak'])`. RLS: baca milik sendiri/admin; insert sendiri; update admin.
- Storage policy: authenticated boleh unggah ke `bukti/` (bukti bayar) di bucket `aset`.

## File
- `supabase/migrations/0017_event.sql`
- `src/lib/game/tipe.ts` — `EventKelas`, `PendaftaranEvent`.
- `src/lib/format.ts` — formatTanggal, formatRupiah.
- `src/lib/data/event.ts` (baca user), `event-actions.ts` (daftarEvent), `admin-event.ts` (baca admin + getJumlahPendaftar), `admin-event-actions.ts` (CRUD + setStatusPendaftaran).
- `src/components/EventCard.tsx`, `EventCarousel.tsx`.
- `src/app/event/page.tsx` (list), `src/app/event/[id]/daftar/page.tsx` + `DaftarForm.tsx`.
- `src/app/admin/event/page.tsx` + `EventAdmin.tsx`, `src/app/admin/event/[id]/pendaftar/page.tsx` + `PendaftarAdmin.tsx`.
- Wire: `pilih-anak/page.tsx` (carousel di atas), `admin/page.tsx` (nav 🗓️ Event).

## DoD
Build/tsc/test/lint hijau, migrasi dijalankan. Admin CRUD event + Terima/Tolak; user daftar dengan bukti bayar & total otomatis.

## Catatan
- Total dihitung ulang di server (otoritatif), bukan dari input user.
- Nama anak di-snapshot (`anak_nama[]`) agar admin lihat tanpa join.
- Carousel: scroll-snap horizontal + dots; "Lihat semua" → /event.
