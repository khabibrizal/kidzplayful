# Desain: UTM Tracking & Dashboard Atribusi Share

Tanggal: 2026-07-24
Status: disetujui (Pendekatan A)

## Tujuan
Admin dapat mengetahui **berapa pendaftar baru yang datang dari share konten** (artikel/kelas/game), dipecah **per saluran** (WhatsApp/Facebook/X/Telegram/Salin/native-HP) dan **per jenis konten** (artikel/kelas/game), lewat kartu di `/admin/analitik`.

## Cakupan
- **Konversi saja** (pendaftar), bukan kunjungan/traffic.
- Breakdown: per saluran + per jenis konten (bukan per judul spesifik).
- **First-touch** attribution (ref pertama yang tersimpan menang; kedaluwarsa 30 hari).

## Batasan diketahui
- Web Share API (`navigator.share`) tidak melaporkan app tujuan → share native tercatat `ref_saluran='native'`. Saluran spesifik hanya dari tombol fallback (WA/FB/X/Telegram/Salin).
- Bukan multi-touch; tidak menyimpan judul/id konten spesifik (cukup jenis). Bisa di-upgrade ke tabel `atribusi` terpisah bila perlu.

## Unit & perubahan

### 1. Model data — migrasi `0082_atribusi_share.sql`
```sql
alter table public.profiles
  add column if not exists ref_sumber text,   -- 'share' | null (organik)
  add column if not exists ref_saluran text,  -- whatsapp|facebook|twitter|telegram|salin|native
  add column if not exists ref_jenis text;    -- artikel|kelas|game
create index if not exists profiles_ref_sumber_idx on public.profiles(ref_sumber);
```
- Kolom nullable; NULL `ref_sumber` = pendaftar organik.
- RLS: kolom baru ikut policy `profiles` yang ada (user update baris sendiri saat daftar; admin baca semua). Tidak perlu policy baru — update dilakukan user pada baris sendiri di `/daftar`.

### 2. UTM di `lib/share.ts` + `ShareButton`
- Tambah helper murni **`denganUtm(url, { medium, jenis })`** di `src/lib/share.ts`: menambahkan query `utm_source=share&utm_medium=<medium>&utm_content=<jenis>` ke `url` (meng-handle url yang sudah punya query; encode nilai). Teruji vitest.
- `ShareButton` (`src/components/ShareButton.tsx`) dapat prop baru **`jenis: 'artikel' | 'kelas' | 'game'`**.
  - URL absolut yang dibagikan selalu dilewatkan `denganUtm`:
    - Native `navigator.share` → `medium='native'`.
    - Tombol WhatsApp/Facebook/X/Telegram → `medium` sesuai target.
    - Salin link → `medium='salin'`.

### 3. Tangkap ref — komponen `TangkapRef`
- File: `src/components/TangkapRef.tsx` (client, render null; pola seperti `RekamAktivitas`).
- Saat mount: baca `URLSearchParams` — jika `utm_source==='share'` dan `localStorage.kp_ref` belum ada (atau sudah > 30 hari) → simpan `localStorage.kp_ref = JSON.stringify({ saluran: utm_medium||'native', jenis: utm_content||'', ts: <epoch ms via Date.now()> })`. First-touch: jangan menimpa yang masih valid.
- Dipasang di: `src/app/coba/kelas/[id]/page.tsx`, `src/app/coba/tema/[id]/page.tsx`, `src/app/artikel/[slug]/page.tsx`.

### 4. Simpan saat daftar — `src/app/daftar/page.tsx`
- Sesudah `signUp` sukses + sebelum/berbarengan `update profiles`: baca `localStorage.kp_ref`; bila ada & `Date.now() - ts <= 30*24*3600*1000` → tambahkan `ref_sumber:'share', ref_saluran, ref_jenis` ke objek `update` profiles. Setelah update sukses → `localStorage.removeItem('kp_ref')`.
- Helper murni **`bacaRef()`** & **`hapusRef()`** di `src/lib/ref.ts` (client-safe) agar teruji & dipakai bersama `TangkapRef`.

### 5. Dashboard — `/admin/analitik`
- Reader **`getAtribusiShare()`** di `src/lib/data/atribusi.ts`: pakai admin/server client, baca `profiles(created_at, ref_sumber, ref_saluran, ref_jenis)` 30 hari terakhir; hasilkan `{ totalShare, totalOrganik, perSaluran: Record<string,number>, perJenis: Record<string,number> }`.
- Tambah kartu **"🔗 Atribusi Share"** di `src/app/admin/analitik/page.tsx`: tampilkan total pendaftar dari share vs organik + rincian per saluran + per jenis (daftar/baris angka sederhana, gaya konsisten kartu analitik lain).
- Label saluran/jenis ramah: `whatsapp→WhatsApp`, `native→HP (share sheet)`, `game→Game`, dst.

### 6. Testing
- **Unit (vitest)** `src/lib/__tests__/share.test.ts` (perluas): `denganUtm` menambah `utm_source=share`, `utm_medium`, `utm_content`, encode benar, dan menyambung dengan `?`/`&` sesuai ada-tidaknya query awal.
- **Unit (vitest)** `src/lib/__tests__/ref.test.ts`: `bacaRef` mengembalikan null bila kosong/kedaluwarsa; membaca valid bila < 30 hari (localStorage di-mock/jsdom).
- **Manual**: buka `/coba/kelas/<id>?utm_source=share&utm_medium=whatsapp&utm_content=kelas` → daftar akun baru → cek `profiles` terisi `ref_*` → kartu admin bertambah 1 di kolom WhatsApp/Kelas.
- Gerbang: `npx tsc --noEmit` + `npm test` + `npm run build` hijau.

## Langkah manual pasca-implementasi
- Jalankan `0082_atribusi_share.sql` di Supabase SQL Editor.

## Catatan
- Nilai waktu (`Date.now()`) dipakai di komponen client biasa (bukan workflow script) → aman.
- Tidak mengubah gating/logika daftar selain menambah field ref.
