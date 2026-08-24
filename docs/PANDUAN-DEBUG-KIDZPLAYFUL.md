# Panduan Debug KidzPlayful

**Untuk programmer yang harus mencari bug SENDIRI — tanpa bantuan AI.**

Dokumen ini bukan ringkasan arsitektur (itu ada di [`REFERENSI-KODE-KIDZPLAYFUL.md`](REFERENSI-KODE-KIDZPLAYFUL.md)).
Ini alat kerja: dari **gejala yang dilihat pengguna** → **berkas dan fungsi yang menanganinya** →
**cara membuktikan penyebabnya** → **cara memperbaikinya**.

Tiga hal yang harus Anda percayai saat memakai dokumen ini:

1. **Setiap bug di katalog Bagian 6 pernah benar-benar terjadi di produksi aplikasi ini.** Bukan daftar
   teoretis. Itulah sebabnya masing-masing menyebutkan berkas, nomor baris, dan commit-nya.
2. **Sebagian besar bug di sini TIDAK menghasilkan galat.** Tidak ada stack trace, tidak ada log merah —
   hanya angka yang salah, daftar yang kosong, atau materi yang muncul kepada orang yang tak berhak.
   Kalau Anda menunggu error message, Anda akan melewatkannya.
3. **`tsc` dan `npm run build` hijau bukan bukti.** Tiga kelas bug terbesar di aplikasi ini (cache basi,
   snapshot basi, tata letak kanvas) lolos keduanya dengan sempurna.

---

## Daftar isi

1. [Peta 30 detik](#1-peta-30-detik)
2. [Menjalankan & alat debug](#2-menjalankan--alat-debug)
3. [Alur satu request: dari klik sampai baris database](#3-alur-satu-request-dari-klik-sampai-baris-database)
4. [Aturan besar yang mengikat seluruh kode](#4-aturan-besar-yang-mengikat-seluruh-kode)
5. [Peta fitur → berkas → fungsi](#5-peta-fitur--berkas--fungsi)
6. [Katalog bug yang sering terjadi](#6-katalog-bug-yang-sering-terjadi)
7. [Indeks cepat: gejala → tempat](#7-indeks-cepat-gejala--tempat)
8. [Migrasi database: aturan main](#8-migrasi-database-aturan-main)
9. [Pantangan](#9-pantangan)
10. [Lampiran: seluruh modul domain & fungsinya](#10-lampiran-seluruh-modul-domain--fungsinya)

---

## 1. Peta 30 detik

**Next.js 16 App Router + Supabase (Postgres + RLS).** Tanpa ORM, tanpa state manager, tanpa API route
untuk data internal.

```
Browser
  │
  ├─ Server Component  ──► src/lib/data/<fitur>.ts        (BACA)   ──┐
  │                          └─ src/lib/domain/<aturan>.ts (MURNI)   │
  │                                                                  ├──► Supabase Postgres
  └─ Server Action     ──► src/lib/data/<fitur>-actions.ts (TULIS) ──┘         + RLS
                             ('use server')
```

Empat lapis, dan setiap lapis punya satu tugas:

| Lapis | Letak | Tugas | Boleh I/O? |
|---|---|---|---|
| Halaman | `src/app/**/page.tsx` | Ambil data, render. Server Component secara bawaan. | ya (baca) |
| Komponen | `src/components/*.tsx` | Interaksi. `'use client'` bila perlu state. | tidak |
| Data | `src/lib/data/*.ts` | Query & mutasi Supabase. **Berkas biasa = BACA, berkas `-actions` = TULIS.** | ya |
| Domain | `src/lib/domain/*.ts` | Aturan bisnis MURNI. Tanpa I/O, tanpa `Date.now()` tersembunyi. Ada vitest-nya. | **tidak** |

**Kenapa pemisahan Data/Domain itu penting untuk debugging:** kalau angkanya salah, Anda tidak perlu
menyalakan aplikasi. Aturannya ada di modul domain yang bisa dipanggil langsung dari test — dan sudah ada
393 test yang memanggilnya. Kalau bug ada di domain, Anda bisa membuktikannya dalam 30 detik dengan satu
test baru. Kalau bug TIDAK bisa direproduksi di domain, bug-nya di lapis data (query/RLS/cache) — dan itu
mempersempit pencarian dari 105 berkas menjadi satu.

**Tiga client Supabase — pilih yang salah dan RLS ikut berubah:**

| Berkas | Kunci | Kapan | Bahaya |
|---|---|---|---|
| `src/lib/supabase/server.ts` | anon + cookie sesi | Server Component & Server Action. **Bawaan.** | — |
| `src/lib/supabase/client.ts` | anon, di browser | Komponen `'use client'` yang perlu realtime/auth | Semua query kena RLS sebagai user itu |
| `src/lib/supabase/admin.ts` | **service role** | Hanya operasi admin sensitif (mis. buat user) | **Melewati RLS sepenuhnya.** `import 'server-only'`. Jangan pernah dipakai untuk membaca data pengguna |

**`src/proxy.ts`** adalah middleware: ia menyegarkan sesi Supabase pada setiap request DAN menjaga akses
menu admin (`keyMenuDariPath`, `menuUntukRole`). Kalau seseorang "tiba-tiba tak bisa membuka halaman
admin", periksa di sini lebih dulu, bukan di halamannya.

---

## 2. Menjalankan & alat debug

### 2.1 Perintah harian

```bash
npm run dev            # localhost:3000
npx tsc --noEmit       # tipe
npx eslint             # lint
npm test               # 393 vitest (domain + game + lib)
npm run build          # build produksi
```

**Gerbang mutu sebelum SETIAP commit — keempatnya, dalam urutan ini:**

```bash
npx tsc --noEmit && npx eslint && npm test && npm run build
```

Urutannya bukan selera: `tsc` paling cepat memberi tahu Anda salah tipe, dan `build` paling lambat.
Menjalankan `build` lebih dulu berarti menunggu 3 menit untuk mengetahui hal yang `tsc` bisa katakan
dalam 20 detik.

### 2.2 Di mana log-nya muncul

Ini sumber kebingungan paling sering di App Router:

| Kode berjalan di | `console.log` muncul di |
|---|---|
| Server Component (`page.tsx` tanpa `'use client'`) | **terminal `npm run dev`** — BUKAN console browser |
| Server Action (`'use server'`) | **terminal `npm run dev`** |
| Komponen `'use client'` | console browser |
| `src/proxy.ts` (middleware) | terminal, dengan awalan yang berbeda per request |

Kalau `console.log` Anda tak muncul di mana-mana, kodenya tidak dieksekusi. Itu informasi, bukan kegagalan
alat — lihat BUG-01 (cache) dan BUG-08 (RLS/guard memantulkan lebih awal).

### 2.3 Menjalankan satu test saja

```bash
npx vitest run src/lib/domain/__tests__/siklus-kurikulum.test.ts
npx vitest run -t 'nama test'          # per nama
npx vitest                             # watch mode
```

### 2.4 Uji daya gigit (mutation testing) — WAJIB untuk aturan baru

Test yang hijau belum berarti test yang berguna. Cara memastikan:

1. **Rusak kodenya dengan sengaja** — balik `<=` jadi `<`, hapus `Math.max(1, …)`, ganti kunci Map.
2. Jalankan test.
3. **Kalau test tetap hijau, test-nya tidak menjaga apa pun.** Perbaiki test-nya, bukan kodenya.
4. Kembalikan kode ke semula.

Contoh nyata dari repo ini: asersi "tanggal konsultasi tak boleh digeser seperti UTC" ternyata **mustahil
dilanggar** — menambah 7 jam pada tengah malam tak pernah memindahkan bulan. Test itu terlihat
meyakinkan, hijau, dan tidak menjaga apa pun. Diganti dengan asersi yang benar-benar bisa jatuh: kunci
peta harus `pendaftaran_id`, bukan `id` baris rekomendasinya sendiri.

Cara cepat: simpan salinan, mutasi, uji, pulihkan.

```bash
cp src/lib/domain/X.ts /tmp/X.bak
# ...ubah satu operator...
npx vitest run src/lib/domain/__tests__/X.test.ts
cp /tmp/X.bak src/lib/domain/X.ts
```

### 2.5 Membuktikan migrasi sudah jalan (probe REST baca-saja)

Migrasi dijalankan **manual** di Supabase SQL Editor, **setelah** deploy. Jadi pertanyaan "apakah kolomnya
sudah ada di produksi?" itu pertanyaan nyata, dan menjawabnya dengan menebak adalah sumber BUG-03/BUG-04.

Buktikan dengan probe REST. Kuncinya: **selalu sertakan satu kolom kontrol yang sengaja SALAH.**

```bash
URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2)
KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)

# 1) kolom yang dicari
curl -s -H "apikey: $KEY" "$URL/rest/v1/kelas_bermain?select=jenis&limit=1"

# 2) KOLOM KONTROL PALSU — wajib membalas 42703
curl -s -H "apikey: $KEY" "$URL/rest/v1/kelas_bermain?select=kolom_kontrol_palsu&limit=1"
```

Tafsirkan begini:

| Balasan | Arti |
|---|---|
| `42703 column ... does not exist` pada kolom kontrol | **Probe-nya jujur.** Lanjut baca hasil no. 1 |
| `42703` pada kolom yang dicari | Migrasinya **belum jalan** |
| `42P01 relation does not exist` | **Tabelnya** belum ada |
| `[]` pada kolom yang dicari | Kolomnya ADA. Kosongnya karena RLS atau memang tak ada baris — **tak bisa dibedakan** (BUG-08) |
| `200` dengan data | Kolomnya ada dan terbaca anon |

Tanpa kolom kontrol, probe yang salah URL/salah header juga membalas "tidak ada" — dan Anda akan
menyimpulkan migrasinya gagal padahal probe-nya yang rusak.

**Kunci anon TIDAK BISA membaca tabel ber-RLS** (`langganan_anak`, `rekomendasi_psikolog`, `kegiatan_anak`,
…). Untuk itu Anda perlu SQL Editor Supabase (login sebagai pemilik proyek), bukan probe.

### 2.6 Memverifikasi gambar (rapor, sertifikat, stiker)

Semua gambar dirender di **Canvas** (`src/lib/rapor-jpeg.ts`, `sertifikat-jpeg.ts`, `kartu-bersama.ts`,
`story-card.ts`). Tata letak kanvas **tidak diperiksa oleh apa pun** — bukan tipe, bukan lint, bukan test,
bukan build. Satu-satunya cara mengetahui hasilnya benar adalah **melihat gambarnya**.

Ada harness lokal untuk itu (folder `_rapor/`, tidak masuk git):

```bash
npx vite --config _rapor/vite.config.mjs      # server di :5599
node _rapor/shot.mjs ''            _rapor/out.png     # fixture bawaan
node _rapor/shot.mjs berat=1       _rapor/berat.png   # isi banyak
node _rapor/shot.mjs ringan=1      _rapor/ringan.png  # isi sedikit
node _rapor/shot.mjs sangatberat=1 _rapor/2hal.png    # sampai 2 halaman
```

Harness-nya me-render **`buatRaporJpeg` yang sungguhan** dengan fixture `IsiRapor`, lalu memotret hasilnya
dengan Chrome (`playwright-core`). Kalau folder `_rapor/` tidak ada di mesin Anda, buat ulang: satu
`entry.ts` yang memanggil `buatRaporJpeg(isi)` lalu menempelkan blob-nya sebagai `<img>`, satu
`vite.config.mjs` dengan `root: '_rapor'`, `publicDir` menunjuk `public/` proyek, alias `@` → `src`, dan
satu `shot.mjs` yang menunggu `window.siap === true`.

**Selalu periksa MINIMAL tiga keadaan:** isi sedikit, isi banyak, dan keadaan kosong. Enam putaran render
pernah dibutuhkan untuk satu perubahan tata letak rapor, dan tak satu pun masalahnya terlihat di kode.

### 2.7 Mencari sesuatu di kode

```bash
rg 'nama_kolom' src/                 # siapa yang menyentuh kolom ini
rg "from\('nama_tabel'\)" src/lib    # semua query ke tabel ini
rg 'updateTag'  src/lib/data         # semua penyegar cache
rg '🐞' src/                          # catatan bug bersejarah di dalam kode
rg 'export (async )?function' src/lib/data/<f>.ts
```

`rg '🐞'` itu penting: setiap penanda 🐞 di kode ini adalah bug yang pernah terjadi, ditulis di tempat
kejadiannya, beserta alasan kenapa perbaikannya berbentuk demikian. Jangan hapus penanda itu saat
merapikan kode — ia mencegah bug yang sama dipasang kembali.

---

## 3. Alur satu request: dari klik sampai baris database

Contoh: **orang tua menyimpan checklist evaluasi kurikulum.** Ikuti jalur ini saat mendebug fitur apa pun;
bentuknya selalu sama.

```
1. src/components/KelasIsi.tsx                 ('use client')
     centang checklist → kumpulkan hasil → panggil Server Action
        │
2. src/lib/data/kurikulum-actions.ts           ('use server')
     simpanEvaluasi(anakId, kelasId, hasil, catatan)
        ├─ guard peran: siapa yang boleh menilai?
        ├─ SNAPSHOT kalimat evaluasi diambil dari MATERI di database,
        │  BUKAN dari kiriman klien  ← kalau tidak, klien bisa mengarang butir
        ├─ upsert ke evaluasi_kurikulum  (unique anak_id, kelas_id, PERAN)
        └─ revalidatePath(...) supaya halaman terkait ikut segar
        │
3. Postgres + RLS
     policy: ortu_id = auth.uid() | is_admin() | is_guru() | boleh_lihat_laporan_anak()
     TANPA DELETE untuk ortu — riwayat rapor tak boleh dirapikan belakangan
        │
4. src/app/anak/[anakId]/rapor/[ym]/page.tsx   (Server Component)
     getEvaluasiAnak(anakId) → saring per bulan → ringkasBulan() → tampil + JPEG
```

Empat titik gagal, dan gejalanya berbeda-beda:

| Gagal di | Gejala |
|---|---|
| 1 klien | Tombol tak melakukan apa-apa; error di console browser |
| 2 action | Ada pesan galat dari action (kalau action-nya mengembalikan `{ok:false,error}`) |
| 3 RLS | **Tersimpan "sukses" tapi tak pernah terbaca lagi.** Ini yang paling membingungkan |
| 4 baca/cache | Data ADA di database tapi halaman menampilkan yang lama (BUG-01) |

Cara memisahkan 3 dari 4 dalam satu langkah: **buka data yang sama dari peran lain** (admin). Kalau admin
melihatnya dan orang tua tidak, itu RLS. Kalau keduanya tak melihat, tulisannya yang gagal atau
pembacaannya salah jangkar.

---

## 4. Aturan besar yang mengikat seluruh kode

Enam aturan ini menjelaskan bentuk kode di banyak tempat. Melanggarnya menghasilkan bug yang senyap.

### 4.1 Migrasi dijalankan MANUAL setelah deploy

Konsekuensinya: **kode harus hidup pada database yang belum dimigrasi.** Karena itu kolom baru dibaca
dengan cadangan (`pilihToleran` di `src/lib/data/publik.ts`, `kolomKuotaHilang` di `kuota-event.ts`,
`tabelProfilHilang` di `psikolog-profil.ts`), dan penulisan dicoba ulang tanpa kolom baru.

**Arah cadangannya dipilih dari pertanyaan "apa yang BOCOR kalau saya salah", bukan dari kebiasaan.**
Untuk kolom yang menentukan siapa boleh melihat sesuatu, cadangan yang salah arah membuka materi kepada
semua orang. Lihat BUG-04 — itu bug yang lahir persis dari kebiasaan "supaya tak gagal total".

### 4.2 Waktu selalu WIB (UTC+7); Postgres tidak tahu itu

`current_date` dan `now()::date` di Postgres memakai **UTC**. Antara 00:00–07:00 WIB, keduanya masih
menyebut tanggal kemarin. Semua batas hari/bulan di aplikasi ini dihitung di TypeScript:

- `src/lib/domain/laporan-bulanan.ts` → `rentangBulan(ym)`, `bulanWib(iso)`, `bulanTerakhir()`
- `src/lib/domain/saring.ts` → `tanggalWibDariISO(iso)`, `dalamRentang()`
- `src/lib/domain/gamifikasi.ts` → `tanggalWIB()`
- Di SQL, fungsi `hari_ini_wib()` — dan hak `execute`-nya harus dicabut dari `anon` (BUG-09)

### 4.3 Batasi dengan KUNCI yang bicara, jangan sembunyikan

Materi yang belum waktunya **tampil terkunci 🔒 beserta alasannya** ("terbuka pada bulan ke-4 langganan
Bima"), bukan hilang dari daftar. Alasannya bukan estetika: daftar yang menyusut tanpa keterangan
membuat orang tua menyimpulkan aplikasinya rusak, lalu melaporkannya sebagai data hilang — dan Anda akan
mencari bug yang tak ada.

### 4.4 Tidak ada pemotongan senyap

Setiap daftar yang dipotong **wajib** menyebut sisanya: `…dan N lainnya`, `…N penilaian lain — lihat di
aplikasi`. Berlaku di layar maupun di JPEG. Cari calon pelanggaran dengan `rg 'slice\(0,' src/` lalu
periksa apakah ada pemberitahuan sesudahnya.

### 4.5 Snapshot menyimpan MAKNA saat itu

`evaluasi_kurikulum.hasil` menyimpan **kalimat butirnya**, bukan indeks. `kegiatan_anak.judul`,
`catatan_perkembangan.penilaian`, dan rentang usia di `kelas_bermain` juga snapshot. Sebabnya: begitu
admin menyunting kalimatnya, rapor bulan lalu **tidak boleh berubah artinya**. Menyimpan `[true,false]`
beracuan indeks membuat rapor lama berbohong saat urutan butir bergeser.

Harga dari keputusan ini adalah BUG-02: snapshot bisa basi, dan menyegarkannya butuh kerja eksplisit.

### 4.6 Aturan bisnis hidup di `domain/`, dan ada test-nya

Kalau Anda menambahkan aturan (siapa boleh apa, berapa harganya, bulan ke berapa) dan menaruhnya di
`page.tsx` atau di berkas `-actions`, aturan itu **tak bisa diuji** dan akan tersalin ke tempat lain
dengan versi yang sedikit berbeda. Taruh di `src/lib/domain/`, beri test, lalu **uji daya gigit test-nya**
(§2.4).

---

## 5. Peta fitur → berkas → fungsi

Kolom **Domain** adalah tempat aturannya; itu yang biasanya salah kalau *angkanya* keliru. Kolom **Baca**
biasanya salah kalau *datanya tak muncul*. Kolom **Tulis** biasanya salah kalau *simpan tak berefek*.

### 5.1 Kurikulum / Ide Bermain (fitur paling banyak bug — mulai dari sini)

| Bagian | Berkas | Fungsi kunci |
|---|---|---|
| Halaman user | `src/app/kelas-saya/`, `kelas/[id]/`, `ortu/[anakId]/`, `main/[anakId]/`, `coba/kelas/[id]/`, `coba/tema/[id]/` | — |
| Halaman admin | `src/app/admin/kelas-bermain/`, `admin/kategori-usia/`, `admin/tema/[id]/`, `admin/fokus-area/` | — |
| Komponen | `src/components/KelasIsi.tsx` | checklist evaluasi + tombol game + simpan |
| **Jam kurikulum** | `src/lib/domain/siklus-kurikulum.ts` | `siklusBerjalan`, `konteksKurikulum`, `bracketUntukUmur`, `statusTemaBracket`, `kunciKarena`, `kelompokTemaBracket`, `saringBerkategori`, `adaTemaUntukBracket`, `tambahBulan`, `bulanPenuhLewat` |
| Aturan tema | `src/lib/domain/kurikulum.ts` | `statusTema`, `kelompokTema`, `temaTerkunci`, `posisiBerikutnya`, `posisiTema`, `teksPosisi`, `salinTemaKeKategoriLain`, `cocokUsia`, `ringkasEvaluasi`, `susunHasilEvaluasi`, `evaluasiPerAktivitas`, `bulanKurikulumAnak` |
| Kategori usia | `src/lib/domain/kategori-usia.ts` | `tumpukanKategori`, `petaUmurKategori`, `kategoriTanpaTema` |
| Baca | `src/lib/data/kurikulum.ts` | `getKonteksKurikulumAnak`, `getBulanKurikulumAnak`, `getBulanKurikulumBanyak`, `getEvaluasiAnak`, `getEvaluasiTema` |
| Baca katalog | `src/lib/data/publik.ts` | `getKelasPublik`, `getTemaPublik`, `getKelasAktifCached` (**ter-cache, tag `katalog`**), `pilihToleran` |
| Baca admin | `src/lib/data/kelas-bermain.ts`, `kategori-usia.ts` | `getKelasAktif`, `getKelasSemua`, `getKategoriUsiaSemua`, `getKategoriUsiaAktif` |
| Tulis | `src/lib/data/kelas-bermain-actions.ts` | `buatKelas`, `updateKelas`, `toggleStatusKelas`, `hapusKelas`, `setBolehTrialKelas`, `denganRentangKategori` (internal) |
| Tulis | `src/lib/data/kategori-usia-actions.ts` | `buatKategoriUsia`, `updateKategoriUsia`, `hapusKategoriUsia` |
| Tulis | `src/lib/data/kurikulum-actions.ts` | `simpanEvaluasi` |
| Catatan tema | `src/lib/data/catatan-tema.ts` / `-actions.ts` | `getCatatanTemaAnak`, `getCatatanTemaSaya`, `getAnakBerevaluasi`, `simpanCatatanTema` |
| Tabel | `kelas_bermain` (kolom `jenis`, `bulan_kurikulum`, `urutan`, `kategori_usia_id`, `boleh_trial`, `aktivitas jsonb`), `kategori_usia`, `evaluasi_kurikulum` (**unique `anak_id, kelas_id, peran`**), `catatan_tema`, `langganan_anak.kurikulum_mulai` | — |
| Migrasi terkait | `0098_kurikulum.sql`, `0101_kelas_kategori_usia.sql`, `0102_kurikulum_posisi_unik.sql`, `0103_posisi_per_kategori.sql`, `0104_kurikulum_mulai.sql`, `0105_kelas_jenis.sql` | — |

**Yang harus Anda pahami sebelum menyentuh fitur ini:**

- **Kunci itu milik ANAK, bukan akun.** Kakak bisa di bulan ke-3 sementara bayi di bulan ke-1, dan tema
  bulan ke-3 memang harus terkunci untuk bayi. Setiap halaman kurikulum wajib tahu **anak siapa** yang
  sedang dibuka (`anakId` atau `?anak=`).
- **Bracket usia dihitung ULANG di awal setiap siklus, lalu dibekukan sepanjang siklus itu.** Anak yang
  ulang tahun di tengah bulan tidak berpindah tema. Siklus berikutnya barulah usianya dihitung lagi.
- **Bayaran membatasi TOTAL bulan, bukan per kategori.** 3 bulan dibayar = Baby 1, Baby 2, Batita 1 — lalu
  berhenti. Lihat BUG-07b.
- **`jenis = 'event'`** adalah materi untuk acara offline: tak tampil di Ide Bermain, tak mempengaruhi
  penomoran bulan/urutan. Indeks unik posisi hanya berlaku untuk `jenis = 'tema'`.
- **`peran` ikut di dalam kunci unik `evaluasi_kurikulum`.** Penilai boleh orang tua MAUPUN
  guru/psikolog; tanpa `peran` di kuncinya, checklist guru akan **menimpa** checklist orang tua pada tema
  yang sama — kehilangan data yang tak terlihat sampai rapornya dicetak.
- **"4 tema per bulan" adalah aturan ISI, bukan hukum kode.** Kode menyimpan "bulan ke-N"; admin
  diperingatkan bila sebuah bulan berisi ≠ 4 tema. Memaksa tepat 4 di kode akan menyembunyikan tema ke-5.

### 5.2 Langganan bertingkat, tagihan, voucher

| Bagian | Berkas | Fungsi kunci |
|---|---|---|
| Halaman | `src/app/langganan/`, `admin/langganan/`, `admin/paket/`, `admin/voucher/`, `admin/pengaturan-trial/`, `admin/pengaturan-bayar/` | — |
| Domain | `src/lib/domain/entitlement.ts` | `hakAksesAnak`, `hakAksesAkun`, `bolehBukaTema`, `tambahHari` |
| Domain | `src/lib/domain/trial.ts` | `computeTrialEnd`, `statusLangganan`, `bolehAkses` |
| Domain | `src/lib/domain/langganan-harga.ts` | `hitungTagihan`, `aturanKeluargaTerpakai` |
| Domain | `src/lib/domain/harga.ts` | `hargaProdukUntuk`, `hargaEventUntuk`, `persenUntukPaket`, … |
| Domain | `src/lib/domain/voucher.ts` | `validasiVoucher`, `hitungPotongan`, `adaCakupan` |
| Domain | `src/lib/domain/laporan.ts` | `ringkasanLangganan` |
| Baca | `src/lib/data/langganan-anak.ts` | `getHakAnak`, `getHakAkun`, `ringkasLanggananAkun`, `barisLanggananAnak` |
| Baca | `src/lib/data/langganan-status.ts` | `getStatusLangganan`, `getStatusSaya`, `dibatasiTrial` |
| Baca | `src/lib/data/paket.ts`, `tagihan.ts`, `voucher.ts` | `getPaketAktif`, `getPaketMap`, `paketBelumSiap`, `getTagihanSaya`, `getTagihanMenunggu`, `nilaiVoucherByKode` |
| **Tulis (satu-satunya titik perpanjangan)** | `src/lib/data/langganan-anak-actions.ts` | **`setPaketAnak(anakId, paketId, bulan)`**, `hentikanPaketAnak` |
| Tulis | `src/lib/data/tagihan-actions.ts`, `tagihan-admin-actions.ts` | `buatTagihan`, `unggahBuktiTagihan`, `batalkanTagihan`, `setPaketBerikutnya`, **`verifikasiTagihan`**, `tolakTagihan` |
| Tulis | `src/lib/data/paket-actions.ts`, `voucher-actions.ts`, `admin-bisnis.ts` | `buatPaket`, `updatePaket`, `buatVoucher`, `cekVoucher`, `aktifkanLangganan`, `simpanPengaturanTrial` |
| Tabel | `paket`, `langganan_anak`, `tagihan_langganan`, `tagihan_langganan_item`, `voucher`, `pengaturan_trial`, `pengaturan_bayar` | — |

**`setPaketAnak` adalah satu-satunya tempat periode langganan diperpanjang** — dipakai admin manual DAN
oleh `verifikasiTagihan`. Kalau penghitung bulan kurikulum salah, di sinilah tempatnya, bukan di
halamannya. Sengaja satu titik supaya tak ada dua jalur yang bisa berbeda.

**Status diturunkan dari ANAK, bukan dari baris akun.** Ada commit khusus untuk itu
(`fix(langganan): status di Beranda & Akun diturunkan dari ANAK`). Satu akun bisa punya beberapa anak
dengan paket berbeda; menyimpulkan status dari akun akan salah untuk sebagian anaknya.

### 5.3 Konsultasi psikolog

| Bagian | Berkas | Fungsi kunci |
|---|---|---|
| Halaman | `src/app/konsultasi/`, `konsultasi/[pendaftaranId]/`, `psikolog/`, `psikolog/[pendaftaranId]/`, `psikolog/jadwal/`, `admin/psikolog/` | — |
| Domain | `src/lib/domain/konsultasi-slot.ts` | `keadaanSlot`, `memakaiSlotKonsultasi`, `draftKedaluwarsa` |
| Domain | `src/lib/domain/konsultasi-biaya.ts` | `hitungBiayaKonsultasi` |
| Domain | `src/lib/domain/kuota-konsultasi.ts` | `sisaKuotaKonsultasi`, `labelKuotaKonsultasi` |
| Domain | `src/lib/domain/jadwal.ts` | `jadwalTeks` |
| Baca | `src/lib/data/konsultasi.ts` | `getPsikologTersedia`, `getKonsultasiSaya`, **`getKonsultasiAnak`**, `getPesan`, **`getRekomendasiAnak`** |
| Baca | `src/lib/data/psikolog.ts`, `psikolog-profil.ts`, `konsultasi-tarif.ts`, `konsultasi-bayar.ts` | `getSesiPsikolog`, `getJadwalSaya`, `getPendaftaranById`, `getProfilPsikolog`, `getPratinjauKonsultasi`, `getKonsultasiMenungguBayar` |
| Tulis | `src/lib/data/konsultasi-actions.ts` | `daftarKonsultasi`, `kirimPesan`, `selesaikanKonsultasi`, `batalKonsultasi`, `unggahBuktiKonsultasi` |
| Tulis | `src/lib/data/psikolog-actions.ts` | `simpanJadwal`, `setStatusKonsultasi`, `mulaiKonsultasi`, **`simpanRekomendasi`** |
| Tulis | `src/lib/data/admin-psikolog-actions.ts`, `konsultasi-bayar-actions.ts` | `jadikanPsikolog`, `setTarifKonsultasi`, `verifikasiBayarKonsultasi` |
| Rekomendasi item | `src/lib/data/rekomendasi-item.ts` / `-actions.ts` | `getKatalogRekomendasi`, `getRekomendasiItemAnak`, `tambahRekomendasiItem` |
| Tabel | `jadwal_psikolog`, `pendaftaran_konsultasi`, `pesan_konsultasi`, `rekomendasi_psikolog`, `rekomendasi_item` | — |
| Migrasi | `0065_konsultasi.sql` (+ RLS & `sisa_kuota_konsultasi`), `0092`, `0097` | — |

**Perangkap khas fitur ini:** `rekomendasi_psikolog.ortu_id` **diisi dari kiriman form psikolog**, dan
policy bacanya `ortu_id = auth.uid()`. Kalau nilainya keliru, barisnya tersimpan dan terlihat oleh admin
& psikolog, tapi **orang tua tak akan pernah bisa membacanya** — tanpa galat apa pun. Lihat BUG-08.

### 5.4 Rapor bulanan & laporan perkembangan

| Bagian | Berkas | Fungsi kunci |
|---|---|---|
| Halaman | `src/app/anak/[anakId]/rapor/[ym]/page.tsx`, `anak/[anakId]/laporan/`, `anak/[anakId]/` | — |
| Komponen | `src/components/LaporanAnakView.tsx`, `UnduhRaporBtn.tsx` | — |
| Domain | `src/lib/domain/laporan-bulanan.ts` | **`ringkasBulan`**, `rentangBulan`, `bulanWib`, **`bulanRekomendasi`**, `bulanTerakhir`, `labelBulan`, `hitungArea`, `rapikanDaftar` |
| Domain | `src/lib/domain/laporan-anak.ts` | `laporanAnak` |
| Gambar | `src/lib/rapor-jpeg.ts` | `buatRaporJpeg` — A4 **portrait** 2480×3508, bisa 1 atau 2 halaman |
| Baca | `src/lib/data/kegiatan.ts`, `catatan.ts`, `catatan-tema.ts`, `kurikulum.ts`, `konsultasi.ts`, `game-hasil.ts` | `getKegiatanAnak`, `getCatatanAnak`, `getCatatanTemaAnak`, `getEvaluasiAnak`, `getRekomendasiAnak`, `getRingkasGameAnak` |
| Tulis | `src/lib/data/kegiatan-actions.ts` | `catatKegiatan` |
| Tabel | `kegiatan_anak`, `hasil_main`, `catatan_perkembangan`, `catatan_tema`, `evaluasi_kurikulum`, `rekomendasi_psikolog`, `rekomendasi_item` | — |

**Tiga hal yang membuat rapor sering terlihat "salah" padahal datanya benar:**

1. **Definisi metrik.** "Sesi game" dan "menit" HANYA dari `hasil_main`; `kegiatan_anak` tak punya kolom
   durasi sama sekali. Karena itu angka keempat di rapor adalah **Total aktivitas**, bukan "total waktu
   main" — anak yang mengerjakan 9 Ide Bermain tanpa menyentuh game dulu mendapat rapor berbunyi "0 m",
   dan itu terbaca seperti rapor rusak.
2. **Jangkar bulan.** Tiap sumber punya kolom waktunya sendiri: `hasil_main.tanggal` (**bukan**
   `created_at`), `evaluasi_kurikulum.updated_at` (waktu orang tua menyimpan), `rekomendasi_psikolog` →
   **tanggal konsultasinya** lewat `bulanRekomendasi`. Salah kolom = data "hilang" dari bulan itu.
3. **Tata letak JPEG.** Lihat §2.6 dan BUG-11.

### 5.5 Event, pendaftaran, sertifikat, stiker

| Bagian | Berkas | Fungsi kunci |
|---|---|---|
| Halaman | `src/app/event/`, `event/[id]/daftar/`, `admin/event/`, `admin/event/[id]/pendaftar/`, `admin/event/[id]/cetak-peserta/`, `guru/`, `guru/[eventId]/`, `catatan/[eventId]/`, `sertifikat/[id]/`, `stiker-event/[id]/` | — |
| Domain | `src/lib/domain/stiker.ts` | `ukuranNama` |
| Baca | `src/lib/data/event.ts` | `getEventTampil`, `getEvent`, `getEventDiikuti`, `getPendaftaranSaya`, `getKuotaEvent`, `sisaKuota`, `getKuotaTerpakai` |
| Baca | `src/lib/data/admin-event.ts`, `guru.ts`, `sertifikat.ts`, `kuota-event.ts` | `getEventAdmin`, `getPendaftaranByEvent`, `getJumlahPendaftar`, `getPesertaEvent`, `getSertifikatAnak`, `bacaKuotaEvent`, `kolomKuotaHilang` |
| Tulis | `src/lib/data/event-actions.ts` | `daftarEvent` |
| Tulis | `src/lib/data/admin-event-actions.ts` | `buatEvent`, `updateEvent`, `setStatusPendaftaran`, `setKehadiran`, **`reschedulePendaftaran`**, `pindahKelasPendaftaran`, `simpanParameterPerkembangan`, `duplikatParameterPerkembangan`, `getPesertaEkspor` |
| Tulis | `src/lib/data/guru-actions.ts`, `admin-sertifikat-actions.ts` | `simpanCatatan`, `generateSertifikatEvent`, `hapusSertifikat` |
| Tabel | `event`, `pendaftaran_event`, `catatan_perkembangan`, `sertifikat` | — |

`reschedulePendaftaran` wajib **memperbarui snapshot kelas & jadwal** saat pendaftar dipindah, dan **tidak
boleh** menjatuhkannya ke kuota Gabungan tanpa ditanya — dua bug yang pernah terjadi berurutan
(BUG-02, kelas snapshot).

### 5.6 Game & gamifikasi

| Bagian | Berkas | Fungsi kunci |
|---|---|---|
| Halaman | `src/app/main/[anakId]/`, `pilih-game/[anakId]/`, `pilih-anak/` | `MenuAnak.tsx` (`paketAwal`, `onKeluar`, `?kembali=`) |
| Mesin game | `src/lib/game/*` (+ `src/lib/game/__tests__`) | satu mesin per jenis (`ingatan`, `calistung`, `hitung`, `urutan`, `mewarnai`, `koding`, `ejakata`, …) |
| Domain | `src/lib/domain/skor.ts`, `gamifikasi.ts`, `tantangan-kustom.ts`, `waktu.ts` | `hitungBintang`, `evaluasiLencana`, `tantanganHariIni`, `progresTantangan`, `progresTantanganKustom`, `cocokItem`, `sisaDetik`, `kunciHari` |
| Baca | `src/lib/data/game-pilihan.ts`, `gamifikasi.ts`, `game-hasil.ts`, `aktivitas.ts` | `getOpsiGame`, `getGamifikasiAnak`, `getRingkasGameAnak`, `getAktivitasRingkas` |
| Tulis | `src/lib/data/skor.ts`, `skor-core.ts`, `aktivitas-actions.ts`, `tantangan-kustom-actions.ts` | `catatHasil`, `catatHasilCore`, `catatAktivitas`, `simpanTantangan` |
| Tabel | `paket_aset` (kolom `mesin` ber-CHECK), `hasil_main`, `aktivitas_anak`, `tantangan_kustom` | — |

**Menambah jenis game baru butuh migrasi**: nilai `mesin` yang baru harus didaftarkan ke CHECK
`paket_aset_mesin_check`, jika tidak insert-nya ditolak database. Pernah terjadi dua kali (mesin
`calistung` → migrasi 0074, mesin `ingatan` → migrasi 0080). Lihat BUG-10.

### 5.7 Store, keranjang, pesanan

| Bagian | Berkas | Fungsi kunci |
|---|---|---|
| Halaman | `src/app/store/`, `store/[id]/`, `keranjang/`, `pesanan/`, `pesanan/[id]/`, `admin/produk/`, `admin/pesanan/` | — |
| Domain | `src/lib/domain/harga.ts`, `voucher.ts` | `hargaProdukUntukPaket`, `validasiVoucher` |
| Baca | `src/lib/data/store.ts`, `keranjang.ts`, `pesanan.ts`, `admin-store.ts` | `getProdukTampil`, `getKeranjang`, `getJumlahKeranjang`, `getPesananSaya`, `getPesananSemua` |
| Tulis | `src/lib/data/keranjang-actions.ts` | `tambahKeranjang`, `setQtyKeranjang`, `hapusKeranjang`, **`checkout`** |
| Tulis | `src/lib/data/admin-store-actions.ts`, `pesanan-actions.ts` | `buatProduk`, `setOngkir`, `verifikasiPesanan`, `setResi`, `ubahStatusPesanan`, `uploadBuktiPesanan` |
| Tabel | `produk`, `keranjang`, `pesanan`, `pesanan_item` | — |

### 5.8 Keuangan (internal)

| Bagian | Berkas | Fungsi kunci |
|---|---|---|
| Halaman | `src/app/admin/keuangan/**` (transaksi, expense, anggaran, aset, pajak, kpi, insight, laporan, master), `investor/` | — |
| Baca | `src/lib/data/keuangan.ts` | `getDashboardKeuangan`, `getLedger`, `getPerBulan`, `getPerKategori`, `getTransaksiDetail`, `getAset` |
| Baca | `src/lib/data/anggaran.ts`, `kpi.ts`, `sponsor.ts`, `investor.ts` | `getAnggaranBulan`, `getBudgetMap`, `getForecast`, `getKpi`, `getInsight`, `getRingkasanSponsor` |
| Tulis | `src/lib/data/keuangan-actions.ts`, `anggaran-actions.ts`, `sponsor-actions.ts` | `catatPengeluaran`, `hapusTransaksi`, `simpanAset`, `simpanAnggaran`, `simpanDeal`, `generateInvoice`, `catatPembayaran` |
| **Buku besar** | `src/lib/data/ledger.ts` | `catatLedger`, `hapusLedgerRef` |
| Tabel | `transaksi`, `kategori_pengeluaran`, `kategori_aset`, `aset`, `anggaran`, `sponsor`, `deal_sponsor` | — |

`catatLedger` dipanggil dari alur lain (verifikasi tagihan, pesanan) — kalau angka keuangan tak cocok
dengan penjualan, telusuri siapa yang memanggil `catatLedger` / `hapusLedgerRef`, jangan mulai dari
halaman keuangannya.

### 5.9 Konten, komunitas, worksheet

| Bagian | Berkas | Fungsi kunci |
|---|---|---|
| Halaman | `src/app/artikel/`, `artikel/[slug]/`, `komunitas/`, `komunitas/[postId]/`, `favorit/`, `admin/artikel/`, `admin/video/`, `admin/komunitas/`, `admin/feedback/` | — |
| Baca | `src/lib/data/artikel.ts` | `getArtikelTerbit`, `getArtikelBySlugCached` (**cache tag `artikel`**) |
| Baca | `src/lib/data/komunitas.ts`, `video.ts`, `pustaka.ts`, `panduan.ts`, `favorit.ts`, `feedback.ts` | `getFeed`, `getPostingan`, `getVideoByKategori`, `getPustaka`, `getModeOrtu`, `getFavoritKelas`, `getFeedbackAdmin` |
| Tulis | `src/lib/data/artikel-admin.ts`, `admin-konten.ts` | `simpanArtikel`, `hapusArtikel`, `buatVideo`, `setBolehTrialTema`, `setMingguIni`, `simpanPanduan`, `ekstrakYoutubeId` |
| Tulis | `src/lib/data/komunitas-actions.ts`, `admin-komunitas.ts`, `feedback-actions.ts`, `favorit-actions.ts` | `buatPostingan`, `toggleSuka`, `lapor`, `moderasiPostingan`, `tuntaskanLaporan`, `kirimFeedback`, `toggleFavorit` |
| Worksheet | `src/lib/domain/kuota-worksheet.ts`, `src/lib/data/worksheet.ts` / `-actions.ts` | `sisaKuotaWorksheet`, `sisaWorksheetAkun`, `awalPeriode`, `getStatusWorksheet`, `mintaWorksheet` |

### 5.10 Admin, peran, akses menu

| Bagian | Berkas | Fungsi kunci |
|---|---|---|
| Middleware | `src/proxy.ts`, `src/lib/menu-admin.ts` | `keyMenuDariPath`, `menuUntukRole`, `DEFAULT_AKSES` |
| Gerbang peran | `src/lib/data/admin.ts` | **`getAdminTerjamin`**, `getSuperuserTerjamin`, `getAksesAdmin` |
| Gerbang peran | `src/lib/data/guru.ts`, `psikolog.ts`, `investor.ts`, `anak.ts` | `getGuruTerjamin`, `getPsikologTerjamin`, `getInvestorTerjamin`, `getAnakTerjamin` |
| Baca | `src/lib/data/admin-users.ts`, `pengaturan-menu.ts` | `getDaftarUser`, `getMenuAkses`, `getFiturAkses` |
| Tulis | `src/lib/data/admin-users-actions.ts`, `admin-bisnis.ts`, `admin-guru-actions.ts` | `setRole`, `buatUser`, `tambahUserRole`, `simpanMenuAkses`, `simpanFiturAkses`, `jadikanGuru`, `cabutGuru` |
| Tulis | `src/lib/data/ortu-actions.ts` | `updateAnak`, `setBatas`, `hapusAnak`, `simpanProfilPengiriman`, `setPin` |
| SQL | fungsi `is_admin()`, `is_guru()`, `is_psikolog()`, `boleh_lihat_laporan_anak()`, `hari_ini_wib()` | dipakai di policy RLS |

Pola `get<Peran>Terjamin` adalah **satu-satunya** gerbang peran yang sah — ia membaca peran dari database
dan memantulkan yang tak berhak. Jangan menulis pemeriksaan peran sendiri di `page.tsx`; satu akun bisa
merangkap beberapa peran, dan versi sendiri akan salah untuk kasus itu.

---

## 6. Katalog bug yang sering terjadi

Format tiap entri: **Gejala → Akar → Tempat → Cara membuktikan → Cara memperbaiki.**

---

### BUG-01 · Perubahan admin tersimpan, tapi halaman pengguna tetap yang lama

**Gejala.** Admin menyimpan, muncul "berhasil", data di halaman admin ikut berubah — tapi halaman
pengguna masih menampilkan versi lama. Bisa bertahan berjam-jam. Tak ada galat.

**Akar.** Pembaca publik memakai `unstable_cache` bertag (agar bisa di-cache lintas-user), dan Server
Action yang menulisnya **lupa memanggil `updateTag`**.

**Tempat.**
- Pembaca ter-cache: `src/lib/data/publik.ts` → `getKelasAktifCached` (tag **`katalog`**);
  `src/lib/data/artikel.ts` → `getArtikelTerbitCached`, `getArtikelBySlugCached` (tag **`artikel`**)
- Penulis yang wajib menyegarkan: `kelas-bermain-actions.ts`, `kategori-usia-actions.ts`,
  `admin-store-actions.ts`, `artikel-admin.ts`

**Cara membuktikan.** Bandingkan **halaman admin** (tak ter-cache) dengan **halaman pengguna**. Kalau
admin benar dan pengguna lama → cache. Kalau keduanya lama → tulisannya yang gagal, bukan cache.

**Cara memperbaiki.** Tambahkan `updateTag('<tag>')` di **setiap** cabang sukses action-nya — termasuk
cabang cadangan pra-migrasi. Di `kelas-bermain-actions.ts` ada tiga cabang keluar (kolom baru berhasil,
kolom baru gagal lalu diulang tanpa kolom itu, dan jalur biasa); melewatkan satu cabang menghasilkan bug
yang **kadang** muncul, dan bug yang kadang muncul jauh lebih mahal daripada bug yang selalu muncul.

Rujukan: `fix(ide bermain): perubahan tak pernah tayang — cache katalog tak disegarkan`.

---

### BUG-02 · Angka atau label membangkang: SNAPSHOT vs MASTER

**Gejala.** Admin mengubah rentang usia sebuah kategori dari "1–3 th" ke "2–3 th". Kartu Ide Bermain
tetap menulis "1–3 th". Membuka materinya dan menekan Simpan **tidak menolong**.

**Akar — dua lapis, dan lapis kedua yang mengecoh:**
1. Rentang usia di baris materi adalah **snapshot** dari kategorinya (sengaja — §4.5). Mengubah master
   tidak mengubah snapshot.
2. Menyimpan ulang materinya juga tak menolong, karena **form mengirim balik nilai LAMA** yang ia baca
   saat Edit dibuka. Penyegaran hanya terjadi bila admin kebetulan menyentuh dropdown kategorinya.

**Tempat.** `src/lib/data/kategori-usia-actions.ts:65` (`updateKategoriUsia`),
`src/lib/data/kelas-bermain-actions.ts:49` (`denganRentangKategori`).

**Cara membuktikan.** Baca baris `kelas_bermain` langsung di Supabase SQL Editor dan bandingkan kolom
rentangnya dengan `kategori_usia`. Kalau berbeda, ini bug-nya — bukan bug tampilan.

**Cara memperbaiki.** Dua-duanya, dan keduanya di SERVER:
- Saat master diubah → **jalarkan** ke snapshot di `kelas_bermain` dan `paket_aset`.
- Saat materi disimpan → snapshot **diturunkan di server dari master**, bukan dipakai apa adanya dari form.

Menambal hanya salah satunya menyisakan satu jalan bagi angka basi untuk kembali.

**Keluarga bug yang sama** (semuanya snapshot yang bisa basi): judul kelas di `kegiatan_anak`, nama anak
di `sertifikat` (`fix(sertifikat): tampilkan NAMA LENGKAP anak, termasuk pada sertifikat lama`), snapshot
kelas & jadwal saat reschedule (`fix(reschedule): perbarui snapshot kelas & jadwal`).

> **Kalau Anda hanya membaca satu entri dari dokumen ini, baca yang ini.** Saran "coba buka lalu simpan
> ulang" pernah diberikan untuk bug ini dan **salah** — form mengirim balik snapshot basi, jadi menyimpan
> ulang tidak mengubah apa pun. Gejalanya persis sama dengan bug cache (BUG-01), dan cara membedakannya
> hanya satu: **baca barisnya di database.**

---

### BUG-03 · Halaman mati atau daftar kosong setelah deploy (migrasi belum jalan)

**Gejala.** Setelah deploy, halaman 500 atau daftar tiba-tiba kosong. Di lokal semuanya normal.

**Akar.** Kode membaca kolom/tabel yang migrasinya **belum dijalankan** di produksi. Migrasi di proyek ini
dijalankan **manual, sesudah deploy** (§4.1).

**Tempat.** Pola cadangan yang benar: `pilihToleran` (`src/lib/data/publik.ts`), `kolomKuotaHilang`
(`kuota-event.ts`), `tabelProfilHilang` (`psikolog-profil.ts`).

**Cara membuktikan.** Probe REST dengan kolom kontrol palsu (§2.5). `42703` pada kolom yang dicari =
migrasi belum jalan. `42P01` = tabelnya belum ada.

**Cara memperbaiki.** Jalankan migrasinya. Lalu, supaya tak terulang: setiap kolom baru dibaca lewat
`pilihToleran` (dua daftar kolom: baru dan lama), dan setiap penulisan mencoba tanpa kolom baru bila
percobaan pertama gagal. **Lalu baca BUG-04 sebelum memilih arah cadangannya.**

---

### BUG-04 · Cadangan pra-migrasi gagal ke arah TERBUKA (materi bocor)

**Gejala.** Materi yang ditandai admin sebagai "bukan untuk pengguna" (jenis Event) justru **paling mudah
dilihat** — muncul untuk semua orang tua, terbuka penuh.

**Akar.** Cadangan versi pertama menyimpan materi EVENT sebagai tema biasa "supaya tak gagal total". Baris
itu lahir dengan `jenis` bawaan `'tema'` dan posisi `0/0` — yaitu **tema tanpa posisi**, yang saat itu
diperlakukan sebagai **terbuka**. Dua kelonggaran yang masing-masing masuk akal bertemu dan menghasilkan
kebocoran.

**Tempat.** `src/lib/data/kelas-bermain-actions.ts:175`, `src/lib/domain/siklus-kurikulum.ts:299`.

**Cara membuktikan.** Buka halaman kurikulum sebagai orang tua dari akun tanpa langganan. Materi Event
tidak boleh terlihat sama sekali.

**Cara memperbaiki.** Tiga hal sekaligus:
1. Cadangan pra-migrasi **hanya untuk `'tema'`**; menyimpan EVENT sebelum kolom `jenis` ada **ditolak**
   dengan pesan yang menyebut nomor migrasinya — gagal-dengan-pesan-jelas lebih baik daripada tersimpan
   salah arti.
2. Tema **ber-kategori** tanpa posisi → **terkunci**, bukan terbuka.
3. Kelonggaran "tanpa posisi = terbuka" hanya berlaku untuk materi lama tanpa kategori, yang lewat jalur
   `TANPA_BRACKET` — jalur yang berbeda.

**Aturan yang harus Anda pegang:** arah cadangan dipilih dengan bertanya **"apa yang bocor kalau saya
salah?"**, bukan dengan kebiasaan "jangan sampai gagal". Untuk kolom yang menentukan **siapa boleh
melihat**, cadangan yang salah arah adalah lubang keamanan, bukan ketidaknyamanan.

Rujukan: `fix(ide-bermain): cadangan pra-migrasi jangan gagal ke arah TERBUKA`.

---

### BUG-05 · Data "hilang" di batas hari atau bulan (WIB vs UTC)

**Gejala.** Kegiatan malam tanggal 31 muncul di bulan berikutnya. Catatan yang diisi pukul 01:00 WIB
terhitung di tanggal kemarin. Streak harian terputus padahal anak bermain tiap hari.

**Akar.** `created_at` adalah `timestamptz` **UTC**. `current_date` / `now()::date` di Postgres juga UTC.
Antara 00:00–07:00 WIB, keduanya masih menyebut tanggal kemarin.

**Tempat.** `src/lib/domain/laporan-bulanan.ts` (`rentangBulan`, `bulanWib`),
`src/lib/domain/saring.ts` (`tanggalWibDariISO`, `dalamRentang`), `src/lib/domain/gamifikasi.ts`
(`tanggalWIB`), fungsi SQL `hari_ini_wib()`.

**Cara membuktikan.** Tulis test dengan cap waktu **di dalam jendela 17:00–24:00 UTC** (= 00:00–07:00 WIB
hari berikutnya) dan pastikan hasilnya masuk hari/bulan yang benar. Contoh: `2026-08-31T20:00:00Z` harus
terhitung **September**, bukan Agustus.

**Cara memperbaiki.** Hitung batas di TypeScript lewat helper domain yang sudah ada. Jangan
membandingkan cap waktu UTC dengan tanggal yang dipilih pengguna, dan **jangan** memakai `current_date`
di SQL untuk logika hari.

**Perangkap tambahan:** batas akhir rentang yang **eksklusif** membuat catatan pada tanggal `sampai`
lenyap. `dalamRentang` di `saring.ts` sengaja **inklusif di kedua ujung** dan menukar batas yang terbalik.

---

### BUG-06 · Jangkar waktu memakai kolom yang salah

**Gejala.** Rekomendasi psikolog untuk sesi 30 Agustus tidak ada di rapor Agustus — dan muncul di rapor
September, bulan yang tak punya sesi konsultasi sama sekali.

**Akar.** Disaring dengan `created_at`, yaitu **kapan psikolog mengetiknya** — sering beberapa hari
setelah sesinya. Kolom yang mewakili peristiwanya adalah **tanggal konsultasi**.

**Tempat.** `src/lib/domain/laporan-bulanan.ts` → `bulanRekomendasi(rek, tanggalKonsultasi)`;
dipakai di `src/app/anak/[anakId]/rapor/[ym]/page.tsx`.

**Cara membuktikan.** Buka rapor bulan sesi DAN bulan berikutnya. Kalau isinya muncul di bulan yang salah,
jangkarnya salah — bukan datanya hilang.

**Cara memperbaiki.** Pilih kolom yang **mewakili peristiwanya**, bukan yang paling mudah diambil.
Sediakan cadangan untuk baris yang tak punya relasi (rekomendasi lepas tanpa `pendaftaran_id` → pakai
`created_at`).

**Kolom waktu yang benar per sumber** — hafalkan atau salin:

| Tabel | Kolom waktu yang BENAR | Jangan pakai |
|---|---|---|
| `hasil_main` | `tanggal` | `created_at` (gagal SENYAP → sesi game selalu 0) |
| `evaluasi_kurikulum` | `updated_at` (saat ortu menyimpan) | `created_at` materinya |
| `rekomendasi_psikolog` | tanggal `pendaftaran_konsultasi`-nya | `created_at` |
| `pendaftaran_konsultasi` | `tanggal` (sudah tanggal LOKAL/WIB, **jangan digeser lagi**) | — |
| `catatan_tema` | `updated_at` | — |

---

### BUG-07 · Gerbang hak: memeriksa keberadaan paket, bukan STATUS-nya

**Gejala.** Anak yang masih **trial** bisa membuka tema yang akses trial-nya sudah dimatikan, lewat
tautan langsung.

**Akar.** Syaratnya ditulis `!paketTertinggi && boleh_trial === false`. Anak trial **punya** paket (paket
trial), jadi syarat itu tak pernah terpenuhi untuknya.

**Tempat.** `src/lib/domain/entitlement.ts:138` → `bolehBukaTema`; `src/lib/domain/trial.ts` →
`statusLangganan`.

**Cara membuktikan.** Uji dengan tiga akun: tanpa langganan, trial, berbayar. Bug seperti ini **selalu**
lolos kalau Anda hanya menguji dua.

**Cara memperbaiki.** Yang menentukan adalah **status** (`aktif` / `tenggang` / `trial` / `habis`), bukan
ada-tidaknya baris paket. `hakAksesAkun` mengembalikan `status`, dan `bolehBukaTema` memakai itu.

**Pesan galatnya juga bagian dari perbaikan.** Trial yang tak punya hak harus melihat **ajakan
berlangganan**, bukan "bulan ke-N masih ditutup" — itu dua keadaan yang berbeda, dan pesan yang salah
membuat orang tua (dan Anda) mengejar penyebab yang salah.

---

### BUG-07b · Batas bayar bocor saat kategori usia berganti

**Gejala.** Anak yang membayar 3 bulan lalu berhenti tetap bisa membuka bundel bulanan ke-4 dan ke-5
begitu kategori usianya berganti.

**Akar.** Batas dihitung **per kategori** (`min(dijalani[b], siklus)`), sehingga batas 3 bulan berlaku
untuk Baby DAN untuk Batita — masing-masing 3.

**Tempat.** `src/lib/domain/siklus-kurikulum.ts:174` → `konteksKurikulum`.

**Cara memperbaiki.** Bayaran membatasi **TOTAL** bulan yang diberikan, lintas kategori: 3 bulan dibayar =
Baby 1, Baby 2, Batita 1 — lalu berhenti sampai ada pembayaran berikutnya, yang membuka Batita 2.
`bracket` tetap kategori **hari ini**, apa pun hak bayarnya; hak hanya menentukan **berapa** bulan.

---

### BUG-08 · Barisnya ada, tapi pembacanya tak melihatnya (RLS)

**Gejala.** Data terlihat di panel admin tapi tidak di akun orang tua (atau sebaliknya). Query tidak
mengembalikan galat — ia mengembalikan `[]`.

**Akar.** RLS. `[]` dari PostgREST **tidak bisa dibedakan** antara "tak ada baris" dan "ada baris tapi
policy menutupnya".

**Tempat contoh.** `rekomendasi_psikolog` (`0065_konsultasi.sql`): policy baca
`ortu_id = auth.uid() or psikolog_id = auth.uid() or is_admin()`. Nilai `ortu_id` **diisi dari kiriman
form psikolog** (`simpanRekomendasi`) — kalau keliru, orang tua tak akan pernah bisa membacanya.

**Cara membuktikan — tiga langkah, urut:**
1. **Bandingkan dua peran.** Buka data yang sama sebagai admin dan sebagai orang tua. Muncul di admin
   saja → RLS/kepemilikan baris. Tak muncul di keduanya → tulisannya gagal atau jangkarnya salah.
2. **Buktikan tabel & kolomnya ada** dengan probe + kolom kontrol palsu (§2.5), supaya Anda tak mengejar
   masalah RLS yang sebenarnya masalah migrasi.
3. **Baca barisnya di Supabase SQL Editor** (melewati RLS). Kalau barisnya ada dengan `ortu_id` yang
   berbeda dari akun orang tua itu, Anda sudah menemukannya.

**Cara memperbaiki.** Jangan mengendurkan policy-nya. Perbaiki **penulisannya**: `ortu_id` harus
diturunkan di server dari kepemilikan anaknya, bukan diterima dari klien. Klien yang boleh memilih
`ortu_id` juga boleh menuliskan rekomendasi ke akun orang lain.

---

### BUG-09 · Fungsi Postgres bisa dipanggil dengan kunci anon

**Gejala.** Tidak ada gejala di UI. Kunci anon (yang ada di bundel JavaScript publik) bisa memanggil
fungsi `SECURITY DEFINER` lewat REST dan mendapat data lintas-akun.

**Akar.** Postgres memberi `EXECUTE` ke `PUBLIC` secara **bawaan** untuk fungsi baru. `revoke ... from
public` **tidak** menutup role `anon` dan `authenticated` yang mendapat hak secara terpisah.

**Tempat.** Semua `create function` di `supabase/migrations/`, khususnya yang `SECURITY DEFINER`
(mis. `sisa_kuota_konsultasi`, `hari_ini_wib`).

**Cara membuktikan.**

```bash
curl -s -X POST -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{}' "$URL/rest/v1/rpc/nama_fungsi"
```

Kalau membalas 200 dengan data, fungsinya terbuka.

**Cara memperbaiki.** **DUA** revoke, bukan satu:

```sql
revoke execute on function public.nama_fungsi(...) from public;
revoke execute on function public.nama_fungsi(...) from anon, authenticated;
grant  execute on function public.nama_fungsi(...) to authenticated;  -- bila memang perlu
```

Rujukan: `fix(sql): pencabutan hak fungsi butuh DUA revoke (0097)`,
`fix(sql): cabut execute anon dari hari_ini_wib`.

**Penjagaan di Edge Function / Server Action TIDAK menjaga RPC-nya.** Jalur REST langsung melewati
keduanya.

---

### BUG-10 · Migrasi gagal atau insert ditolak database

**Dua bentuk yang berbeda:**

**(a) Indeks unik dipasang sebelum datanya dirapikan.**
Migrasi 0102 gagal dengan `Key (bulan_kurikulum, urutan)=(1, 0) is duplicated`, sebab baris lama semuanya
berposisi `0`. **Perbaikan:** nomori ulang dulu, **baru** pasang indeksnya — dalam migrasi yang sama, urut.
Rujukan: `fix(migrasi 0102): nomori ulang posisi kurikulum dulu, baru kunci indeksnya`.

**(b) Nilai baru belum didaftarkan ke CHECK constraint.**
Menambah mesin game baru tanpa mendaftarkannya ke `paket_aset_mesin_check` → insert ditolak database.

Ini bukan kasus langka: **sepuluh migrasi di repo ini ada semata-mata untuk mendaftarkan satu nilai `mesin`
baru** — `0025_mesin_mewarnai`, `0029_mesin_dekode`, `0030_mesin_urutan`, `0031_mesin_jalur`,
`0032_mesin_hitung`, `0035_mesin_cocokkan`, `0036_mesin_ejakata`, `0037_mesin_garis`,
`0074_mesin_calistung`, `0080_mesin_ingatan`. Kalau Anda menambah mesin game, **migrasi itu bagian dari
pekerjaannya**, bukan pekerjaan susulan. Polanya: `drop constraint if exists` lalu `add constraint` dengan
daftar lengkap yang baru.

**Cara membuktikan.** Baca pesan galat SQL-nya apa adanya — Postgres menyebut nama constraint-nya. Ini
salah satu dari sedikit bug di dokumen ini yang **memang** memberi pesan jelas; jangan menebak-nebak
saat pesannya sudah ada.

**Aturan migrasi:** setiap migrasi harus **idempoten** (`create ... if not exists`, `drop policy if
exists` sebelum `create policy`, blok `do $$ ... $$` untuk CHECK) — sebab `migrasi.mjs` menjalankan
**semua** berkas, dan migrasi baru yang tidak idempoten akan membuat migrasi lama gagal lalu menghentikan
seluruh rantainya.

---

### BUG-11 · Tata letak gambar rusak, tapi semua gerbang mutu hijau

**Gejala.** Teks bertumpuk, batang progres menimpa baris berikutnya, satu bagian tak ikut tercetak, kartu
ber-tint menabrak footer, batang progres yatim di puncak halaman berikutnya.

**Akar.** Tata letak Canvas tidak diperiksa oleh apa pun. `tsc`, `eslint`, `npm test`, dan `npm run build`
semuanya hijau untuk gambar yang rusak total.

**Tempat.** `src/lib/rapor-jpeg.ts`, `src/lib/sertifikat-jpeg.ts`, `src/lib/kartu-bersama.ts`,
`src/lib/story-card.ts`.

**Cara membuktikan.** Render gambarnya (§2.6). Tidak ada jalan lain.

**Cara memperbaiki — dan hal-hal yang sudah terbukti mengecoh:**
- **Baseline, bukan tepi atas.** `barisRingkas`/`barisTeks` memakai `y` sebagai **baseline** dan
  mengembalikan baseline berikutnya. Menggambar batang di **bawah** baseline membuatnya menimpa baris
  selanjutnya.
- **Emoji dan judul 54px lebih tinggi daripada teks biasa.** Jarak yang pas-pasan akan tertimpa. Butuh
  tiga percobaan untuk menyadari ini.
- **`destination-over` tidak menghasilkan tint** kalau latar halaman sudah opak. Pakai
  `globalCompositeOperation = 'multiply'` **setelah** isinya digambar, dan **jepit** tingginya ke batas isi.
- **Tinggi teks tak bisa dihitung di muka** — ia bergantung pada pembungkusan kata dan pada `ukuranPas`
  yang mengecilkan huruf sampai muat. Karena itu keputusan 1-vs-2 halaman diambil dengan **menggambar satu
  halaman dulu lalu menghitung berapa banyak isi yang dipotong** (`terpotong`), bukan dengan mengukur
  sampai mana isinya turun. Percobaan pertama memakai cara mengukur dan **selalu** menyimpulkan dua
  halaman — sebab tata letaknya elastis (batas kolom & plafon diturunkan dari tinggi kanvas), jadi isinya
  ikut memanjang mengisi kanvas mana pun yang diberikan.
- **Anggaran daftar harus diturunkan dari tinggi halaman**, bukan angka tetap. Angka tetap adalah batas
  *jumlah*, bukan batas *ruang*: ia memotong isi, lalu penghitung `terpotong` membacanya sebagai "tidak
  cukup" dan memaksa halaman kedua padahal separuh halaman pertama masih kosong. Lihat `muat()` di
  `rapor-jpeg.ts`.
- **Jangan memaku titik mulai sebuah bagian ke plafon bagian di atasnya.** `Math.max(yR, plafonCatatan)`
  meninggalkan lubang kosong ketika bagian atas selesai lebih awal.
- **Kepala rapor tidak boleh memakai koordinat `y` tetap.** Begitu ada blok yang tingginya
  bergantung isi (kotak ringkasan naratif terbungkus 2 atau 4 baris), angka `y` yang dipaku
  membuat blok berikutnya tertimpa. Alirkan dari satu variabel berjalan.
- **Setiap baris baru di kaki halaman WAJIB menaikkan `TINGGI_KAKI`.** Batas isi diturunkan
  darinya; menambah baris kaki tanpa menaikkannya membuat kolom isi menabrak kakinya.
- **Selalu periksa tiga keadaan:** isi sedikit, isi banyak, keadaan kosong. Untuk rapor,
  tambahkan keadaan **"bulan pertama"** — tanpa usia, tanpa pembanding bulan lalu, tanpa tema
  bulan depan. Blok yang absen tak boleh meninggalkan lubang atau menggeser tata letak.

---

### BUG-11b · Penghitung yang boleh NEGATIF membalik sebuah keputusan

**Gejala.** Rapor bulanan **selalu** tercetak dua halaman padahal isinya sedikit — halaman
kedua nyaris kosong, hanya berisi satu blok yang memang dipaku ke dasar kolom, plus kaki
halaman.

**Akar.** Keputusan jumlah halaman dibaca dari satu penghitung, `terpotong`, yang artinya
"berapa banyak isi yang tak kebagian tempat". Salah satu penyumbangnya menulis
`isi.rekomendasiItem.length - MAKS_ITEM`, dengan `MAKS_ITEM = 4`. Anak dengan **satu**
rekomendasi menghasilkan **−3**. Keputusannya berbunyi `terpotong === 0`, dan **−3 gagal
memenuhi syarat itu persis seperti +3** — jadi halaman kedua dicetak untuk setiap anak yang
rekomendasinya kurang dari empat, yaitu hampir semua anak.

**Tempat.** `src/lib/rapor-jpeg.ts` (semua `terpotong +=`),
`src/lib/domain/laporan-bulanan.ts` → `sisaTakMuat`.

**Cara membuktikan.** Jangan menebak penyumbangnya — **cetak semuanya.** Ganti tiap
`terpotong += X` dengan pemanggilan yang mencatat nilainya, lalu render dengan fixture yang
menyalin data yang dilaporkan:

```ts
const lacak = (tag: string, n: number) => { console.log('POTONG', hTotal, tag, n); terpotong += n; };
```

Keluarannya langsung menunjuk pelakunya:

```
POTONG 4962 b448 0 … POTONG 4962 b678 -3      ← satu-satunya yang bukan nol, dan NEGATIF
```

**Cara memperbaiki.** Dua lapis, dan keduanya perlu:

1. **Jepit di sumbernya, sekali:** satu helper murni `sisaTakMuat(total, tercetak)` yang
   mengembalikan `Math.max(0, total - tercetak)`. "Sisa yang tak kebagian tempat" tak punya
   arti negatif, jadi pembatasannya milik definisi angkanya — bukan tugas tiap pemanggil.
2. **Bandingkan, jangan samakan:** `terpotong <= 0`, bukan `=== 0`.

**Pelajaran yang bisa dibawa ke tempat lain.** Sebuah angka yang namanya menyiratkan "jumlah
sisa", "berapa yang gagal", atau "berapa yang tertinggal" **tak boleh** bisa negatif. Kalau
bisa, satu blok yang "kelebihan jatah" akan diam-diam mengurangi hitungan blok lain yang
benar-benar terpotong — dan bug seperti ini tak pernah memberi galat: rapornya tetap tercetak,
hanya jadi dua lembar dengan satu lembar kosong.

---

### BUG-12 · Pemotongan senyap: rapor terbaca lengkap padahal tidak

**Gejala.** Rapor menampilkan tiga dari empat domain penilaian dan **tampak lengkap**. Orang tua tak punya
cara menyadari ada yang hilang.

**Akar.** Loop yang `break` saat ruang habis, tanpa memberi tahu ada sisa. Pemberitahuan tingkat atas
("…dan N catatan lain") hanya menghitung **catatan** yang utuh tak tercetak, bukan **baris di dalam**
sebuah catatan.

**Tempat.** `src/lib/rapor-jpeg.ts` (blok catatan perkembangan, evaluasi kurikulum, butir psikolog),
`src/components/LaporanAnakView.tsx`.

**Cara membuktikan.** Beri fixture yang isinya jauh lebih banyak daripada ruang, lalu **hitung** entri di
gambar dan bandingkan dengan fixture-nya.

**Cara memperbaiki.** Setiap loop yang bisa berhenti lebih awal harus:
1. menghitung berapa yang tercetak,
2. mencetak pemberitahuan sisanya (`…N penilaian lain — lihat di aplikasi`),
3. berhenti **satu baris lebih awal** supaya pemberitahuannya sendiri kebagian tempat.

Cari calon pelanggaran: `rg 'break' src/lib/rapor-jpeg.ts` dan `rg 'slice\(0,' src/`.

---

### BUG-13 · Interaksi game salah saat diklik cepat (stale closure)

**Gejala.** Di game Ingatan, pasangan yang benar tak terdeteksi bila dua kartu diklik cepat. Sesekali,
tak bisa diulang dengan mudah.

**Akar.** Handler React membaca state dari closure yang sudah basi.

**Tempat.** `src/lib/game/*` (mesin game) + komponennya di `src/app/main/[anakId]/`.

**Cara memperbaiki.** Model data yang eksplisit (1 baris = 1 pasangan), pencocokan **by id** dengan nilai
ternormalisasi, dan pembaruan state lewat bentuk fungsional (`setX(prev => …)`) — bukan membaca variabel
dari closure. Rujukan: `fix(game ingatan): pasangan tak terdeteksi saat klik cepat (stale closure)`.

---

### BUG-14 · Form tidak ter-reset, atau field baru hilang saat Edit

**Gejala.** Setelah simpan, nominal/kategori/foto masih terisi nilai sebelumnya. Atau: menyunting sebuah
baris **menghapus** field yang baru ditambahkan.

**Akar.** Form mengirim seluruh objek. Field yang tidak ada di form dikirim sebagai `undefined`/kosong dan
**menimpa** nilai yang sudah tersimpan.

**Tempat.** `src/app/admin/keuangan/*`, `src/app/admin/kelas-bermain/KelasAdmin.tsx`, dan form admin lain.

**Cara memperbaiki.** Kirim hanya field yang benar-benar disunting, atau isi form dari baris terbaru
sebelum submit. Setelah simpan sukses, **reset state form secara eksplisit** — jangan mengandalkan
re-render.

Ini kembar dekat BUG-02: keduanya berakar pada form yang mengirim balik snapshot lamanya.

---

### BUG-15 · Aturan hanya ditegakkan di klien

**Gejala.** Pendaftaran event bisa lolos tanpa bukti bayar dengan memanipulasi klien. Tidak terlihat dari
UI biasa.

**Akar.** Validasi hanya di komponen.

**Tempat.** `src/lib/data/event-actions.ts` (`daftarEvent`), dan semua berkas `-actions`.

**Cara memperbaiki.** **Setiap** aturan ditegakkan di Server Action. Validasi klien hanya untuk kenyamanan.
Rujukan: `fix(daftar-event): bukti bayar ditegakkan di SERVER, bukan hanya di klien`.

**Berlaku juga untuk parameter redirect.** `?kembali=` hanya boleh menerima **path internal**; parameter
redirect yang menerima URL apa pun adalah lubang open-redirect.

---

### BUG-16 · Gerbang langganan memantulkan halaman yang seharusnya terbuka

**Gejala.** Profil anak tak bisa dibuka sama sekali — halaman memantul tanpa pesan.

**Akar.** Gerbang langganan dipasang di halaman yang tak seharusnya digerbangi. Karena pantulannya diam,
tak ada jejak di UI maupun di log.

**Tempat.** `src/app/anak/[anakId]/`, pola `get<Peran>Terjamin` di `src/lib/data/*.ts`.

**Cara membuktikan.** Cari `redirect(` di halaman itu dan jalur yang mendahuluinya. **Kalau `console.log`
di dalam halaman tak pernah muncul di terminal, kodenya memantul lebih awal** — di middleware
(`src/proxy.ts`) atau di gerbang perannya.

**Cara memperbaiki.** Pantulan yang diam adalah bug tersendiri. Halaman yang menolak harus **mengatakan
alasannya** (§4.3).

---

## 7. Indeks cepat: gejala → tempat

| Gejala | Curigai | Bug |
|---|---|---|
| Simpan sukses tapi halaman user lama | `updateTag` hilang di action | BUG-01 |
| Angka/label tak berubah walau sudah disimpan ulang | snapshot vs master; form kirim nilai lama | **BUG-02** |
| Halaman 500 / daftar kosong sesudah deploy | migrasi belum jalan | BUG-03 |
| Materi Event / tema terkunci malah terlihat semua orang | arah cadangan pra-migrasi | BUG-04 |
| Kegiatan pindah bulan; streak putus | WIB vs UTC | BUG-05 |
| Data ada tapi salah bulan | jangkar waktu salah kolom | BUG-06 |
| Trial bisa buka yang tak berhak | gerbang cek paket, bukan status | BUG-07 |
| Sudah berhenti bayar tapi bulan baru terbuka | batas per kategori, bukan total | BUG-07b |
| Admin lihat, ortu tidak | RLS / `ortu_id` salah | BUG-08 |
| Data lintas-akun bisa diambil kunci anon | `EXECUTE` fungsi belum dicabut ganda | BUG-09 |
| Migrasi gagal / insert ditolak | indeks sebelum data rapi; CHECK belum didaftarkan | BUG-10 |
| Rapor/sertifikat/stiker berantakan | tata letak Canvas | BUG-11 |
| Rapor selalu 2 halaman padahal isinya sedikit | penghitung sisa yang boleh negatif | BUG-11b |
| Rapor tampak lengkap tapi ada yang hilang | pemotongan senyap | BUG-12 |
| Game salah deteksi saat klik cepat | stale closure | BUG-13 |
| Field form tak ter-reset / field baru hilang | form kirim objek penuh | BUG-14 |
| Aturan bisa dilewati dari klien | validasi tak ada di server | BUG-15 |
| Halaman memantul tanpa pesan | gerbang salah pasang | BUG-16 |
| SEMUA tema tertutup padahal berlangganan | rentang `kategori_usia` bertumpang & ada kategori tanpa tema | lihat di bawah |

**Catatan khusus "semua tema tertutup".** Ini pernah salah didiagnosis **dua kali** — pertama disangka
jangkar usia yang dibekukan, lalu disangka celah kategori 4–5 tahun. Akar sebenarnya: **rentang
`kategori_usia` saling bertumpang**, sehingga usia 6 tahun jatuh ke kategori *Early Childhood* (5–6) yang
**nol tema** — bukan ke kategori 6–9 yang berisi. Cara menemukannya bukan dengan membaca kode, melainkan
dengan **menjalankan `tumpukanKategori` dan `kategoriTanpaTema` (`src/lib/domain/kategori-usia.ts`) atas
data master yang sungguhan.** Kedua fungsi itu ada khusus untuk itu — pakailah sebelum menebak.

---

## 8. Migrasi database: aturan main

Letak: `supabase/migrations/NNNN_nama.sql` (kini 105 berkas). Dijalankan **manual** di Supabase SQL Editor.

Daftar periksa sebelum menulis migrasi:

1. **Idempoten.** `create table if not exists`, `create index if not exists`,
   `drop policy if exists` sebelum `create policy`, blok `do $$ ... $$` untuk menambah CHECK.
   Alasannya di BUG-10: seluruh rantai dijalankan ulang, dan satu migrasi yang tidak idempoten
   menghentikan yang lain.
2. **Rapikan data DULU, kunci belakangan.** Backfill/renumber sebelum `create unique index`.
3. **RLS untuk setiap tabel baru** — `enable row level security` + policy eksplisit. Tabel tanpa policy
   tak bisa dibaca siapa pun; tabel tanpa RLS bisa dibaca semua orang.
4. **Pertimbangkan DELETE.** Untuk tabel riwayat (mis. `evaluasi_kurikulum`), ortu **tidak** diberi hak
   DELETE — riwayat rapor tak boleh dirapikan belakangan.
5. **Fungsi baru: cabut `EXECUTE` dua kali** (BUG-09).
6. **Kolom NOT NULL baru memecahkan pemasangan BARU**, bukan hanya data lama — beri `default`, atau
   backfill lalu baru pasang `not null`.
7. **Sesudah dijalankan, buktikan dengan probe** (§2.5) — jangan berasumsi.
8. **Kodenya harus tetap hidup SEBELUM migrasi jalan** (§4.1) — dan arah cadangannya dipilih dengan
   bertanya "apa yang bocor kalau saya salah" (BUG-04).

---

## 9. Pantangan

| Jangan | Sebab |
|---|---|
| Memakai `createAdminClient()` untuk membaca data pengguna | Melewati RLS. Satu salah tulis = kebocoran lintas-akun |
| Menaruh aturan bisnis di `page.tsx` atau berkas `-actions` | Tak bisa diuji, dan akan tersalin dengan versi berbeda |
| Menaruh `SUPABASE_SERVICE_ROLE_KEY` di mana pun selain `.env.local` / env Vercel | Repo ini **publik** |
| Menempel kunci `service_role` ke chat, issue, atau screenshot | Sama seperti di atas |
| Memakai `current_date` / `now()::date` untuk logika hari | UTC, bukan WIB (BUG-05) |
| Menyembunyikan konten yang tak boleh diakses | Kunci + alasan (§4.3). Yang hilang tanpa jejak akan dilaporkan sebagai data hilang |
| Memotong daftar tanpa "…dan N lainnya" | BUG-12 |
| Menyimpan indeks butir, bukan kalimatnya | Rapor lama akan berbohong (§4.5) |
| Percaya bahwa `tsc` + `build` hijau berarti benar | BUG-01, BUG-02, BUG-11 semuanya hijau |
| Menerima test hijau sebagai bukti tanpa uji daya gigit | §2.4 |
| Menghapus komentar 🐞 saat merapikan kode | Komentar itulah yang mencegah bug yang sama dipasang kembali |
| Menyimpulkan "tak ada baris" dari `[]` | Bisa berarti RLS (BUG-08) |
| Memperlonggar policy RLS supaya data muncul | Hampir selalu penulisannya yang salah, bukan policy-nya |

---

## 10. Lampiran: seluruh modul domain & fungsinya

Semua **murni** (tanpa I/O) dan hampir semua punya test di `src/lib/domain/__tests__/`. Kalau angkanya
salah, mulai dari sini — bisa dibuktikan tanpa menyalakan aplikasi.

| Modul | Fungsi |
|---|---|
| `anak.ts` | `umurTahun`, `umurBulanTotal`, `umurTeks`, `modeDefault` |
| `entitlement.ts` | `hakAksesAnak`, `hakAksesAkun`, `bolehBukaTema`, `tambahHari` |
| `gamifikasi.ts` | `tanggalWIB`, `evaluasiLencana`, `tantanganHariIni`, `progresTantangan` |
| `harga.ts` | `persenProdukUntuk`, `hargaProdukUntuk`, `persenEventUntuk`, `hargaEventUntuk`, `persenUntukPaket`, `hargaEventUntukPaket`, `hargaProdukUntukPaket` |
| `jadwal.ts` | `jadwalTeks` |
| `kategori-usia.ts` | `tumpukanKategori`, `petaUmurKategori`, `kategoriTanpaTema` |
| `konsultasi-biaya.ts` | `hitungBiayaKonsultasi` |
| `konsultasi-slot.ts` | `memakaiSlotKonsultasi`, `draftKedaluwarsa`, `keadaanSlot` |
| `kuota-konsultasi.ts` | `sisaKuotaKonsultasi`, `labelKuotaKonsultasi` |
| `kuota-worksheet.ts` | `awalPeriode`, `sisaKuotaWorksheet`, `sisaWorksheetAkun` |
| `kurikulum.ts` | `bulanKurikulumAnak`, `statusTema`, `kelompokTema`, `susunHasilEvaluasi`, `temaTerkunci`, `posisiBerikutnya`, `salinTemaKeKategoriLain`, `cocokUsia`, `ringkasEvaluasi`, `posisiTema`, `evaluasiPerAktivitas`, `teksPosisi` |
| `langganan-harga.ts` | `aturanKeluargaTerpakai`, `hitungTagihan` |
| `laporan-anak.ts` | `laporanAnak` |
| `laporan-bulanan.ts` | `bulanWib`, `bulanRekomendasi`, `rentangBulan`, `labelBulan`, `bulanTerakhir`, `hitungArea`, `ringkasBulan`, `rapikanDaftar` |
| `laporan.ts` | `ringkasanLangganan` |
| `paginasi.ts` | `saringPaginasi` |
| `reminder.ts` | `susunPesanReminder`, `jadwalUntukKelas` |
| `saring.ts` | `rapikanKunci`, `cocokCari`, `tanggalWibDariISO`, `dalamRentang`, `rentangTerpakai`, `tanggalEvent`, `eventDalamRentang` |
| `siklus-kurikulum.ts` | `tambahBulan`, `bulanPenuhLewat`, `siklusBerjalan`, `bracketUntukUmur`, `konteksKurikulum`, `kunciKarena`, `adaTemaUntukBracket`, `statusTemaBracket`, `kelompokTemaBracket`, `saringBerkategori` |
| `skor.ts` | `hitungBintang` |
| `stiker.ts` | `ukuranNama` |
| `tantangan-kustom.ts` | `cocokItem`, `progresTantanganKustom`, `ringkasSyarat` |
| `trial.ts` | `computeTrialEnd`, `statusLangganan`, `bolehAkses` |
| `usia.ts` | `cocokUsia`, `kategoriUsia` |
| `voucher.ts` | `adaCakupan`, `hitungPotongan`, `validasiVoucher` |
| `waktu.ts` | `sisaDetik`, `waktuHabis`, `kunciHari` |

---

## Dokumen terkait

| Berkas | Isi |
|---|---|
| [`REFERENSI-KODE-KIDZPLAYFUL.md`](REFERENSI-KODE-KIDZPLAYFUL.md) | Peta lapis, 105 modul data, 7 alur ujung-ke-ujung |
| [`DEVELOPER-KIDZPLAYFUL.md`](DEVELOPER-KIDZPLAYFUL.md) | Rincian fitur & keputusan produk |
| [`DOKUMENTASI-KIDZPLAYFUL.md`](DOKUMENTASI-KIDZPLAYFUL.md) | Dokumentasi pengguna |
| [`INFRASTRUKTUR-KIDZPLAYFUL.md`](INFRASTRUKTUR-KIDZPLAYFUL.md) | Deploy, env, Vercel, Supabase |
| [`RUNBOOK-OPERASIONAL.md`](RUNBOOK-OPERASIONAL.md) | Prosedur operasional harian |
| `CLAUDE.md` (akar repo) | Konvensi wajib repo |

---

### Cara membangun ulang PDF dokumen ini

```bash
python tools/md2pdf.py docs/PANDUAN-DEBUG-KIDZPLAYFUL.md          # -> .html
# lalu cetak HTML-nya ke PDF dengan Chrome:
"<path-chrome>" --headless --disable-gpu \
  --print-to-pdf=docs/PANDUAN-DEBUG-KIDZPLAYFUL.pdf \
  --no-pdf-header-footer docs/PANDUAN-DEBUG-KIDZPLAYFUL.html
```
