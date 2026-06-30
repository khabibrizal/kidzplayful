# KidzPlayful — M17: Catatan Perkembangan Bermain (penilaian guru) — Plan

**Goal:** Guru TK mengisi Catatan Perkembangan Bermain (rubrik PAUD) tiap anak per event; orang tua melihatnya di event yang diikuti & di Rapor anak.

**Keputusan:** role **Guru** khusus · rubrik **4 aspek BB/MB/BSH/BSB + catatan** · tampil **di event & rapor anak** · semua guru bisa menilai semua event · akun guru diaktifkan admin (by email).

## Data (migrasi 0020)
- `profiles.is_guru` + `is_guru()`; trigger `cegah_self_admin` diperluas (non-admin tak bisa set is_admin/is_guru, admin boleh) + policy "admin update profiles".
- Buka baca `event` & `pendaftaran_event` untuk guru (`is_guru()`).
- `catatan_perkembangan(event_id, anak_id, ortu_id, aspek jsonb, catatan, dinilai_oleh)` unik (event,anak). RLS: ortu baca miliknya, admin & guru baca; guru insert/update.

## File
- tipe: `SkalaPaud`, `CatatanPerkembangan`. format: `ASPEK_PAUD`, `SKALA_PAUD`, `metaSkala`.
- data: `guru.ts` (getGuruTerjamin, getEventUntukGuru, getPesertaEvent), `guru-actions.ts` (simpanCatatan), `catatan.ts` (getCatatanAnak, getCatatanEventSaya, getEventBerCatatan), `admin-guru.ts` + `admin-guru-actions.ts` (jadikan/cabut guru).
- komponen: `CatatanCard.tsx`.
- pages: `/guru` (+`/[eventId]` + GuruNilai form rubrik), `/admin/guru` (+GuruAdmin), `/catatan/[eventId]` (ortu).
- integrasi: login redirect guru→/guru; admin nav 🍎 Guru; EventCard `catatanHref`; /event pass set; rapor anak section.

## DoD
Build/tsc/lint hijau, migrasi dijalankan. Guru isi catatan → ortu lihat di event & rapor.

## Catatan
- Peserta yang dinilai = pendaftaran berstatus `diterima`.
- Akun guru: guru daftar dulu → admin aktifkan by email (tanpa service key).
