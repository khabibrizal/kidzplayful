# PRD — KidzPlayful sebagai Preschool Homeschooling: Langganan Per Anak & Bertingkat

**Penulis:** CPO · **Tanggal:** 2026-08-20 · **Status:** menunggu persetujuan untuk implementasi

---

## 1. Konteks & masalah

KidzPlayful hari ini menjual **satu langganan tunggal per akun** (bawaan Rp 35.000/bulan) dengan proposisi "aplikasi game & ide bermain". Nilai yang dirasakan orang tua belum cukup untuk membuat mereka rutin membayar, dan seluruh sistem hanya mengenal **dua keadaan**: `aktif` atau bukan (`dibatasiTrial(status) = status !== 'aktif'`, dipakai di 10+ tempat mulai dari [langganan-status.ts](src/lib/data/langganan-status.ts)).

Strategi barunya: memposisikan KidzPlayful sebagai **preschool homeschooling** dengan dua paket berbeda harga & fasilitas (Basic dan Preschool), **ditagih per anak**, dengan diskon keluarga untuk yang mendaftarkan lebih dari satu anak. Yang dibeli orang tua bukan lagi akses konten, melainkan **bukti perkembangan anak**.

**Hasil yang dituju:** orang tua punya alasan konkret berlangganan sebulan penuh, jalur alami naik dari Basic ke Preschool, dan insentif mendaftarkan seluruh anaknya.

---

## 2. Metrik keberhasilan

| Metrik | Kenapa ini yang diukur |
|---|---|
| Konversi trial → berbayar | Ukuran utama apakah paket & harga barunya masuk akal |
| Porsi anak di paket Preschool | Menguji apakah pembedanya (worksheet, konsultasi, rapor) dihargai |
| **Rata-rata anak berbayar per akun** | Ukuran langsung keberhasilan diskon keluarga |
| Perpanjangan bulan ke-2 | Nilai preschool baru terbukti kalau orang tua bertahan |
| Rapor bulanan yang diunduh | Penanda paling dekat dengan "anak saya bersekolah" |
| Pemakaian kuota konsultasi | Menjaga biaya honor psikolog tetap terhitung |

Angka targetnya **belum** ditetapkan — sengaja, karena belum ada baseline konversi. Instrumentasinya (`aktivitas`, `pembayaran_langganan`) sudah ada, jadi baseline diambil di bulan pertama lalu target ditetapkan sesudahnya.

---

## 3. Ruang lingkup & urutan pengerjaan

Permintaan ini sebenarnya **lima pekerjaan yang saling bergantung**. Digabung jadi satu rilis besar akan sulit diuji dan sulit dibatalkan, jadi dipecah dengan urutan yang tiap tahapnya bisa dirilis sendiri:

| # | Sub-proyek | Kenapa urutannya begini |
|---|---|---|
| **A1** | **Master paket + hak akses per anak** (baca saja: entitlement, gerbang worksheet, diskon) | Fondasi. Tanpa ini, semua yang lain menggantung |
| **A2** | **Pilih paket per anak + tagihan + verifikasi admin** (sisi uang) | Butuh A1. Inilah yang membuat orang tua bisa membayar |
| **B** | **Konsultasi bayar-per-sesi + kuota gratis dari paket** | Desainnya sudah ada (lampiran); kuota gratis butuh A1 |
| **C** | **Pencatatan aktivitas mandiri + rapor bulanan** | Inti nilai Preschool; bisa paralel dengan B |
| **D** | **Rebranding "preschool homeschooling"** (copy, metadata, landing) | **Paling akhir** — jangan menjanjikan preschool sebelum rapornya ada |

**Di luar lingkup:** payment gateway otomatis (tetap transfer manual + verifikasi admin), cron/penjadwal, kurikulum berjenjang, aplikasi mobile, dan prorata hari.

---

## 4. Keputusan yang sudah ditetapkan

| Topik | Keputusan |
|---|---|
| Satuan harga | **Per anak per bulan** |
| Cakupan | **Orang tua memilih anak mana yang dilanggankan**; status langganan menempel pada **anak**, bukan akun |
| Paket campur | **Boleh** — kakak Preschool, bayi Basic, dalam periode yang sama |
| Diskon keluarga | **Aturan bertingkat per paket** yang admin tambah sendiri: "mulai N anak → X% atau Rp Y" |
| Voucher langganan | **Sekali pakai** (memotong satu pembayaran), memakai ulang master voucher yang sudah ada |
| Batas jumlah anak per paket | **Tidak ada** — bayar per anak, tanpa batas. Batas hanya untuk yang belum berlangganan (`trial_maks_anak` yang sudah jalan) |
| Trial | **30 hari**, hak akses **setara Basic**. Lama hari & paket acuannya jadi setelan admin (hari ini `TRIAL_HARI = 14` masih konstanta di [domain/trial.ts](src/lib/domain/trial.ts)) |
| Member aktif saat ini | Semua anaknya diperlakukan **Preschool sampai periode berjalan habis**, lalu orang tua memilih sendiri |
| Kuota konsultasi gratis | **Admin tentukan per paket**: jumlah + satuan (`per bulan` atau `sekali per langganan`) |
| Worksheet | **Preschool saja**, dengan penanda per materi untuk membuka sebagian sebagai contoh |
| Diskon event & produk | **Per item, satu angka untuk setiap paket** |
| Pindah paket | **Turun kelas berlaku akhir periode**; **naik kelas kapan saja** dengan bayar satu bulan penuh (tanpa prorata) |
| Anak baru di tengah periode | Ikut pada **periode berikutnya** — profilnya boleh dibuat kapan saja |

---

## 5. Model data

### `paket_langganan` (master, dikelola admin)

| Kolom | Isi |
|---|---|
| `kode` | penanda stabil (`basic`, `preschool`) — **tidak boleh diubah** setelah dipakai, karena tersimpan di baris langganan & peta diskon |
| `nama`, `deskripsi`, `benefit jsonb` | teks halaman pilih paket. `benefit` = daftar poin bebas tulis, jadi mengubah kalimat pemasaran **tidak perlu deploy** |
| `harga_bulanan` | **harga per anak per bulan** |
| `diskon_keluarga jsonb` | aturan bertingkat, mis. `[{min_anak:2, persen:10}, {min_anak:4, nominal:30000}]`. Admin menambah/menghapus baris; yang dipakai adalah aturan dengan `min_anak` terbesar yang terpenuhi |
| `akses_ide_bermain`, `akses_game`, `akses_video`, `akses_komunitas` | hak akses per fitur |
| `worksheet` | boleh mengunduh worksheet |
| `konsultasi_gratis_jumlah` + `konsultasi_gratis_satuan` (`bulan` \| `langganan`) | kuota konsultasi gratis |
| `rapor_bulanan` | boleh mengunduh rapor bulanan |
| `urutan`, `aktif` | urutan tampil + penonaktifan tanpa hapus. **`urutan` juga menentukan "paket tertinggi"** (lihat §6) |

### `langganan_anak` (baru — status berbayar per anak)

`anak_id` (PK) · `ortu_id` (untuk RLS) · `paket_id` (paket periode berjalan) · `paket_berikutnya_id` (pilihan periode depan; kosong = lanjut paket yang sama) · `aktif_sampai date` · `updated_at`.

Tabel `langganan` yang sudah ada **tetap dipakai** sebagai wadah tingkat akun: `trial_mulai` (trial memang milik akun, bukan anak) dan riwayat. Kolom `aktif_sampai` di sana menjadi turunan tampilan saja — **sumber kebenaran periode berbayar pindah ke `langganan_anak`**.

### `tagihan_langganan` + `tagihan_langganan_item` (baru — sisi uang)

Tagihan: `ortu_id`, `status` (`menunggu_bayar`/`menunggu_verifikasi`/`diterima`/`ditolak`), `subtotal`, `diskon_keluarga`, `voucher_id`, `potongan_voucher`, `total`, `bukti_url`, `alasan_tolak`, `created_at`, `diverifikasi_pada`.
Item: `tagihan_id`, `anak_id`, `paket_id`, `harga` (snapshot harga paket saat tagihan dibuat).

Rincian per anak disimpan sebagai **baris item** — bukan satu kolom teks — supaya admin melihat "siapa dapat paket apa, berapa" saat memverifikasi, dan supaya paket campur tidak perlu perlakuan khusus.

### Perubahan tabel yang sudah ada

- **`kelas_bermain`**: `+ worksheet_terbuka boolean default false` — true = worksheet-nya boleh diunduh semua paket ("contoh gratis").
- **`event` & `produk`**: `+ diskon_paket jsonb`, mis. `{"basic":5,"preschool":10}`.
  > **Kenapa jsonb, bukan dua kolom `diskon_basic_persen`/`diskon_preschool_persen`:** dua kolom tetap berarti kedua paket **ikut ter-hardcode di skema** — bertentangan dengan permintaan "kalau ada perubahan tidak hardcode", dan paket ketiga nanti butuh migrasi + deploy. Dengan peta ini, form admin **membuat satu input untuk setiap paket aktif**: hari ini tampil dua kolom persis seperti yang diminta, besok tiga tanpa menyentuh kode. Paket tanpa entri jatuh ke kolom lama `diskon_langganan_persen`, jadi data yang sekarang tetap berlaku.
- **`voucher`**: `+ berlaku_langganan boolean default false`; `voucher_redeem.ref_tipe` CHECK diperluas dengan `'langganan'`.
- **`pengaturan_trial`**: `+ trial_hari int default 30`, `+ trial_paket_id` — menggantikan konstanta `TRIAL_HARI`.

---

## 6. Hak akses: satu sumber kebenaran

Berkas murni baru **`src/lib/domain/entitlement.ts`**:

```
hakAksesAnak(langgananAnak, paketMap, akunTrial, sekarang) → {
  status: 'aktif'|'trial'|'tenggang'|'kadaluarsa',
  paket, ideBermain, game, video, worksheet, raporBulanan,
  konsultasiGratis: {jumlah, satuan}
}
hakAksesAkun(semuaAnak, paketMap, ...) → { paketTertinggi, komunitas, diskonPaketKode }
```

Aturan status per anak: `aktif_sampai >= hari ini` → **aktif** dengan paketnya · belum pernah bayar tapi akun masih dalam masa trial (`trial_mulai + trial_hari`) → **trial** dengan `trial_paket_id` · lewat `aktif_sampai` tapi masih dalam tenggang → **tenggang** dengan paket terakhir · selain itu **kadaluarsa** (boleh melihat rapor lama, tanpa konten baru).

**Fitur yang tidak punya konteks anak** — diskon event & produk, komunitas, detail materi `/kelas/[id]` — memakai **paket TERTINGGI yang sedang aktif di akun** (`urutan` terbesar). Alasannya: satu keranjang belanja dan satu pendaftaran event tidak bisa memakai dua tarif sekaligus, dan memilih yang tertinggi adalah satu-satunya aturan yang tidak pernah merugikan pelanggan. Aturan ini **ditulis di UI** ("diskon mengikuti paket tertinggi di akunmu: Preschool"), bukan disembunyikan.

**Kuota konsultasi mengikuti paket ANAK** yang dibooking-kan, karena booking memang selalu untuk satu anak.

**Yang harus dirapikan sekalian** (pekerjaan nyata, bukan tambahan opsional): pemeriksaan `dibatasiTrial(status)` yang kini bertebaran di `main/[anakId]`, `ortu/[anakId]`, `pilih-game/[anakId]`, `kelas/[id]`, `komunitas`, `api/anak`, dan `pilih-anak/actions` diganti memakai kedua fungsi di atas. Selama masih satu boolean tingkat akun, "langganan per anak" mustahil benar. Penanda per item `boleh_trial` **tetap dipakai**, artinya sekarang "boleh diakses oleh yang tidak punya hak penuh".

---

## 7. Alur pengguna

**Halaman `/langganan` (baru).** Tabel: satu baris per anak, kolom pilihan paket (Basic / Preschool / tidak ikut). Di bawahnya rincian tagihan yang dihitung ulang saat pilihan berubah:

```
Aletta   · Preschool   Rp 120.000
Bima     · Basic        Rp  75.000
                     ── subtotal Rp 195.000
Diskon keluarga (2 anak, 10%)  − Rp 19.500
Voucher HEMATMEI               − Rp 10.000
                     ══ total   Rp 165.500
```

Diskon keluarga dihitung dari **jumlah anak dalam tagihan itu**. Bila paketnya campur, aturan yang dipakai adalah aturan dari **paket tertinggi** di tagihan tersebut — dinyatakan eksplisit di layar. Instruksi transfer memakai `getPengaturanBayar()` (rekening + QRIS yang sudah ada); unggah bukti memakai pola yang sama dengan pendaftaran event (`kompresGambar` → folder `bukti/`). **Semua nominal dihitung ulang di server** saat tagihan dibuat; angka dari browser hanya pratinjau.

**Naik kelas** — kapan saja: buat tagihan baru untuk anak itu, bayar satu bulan penuh, periode dihitung dari verifikasi. Tanpa prorata; disebutkan terus terang di layar sebelum tombol bayar.

**Turun kelas** — pilihan disimpan di `paket_berikutnya_id` dan berlaku **saat perpanjangan**. Sampai jatuh tempo, hak paket lama tetap penuh. Layar menampilkan "Periode ini: Preschool · Mulai 12 Sep: Basic" + tombol batal.

**Anak baru** — profil boleh dibuat kapan saja; hak berbayarnya menyala pada tagihan periode berikutnya, yang otomatis memuat anak itu sebagai baris baru.

**Jatuh tempo** dievaluasi **saat dibaca** (lazy) karena aplikasi ini tidak punya cron: status turun sendiri mengikuti `aktif_sampai`. Blok "🔔 Perlu diingatkan" di `/admin/langganan` yang sudah ada diperluas agar menyebut **anak & paket** yang akan berakhir, supaya pesan WA-nya tepat.

**Member lama** — migrasi mengisi `langganan_anak` untuk **semua anak** pada akun yang `aktif_sampai`-nya masih di depan: paket `preschool`, `aktif_sampai` disalin dari akun, `paket_berikutnya_id` dibiarkan kosong supaya mereka memilih sendiri saat perpanjangan.

---

## 8. Sisi admin

- **Menu baru `/admin/paket`** — CRUD paket, semua field hak akses, dan **editor aturan diskon keluarga** berbentuk baris yang bisa ditambah (pola seperti `ParameterPerkembanganForm`). Ditambahkan ke `MENU_ADMIN` ([menu-admin.ts](src/lib/menu-admin.ts)); karena menu baru harus diberi izin di matriks Akses Menu, defaultnya **super user saja** seperti menu sensitif lainnya.
- **`/admin/langganan`** — daftar **tagihan menunggu verifikasi** dengan rincian per anak, bukti lewat `BuktiLightbox` (komponen sudah ada), tombol Verifikasi/Tolak. Verifikasi menyetel `langganan_anak` tiap item (`paket_id`, `aktif_sampai`), mencatat `pembayaran_langganan`, `voucher_redeem`, dan `catatLedger(kategori 'membership', ref_tipe 'tagihan_langganan')`. Tolak → ledger dihapus & kuota voucher dilepas.
- **`/admin/event` & `/admin/produk`** — baris input diskon **satu per paket aktif**, dirender dari master paket.
- **`/admin/kelas-bermain`** — centang **"worksheet contoh terbuka"** per materi.
- **`/admin/pengaturan-trial`** — lama trial (hari) + paket acuan trial.
- **`/admin/voucher`** — centang **"Berlaku untuk Langganan"**.

> **Bug lama yang wajib diperbaiki di sub-proyek A2:** `aktifkanLangganan` menyetel `aktif_sampai = hari ini + 1 bulan` ([admin-bisnis.ts:19-21](src/lib/data/admin-bisnis.ts#L19-L21)) — **bukan** memperpanjang dari `aktif_sampai` yang ada, sehingga orang tua yang membayar lebih awal **kehilangan sisa harinya**. Dengan tagihan per anak dan perpindahan paket, ini akan sering terasa dan langsung terbaca sebagai kecurangan. Perpanjangan harus dihitung dari `max(hari ini, aktif_sampai)` **per anak**.

---

## 9. Rapor — "setiap anak dapat rapor di setiap aktivitasnya"

Kondisi sekarang: rapor ([LaporanAnakView.tsx](src/components/LaporanAnakView.tsx)) sudah memuat statistik game per area & per mesin, lencana/streak, blok per event (catatan guru, sertifikat, dokumentasi), dan riwayat konsultasi. **Yang belum tercatat justru inti homeschooling**: Ide Bermain yang dikerjakan di rumah dan video yang ditonton. Tabel `riwayat_kelas` tidak bisa dipakai — kuncinya `(ortu_id, kelas_id)` dan hanya menyimpan waktu **terakhir**, jadi bukan per anak dan bukan riwayat.

1. **Tabel `kegiatan_anak`** — satu baris per kegiatan: `anak_id`, `ortu_id`, `jenis` (`ide-bermain` \| `video`), `ref_id`, `judul` (snapshot, agar rapor tetap benar bila materinya diubah/dihapus), `waktu`. Dicatat dari Mode Anak & Mode Ortu di titik yang sudah memanggil `catatRiwayatKelas`, dan saat video diputar.
2. **Blok "Aktivitas Mandiri"** di rapor — daftar per bulan + hitungannya.
3. **Rapor bulanan yang bisa diunduh** — `/anak/[anakId]/rapor/[ym]`: ringkasan satu periode (kegiatan, game per area, catatan guru, kehadiran event, rekomendasi psikolog) + tombol **Unduh JPEG A4**, memakai ulang mesin kanvas `sertifikat-jpeg.ts` + `kartu-bersama.ts` (`ukuranPas`, `gambarMuat`) sehingga **tanpa dependensi baru**. Ketersediaannya mengikuti hak `raporBulanan` **paket anak itu**; anak paket Basic tetap melihat rapor berjalan, hanya berkas bulanannya yang terkunci.

Agregasinya di `src/lib/domain/laporan-bulanan.ts` (murni, diuji vitest) — bukan di komponen.

---

## 10. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| **Worksheet dicabut dari member yang sudah menikmatinya** | Member lama Preschool sampai periode habis + sebagian worksheet ditandai contoh terbuka + pengumuman sebelum rilis |
| **Harga per anak terasa lebih mahal** bagi keluarga besar | Diskon keluarga bertingkat + rincian tagihan yang menampilkan penghematannya secara terbuka |
| **Paket campur menyulitkan verifikasi manual** | Tagihan berbentuk baris per anak; total dihitung server; admin hanya menyetujui, tidak menghitung |
| **Pembayaran manual dengan banyak harga → salah nominal** | Nominal diminta dari tagihan yang sudah tersimpan, bukan diketik ulang admin |
| **Status per anak bocor** (anak yang tak dilanggankan tetap dapat akses) | Matriks hak akses diuji sebagai unit, bukan diperiksa manual per halaman |
| **Kuota konsultasi gratis membengkakkan honor psikolog** | Kuota per paket ditentukan admin + sisa kuota tampil ke orang tua + laporan pemakaian |
| **Janji "preschool" mendahului barangnya** | Rebranding (D) dikerjakan paling akhir |
| **Paket ketiga memaksa migrasi** | Peta diskon jsonb + hak akses sebagai field paket + aturan keluarga jsonb, bukan cabang `if` di kode |

---

## 11. Rencana teknis ringkas

**Langkah 0 — terbitkan PRD ini sebagai dokumen repo** sebelum kode apa pun ditulis: `docs/superpowers/specs/2026-08-20-langganan-preschool-design.md` mengikuti konvensi spec yang ada, lalu `docs/PRD-LANGGANAN-PRESCHOOL.md` + HTML/PDF lewat `python tools/md2pdf.py` + Chrome headless seperti dokumen lain, dan satu baris penunjuk di `CLAUDE.md` §Dokumentasi.

**Migrasi** (nomor berurutan setelah migrasi konsultasi bayar; semua idempoten, dijalankan manual):
`paket_langganan` + seed Basic & Preschool · `langganan_anak` + backfill member aktif ke Preschool · `tagihan_langganan` + `tagihan_langganan_item` · `kelas_bermain.worksheet_terbuka` · `event.diskon_paket` & `produk.diskon_paket` · `voucher.berlaku_langganan` + perluasan CHECK `voucher_redeem.ref_tipe` · `pengaturan_trial.trial_hari`/`trial_paket_id` · `kegiatan_anak` + RLS (ortu pemilik; admin/guru/psikolog lewat `boleh_lihat_laporan_anak` yang sudah ada).

**Aturan wajib** (dari CLAUDE.md, dan sudah pernah menggigit di repo ini): kode tayang **sebelum** migrasi manual dijalankan, jadi setiap kolom baru dibaca lewat **query terpisah yang mengembalikan default bila gagal `42703`** (pola [kuota-event.ts](src/lib/data/kuota-event.ts)) dan tulis di-retry tanpa kolom baru. Tanpa ini, halaman yang sekarang jalan akan mati saat deploy.

**Keamanan:** `langganan_anak` dan `tagihan_langganan` hanya boleh **dibaca** orang tua pemiliknya; seluruh penulisan paket/periode lewat server action ber-guard admin, dan kolom uang dilindungi trigger seperti pola `cegah_self_admin` (0056). Orang tua boleh mengubah `paket_berikutnya_id` miliknya sendiri dan mengunggah `bukti_url` — tidak lebih.

**Berkas inti:** `lib/domain/entitlement.ts` (baru) · `lib/domain/langganan-harga.ts` (baru: subtotal, diskon keluarga, voucher — murni & diuji) · `lib/domain/laporan-bulanan.ts` (baru) · `lib/data/paket.ts` + `paket-actions.ts` (baru) · `lib/data/langganan-anak.ts` + `tagihan-actions.ts` (baru) · `lib/data/langganan-status.ts` (kembalikan paket per anak) · `lib/domain/harga.ts` (persen dari peta paket, cadangan ke kolom lama) · `lib/data/admin-bisnis.ts` (verifikasi tagihan + perbaikan perpanjangan) · `app/langganan/` (baru) · `app/admin/paket/` (baru) · `components/KelasIsi.tsx` (gerbang worksheet) · `components/LaporanAnakView.tsx` · dan penyisiran `dibatasiTrial` di 7 berkas halaman.

---

## 12. Verifikasi

1. **Gerbang mutu** tiap tahap: `npx tsc --noEmit` → `npx eslint` → `npm test` (tes baru untuk `entitlement`, `langganan-harga`, `laporan-bulanan`; sekarang 97) → `npm run build`.
2. **Uji sebelum migrasi dijalankan**: build & buka halaman utama saat kolom/tabel baru belum ada — semuanya harus tetap hidup (membuktikan lapisan toleransi).
3. **Matriks hak akses sebagai unit test**: tiap kombinasi (paket × status anak) diperiksa untuk worksheet, rapor bulanan, kuota konsultasi, akses game/ide bermain/video; plus aturan **paket tertinggi** untuk diskon & komunitas. Ini gantinya memeriksa 7 halaman satu per satu.
4. **Hitungan tagihan sebagai unit test**: 1 anak · 2 anak sama paket · 2 anak paket campur · 3 anak dengan aturan bertingkat · voucher persen & nominal · voucher melebihi total (tak boleh minus) · aturan `min_anak` yang tidak terpenuhi.
5. **E2E per peran**: (a) trial 30 hari → hak setara Basic; (b) pilih Preschool untuk 1 dari 2 anak → **hanya anak itu** yang dapat worksheet & rapor bulanan; (c) admin verifikasi tagihan → periode kedua anak sesuai itemnya, ledger `membership` bertambah **sesuai total setelah diskon**; (d) turun kelas untuk bulan depan → hak Preschool tetap sampai jatuh tempo; (e) tambah anak baru → muncul di tagihan periode berikutnya, belum aktif sekarang; (f) member lama tetap penuh sampai `aktif_sampai`.
6. **Uji perpanjangan awal**: perpanjang saat masih ada 10 hari sisa → `aktif_sampai` **bertambah**, bukan direset (regresi bug §8).
7. **Uji keamanan**: sebagai orang tua, PATCH langsung lewat REST ke `langganan_anak` (`paket_id` → preschool, `aktif_sampai` → tahun depan) dan ke `tagihan_langganan` (`total` → 0, `status` → diterima) — **semuanya harus gagal**; `paket_berikutnya_id` & `bukti_url` **harus berhasil**.
8. **Diskon lintas paket**: akun dengan satu anak Basic dan satu Preschool → diskon event & produk memakai **Preschool**, dan layar menyebutkannya.

---

## Lampiran — desain konsultasi bayar-per-sesi (sub-proyek B, sudah dirancang)

Ringkasan keputusan yang sudah ditetapkan, karena kuota konsultasi gratis di PRD ini bergantung padanya:

- **Harga per psikolog** (diisi admin di master profil) dengan nilai bawaan global di `pengaturan_pembayaran`; **diskon member berupa persen** yang diatur admin (100% = member tetap gratis seperti sekarang).
- **Alur**: ortu booking (harga di-snapshot: harga dasar → diskon member → voucher → total) → psikolog **konfirmasi jadwal** → total 0 langsung `diterima`, total > 0 jadi `menunggu_bayar` + batas bayar 24 jam → ortu unggah bukti → admin **verifikasi** → chat terbuka + `catatLedger(kategori 'konsultasi')`. Tolak → ledger dihapus & kuota voucher dilepas.
- **Voucher** berlaku (`voucher.berlaku_konsultasi`, `voucher_redeem.ref_tipe='konsultasi'`), input kode meniru halaman pendaftaran event. Potongan **dihitung di dalam RPC** (SQL), bukan dikirim klien; aturan di TypeScript hanya untuk pratinjau.
- **Gerbang `/konsultasi` untuk non-member dibuka** — inilah yang menjawab "yang tidak berlangganan pun bisa konsultasi".
- **Celah keamanan yang ditutup bersamaan**: policy `konsultasi update peserta` mengizinkan ortu meng-update baris booking-nya sendiri — begitu ada uang, ia bisa menyetel `status='diterima'` atau `total=0` lewat REST. Ditutup dengan trigger pelindung kolom.
- **Kuota gratis dari paket** (tambahan dari PRD ini): `pendaftaran_konsultasi.dari_kuota`; RPC memeriksa sisa kuota **paket anak yang dibooking-kan** pada periode berjalan — bila masih ada, total 0 dan kuota terpakai bertambah.
- Honorarium/bagi hasil psikolog **ditunda** ke tahap terpisah.
