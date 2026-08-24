# Referensi Kode KidzPlayful — peta modul, fungsi & alur

> **Kenapa dokumen ini ada.** `DEVELOPER-KIDZPLAYFUL.md` menjelaskan **kenapa** sesuatu diputuskan begitu (riwayat keputusan & jebakan), dan `DOKUMENTASI-KIDZPLAYFUL.md` menjelaskan **apa** yang dilihat pengguna. Yang belum ada: peta **di mana** sebuah aturan hidup di dalam kode. Dokumen ini mengisi itu — daftar modul & fungsi per lapisan, alur ujung-ke-ujung untuk jalur penting, dan indeks "gejala → berkas yang harus dibuka".
>
> Ukuran proyek saat dokumen ini dibuat: **433 berkas TypeScript, ~32.500 baris, 104 migrasi SQL, 89 rute halaman, 19 rute API**.

---

## 1. Peta 30 detik

```
                        ┌──────────────────────────────────────────┐
   Browser  ──────────▶ │  src/app/**/page.tsx    (Server Comp.)   │  BACA data
                        │  src/app/**/*.tsx       (Client Comp.)   │  interaksi
                        └───────────────┬──────────────────────────┘
                                        │ memanggil
                        ┌───────────────▼──────────────────────────┐
                        │  src/lib/data/*.ts                       │
                        │   • tanpa 'use server'  → PEMBACA         │
                        │   • dengan 'use server' → SERVER ACTION   │  ← satu-satunya jalur TULIS
                        └───────────────┬──────────────────────────┘
                          memanggil     │            memanggil
             ┌──────────────────────────┴─────┐   ┌──────────────────────┐
             ▼                                ▼   ▼                      │
   ┌───────────────────────┐        ┌────────────────────────┐           │
   │ src/lib/domain/*.ts   │        │ src/lib/supabase/*.ts  │───────────┘
   │ ATURAN MURNI, diuji   │        │ 3 klien berbeda        │
   │ tanpa I/O sama sekali │        └──────────┬─────────────┘
   └───────────────────────┘                   │
                                               ▼
                                    ┌──────────────────────┐
                                    │ Supabase Postgres    │
                                    │ + RLS + trigger      │  ← penegak terakhir
                                    └──────────────────────┘
```

**Empat hal yang harus melekat sebelum menyentuh apa pun:**

1. **Keputusan bisnis hidup di `src/lib/domain/`**, bukan di halaman dan bukan di komponen. Kalau Anda menemukan `if` yang menentukan boleh/tidak boleh di dalam `page.tsx`, itu bau — kemungkinan aturannya ada dua salinan yang bisa berbeda jawaban.
2. **Menulis hanya lewat Server Action** (`'use server'`). Komponen klien tak pernah menulis langsung ke Supabase.
3. **UI bukan penegak.** Setiap gerbang yang penting juga ditegakkan di **RLS atau trigger** — karena `PATCH` REST langsung memakai kunci anon bisa melewati UI sepenuhnya.
4. **Migrasi dijalankan MANUAL oleh pemilik, setelah deploy.** Jadi kode wajib **toleran**: kolom/tabel baru dibaca dengan cadangan, dan tulisan diulang tanpa kolom itu. Lihat §7.

---

## 2. `src/lib/supabase/` — tiga klien, jangan tertukar

| Berkas | Fungsi | Dipakai di | Hak |
|---|---|---|---|
| `server.ts` | `createClient()` (async) | Server Component & Server Action | **sebagai user yang login** — RLS berlaku |
| `client.ts` | `createClient()` | Komponen `'use client'` | sebagai user, dari browser — RLS berlaku |
| `admin.ts` | `createAdminClient()` | **hanya** Server Action yang memang butuh melewati RLS | `SUPABASE_SERVICE_ROLE_KEY` — **melewati RLS** |

> ⚠️ `createAdminClient()` mematikan seluruh RLS. Kalau sebuah bug membuat data satu akun muncul di akun lain, cek dulu apakah jalur itu memakai klien admin tanpa memfilter `ortu_id` sendiri.

---

## 3. `src/lib/domain/` — semua aturan, murni & teruji

25 berkas, tanpa satu pun I/O. **Inilah tempat memperbaiki bug logika**, dan tempat menulis tes yang menggigit. Semua bisa diuji tanpa database.

### Langganan, hak akses & harga

| Fungsi | Berkas | Memutuskan |
|---|---|---|
| `statusLangganan()` | `trial.ts` | `aktif` / `trial` / `tenggang` / `kadaluarsa` |
| `hakAksesAnak()` | `entitlement.ts` | hak **satu anak**: ideBermain, game, video, worksheet, rapor, kuota konsultasi. Membandingkan **tanggal WIB**, bukan `Date` — lihat komentarnya |
| `hakAksesAkun()` | `entitlement.ts` | hak tingkat akun = **paket tertinggi** di antara anak non-kadaluarsa, **+ `status`** paket yang terpilih |
| `tambahHari()` | `entitlement.ts` | aritmetika tanggal untuk masa tenggang |
| `hitungTagihan()` | `langganan-harga.ts` | total tagihan multi-anak + diskon keluarga + voucher |
| `aturanKeluargaTerpakai()` | `langganan-harga.ts` | tingkat diskon keluarga menurut jumlah anak |
| `hargaProdukUntukPaket()` / `hargaEventUntukPaket()` | `harga.ts` | harga setelah diskon paket |
| `persenUntukPaket()` | `harga.ts` | persen diskon untuk kode paket |

### Kuota

| Fungsi | Berkas | Memutuskan |
|---|---|---|
| `sisaWorksheetAkun()` | `kuota-worksheet.ts` | **gerbang unduh worksheet**: non-member=0, trial=1 seumur trial, member=kuota paket |
| `sisaKuotaWorksheet()` | `kuota-worksheet.ts` | kuota mentah paket (`jumlah = 0` berarti **tanpa batas**) |
| `awalPeriode()` | `kuota-worksheet.ts` | awal bulan **WIB** untuk reset kuota |
| `sisaKuotaKonsultasi()` | `kuota-konsultasi.ts` | sisa sesi konsultasi gratis anak (`jumlah = 0` berarti **tak ada kuota** — arti 0 berbeda dari worksheet!) |
| `hitungBiayaKonsultasi()` | `konsultasi-biaya.ts` | harga sesi: tarif dasar → diskon member → voucher → kuota gratis |
| `memakaiSlotKonsultasi()` | `konsultasi-slot.ts` | apakah sesi ini **menahan** slot psikolog (kembaran dari trigger SQL `cek_slot_konsultasi`) |
| `keadaanSlot()` | `konsultasi-slot.ts` | `aman` / `draft` / `hangus` / `tak-relevan` |

### Kurikulum — dua modul, jangan tertukar

`kurikulum.ts` adalah **generasi pertama** (gerbang per nomor bulan global). `siklus-kurikulum.ts` adalah **generasi kedua** (0104) yang dipakai halaman sekarang.

| Fungsi | Berkas | Memutuskan |
|---|---|---|
| `siklusBerjalan()` | `siklus-kurikulum.ts` | **siklus = `min(bulan kalender lewat + 1, bulan dibayar)`** — kalender menahan pelanggan tahunan, bayaran menahan yang berhenti |
| `konteksKurikulum()` | `siklus-kurikulum.ts` | konteks lengkap: siklus, `umurBeku` (umur di **awal** siklus), kategori beku, bulan-dalam-kategori, `maksBulan` per kategori |
| `bracketUntukUmur()` | `siklus-kurikulum.ts` | kategori usia untuk sebuah umur; rentang bertumpuk → **yang paling sempit** menang |
| `statusTemaBracket()` | `siklus-kurikulum.ts` | `terbuka` / `kunci-judul` / `terkunci` per tema |
| `kelompokTemaBracket()` | `siklus-kurikulum.ts` | pisah tema jadi bulanIni / sudahTerbuka / bulanDepan / terkunci |
| `tambahBulan()` | `siklus-kurikulum.ts` | +N bulan kalender, **akhir bulan dijepit** (31 Jan + 1 = 28 Feb) |
| `posisiBerikutnya()` | `kurikulum.ts` | slot bebas berikutnya di sebuah kategori (bulan 1 minggu 1..4, lalu bulan 2) |
| `salinTemaKeKategoriLain()` | `kurikulum.ts` | duplikat tema: bawa isinya, **buang** kategori & posisi |
| `susunHasilEvaluasi()` | `kurikulum.ts` | kalimat checklist diambil dari **materi di server**, bukan dari klien |
| `posisiTema()` / `evaluasiPerAktivitas()` / `ringkasEvaluasi()` | `kurikulum.ts` | tampilan "Bulan ke-N · Minggu ke-M", pengelompokan hasil per aktivitas |
| `cocokUsia()` | `kurikulum.ts` | rentang usia tema vs umur — **inklusif dua ujung** |

### Laporan & rapor

| Fungsi | Berkas | Memutuskan |
|---|---|---|
| `ringkasBulan()` | `laporan-bulanan.ts` | seluruh isi rapor bulanan (kegiatan, game, catatan guru, evaluasi kurikulum, rekomendasi psikolog) |
| `rentangBulan()` / `labelBulan()` / `bulanTerakhir()` | `laporan-bulanan.ts` | batas bulan `YYYY-MM` |
| `laporanAnak()` | `laporan-anak.ts` | agregat sesi/bintang/menit per mesin |
| `ringkasanLangganan()` | `laporan.ts` | ringkasan langganan untuk admin |

### Gamifikasi & game

| Fungsi | Berkas | Memutuskan |
|---|---|---|
| `tanggalWIB()` | `gamifikasi.ts` | **tanggal WIB hari ini** — dipakai di mana-mana; `current_date` Postgres itu UTC |
| `evaluasiLencana()` | `gamifikasi.ts` | lencana yang layak dari statistik anak |
| `tantanganHariIni()` / `progresTantangan()` | `gamifikasi.ts` | tantangan harian bawaan |
| `progresTantanganKustom()` / `cocokItem()` | `tantangan-kustom.ts` | tantangan buatan admin |
| `hitungBintang()` | `skor.ts` | 1–3 bintang dari benar/total |
| `sisaDetik()` / `waktuHabis()` / `kunciHari()` | `waktu.ts` | batas waktu main harian |

### Lain-lain

`saring.ts` (`cocokCari`, `dalamRentang`, `tanggalWibDariISO`, `rentangTerpakai` — pencarian teks & rentang tanggal; **batas inklusif**, cap waktu dikonversi ke **WIB**) · `voucher.ts` (`validasiVoucher`, `hitungPotongan`, `adaCakupan`) · `anak.ts` (`umurTahun`, `umurTeks`, `modeDefault`) · `usia.ts` (`kategoriUsia` untuk game) · `paginasi.ts` (`saringPaginasi` — **saring dulu seluruh daftar, baru potong halaman**) · `reminder.ts` (`susunPesanReminder`) · `jadwal.ts` · `stiker.ts` · `laporan.ts`

---

## 4. `src/lib/data/` — 105 berkas: pembaca vs penulis

**Aturan penamaan yang konsisten:** `nama.ts` = **pembaca** (dipanggil dari Server Component), `nama-actions.ts` = **penulis** (`'use server'`). Dua pengecualian yang perlu diingat:

- `skor.ts` **adalah** action; `skor-core.ts` inti bersamanya yang bukan action (dipakai juga oleh rute API).
- `ledger.ts` bukan action — ia dipanggil **dari dalam** action lain (`catatLedger`).

### Penjaga peran (panggil di baris pertama halaman)

| Fungsi | Berkas | Kalau gagal |
|---|---|---|
| `getAnakTerjamin()` | `anak.ts` | redirect — anak bukan milik user |
| `getAdminTerjamin()` / `getSuperuserTerjamin()` | `admin.ts` | redirect |
| `getGuruTerjamin()` | `guru.ts` | redirect |
| `getPsikologTerjamin()` | `psikolog.ts` | redirect `/pilih-anak` |
| `getInvestorTerjamin()` | `investor.ts` | redirect |
| `getPengelolaUserTerjamin()` | `admin-users.ts` | redirect |

### Kelompok modul (pembaca ▸ penulis)

| Wilayah | Pembaca | Penulis |
|---|---|---|
| **Langganan per anak** | `langganan-anak.ts`, `langganan-status.ts`, `paket.ts`, `pengaturan-trial.ts` | `langganan-anak-actions.ts` (`setPaketAnak`, `hentikanPaketAnak`), `paket-actions.ts` |
| **Tagihan** | `tagihan.ts` | `tagihan-actions.ts`, `tagihan-admin-actions.ts` (`verifikasiTagihan`) |
| **Kurikulum** | `kurikulum.ts` (`getKonteksKurikulumAnak`), `kelas-bermain.ts`, `publik.ts` | `kurikulum-actions.ts` (`simpanEvaluasi`), `kelas-bermain-actions.ts` |
| **Catatan tema** | `catatan-tema.ts` | `catatan-tema-actions.ts` |
| **Worksheet** | `worksheet.ts` (`getStatusWorksheet`) | `worksheet-actions.ts` (`mintaWorksheet`) |
| **Konsultasi** | `konsultasi.ts`, `konsultasi-tarif.ts`, `konsultasi-bayar.ts`, `kuota-anak.ts`, `psikolog.ts`, `psikolog-profil.ts` | `konsultasi-actions.ts`, `konsultasi-bayar-actions.ts`, `psikolog-actions.ts` |
| **Event & kehadiran** | `event.ts`, `admin-event.ts`, `kuota-event.ts`, `guru.ts`, `catatan.ts`, `sertifikat.ts` | `event-actions.ts`, `admin-event-actions.ts`, `guru-actions.ts`, `admin-sertifikat-actions.ts` |
| **Toko** | `store.ts`, `keranjang.ts`, `pesanan.ts`, `admin-store.ts` | `keranjang-actions.ts` (`checkout`), `pesanan-actions.ts`, `admin-store-actions.ts` |
| **Game & gamifikasi** | `pustaka.ts`, `gamifikasi.ts`, `game-hasil.ts`, `game-pilihan.ts`, `tema.ts`, `panduan.ts`, `tantangan-kustom.ts` | `skor.ts` (`catatHasil`), `admin-konten.ts`, `tantangan-kustom-actions.ts` |
| **Laporan anak** | `catatan.ts`, `kegiatan.ts`, `rekomendasi-item.ts`, `aktivitas.ts` | `kegiatan-actions.ts`, `rekomendasi-item-actions.ts`, `aktivitas-actions.ts` |
| **Keuangan** | `keuangan.ts`, `anggaran.ts`, `kpi.ts`, `sponsor.ts` | `keuangan-actions.ts`, `anggaran-actions.ts`, `sponsor-actions.ts`, `ledger.ts` |
| **Komunitas & artikel** | `komunitas.ts`, `artikel.ts`, `feedback.ts` | `komunitas-actions.ts`, `admin-komunitas.ts`, `artikel-admin.ts`, `feedback-actions.ts` |
| **Master & konfigurasi** | `kategori-usia.ts`, `fokus-area.ts`, `pengaturan-bayar.ts`, `pengaturan-menu.ts`, `voucher.ts` | `kategori-usia-actions.ts`, `fokus-area-actions.ts`, `voucher-actions.ts`, `admin-bisnis.ts` |
| **Peran & pengguna** | `admin-users.ts`, `admin-guru.ts`, `admin-psikolog.ts`, `admin-anak.ts` | `admin-users-actions.ts`, `admin-guru-actions.ts`, `admin-psikolog-actions.ts`, `ortu-actions.ts` |

### Cache katalog

`publik.ts` memakai `unstable_cache` dengan tag `'katalog'`. **Setiap action yang mengubah katalog wajib memanggil `updateTag('katalog')`** — kalau lupa, perubahan admin tidak muncul di halaman pengguna sampai cache kedaluwarsa (60 detik) atau sampai deploy. Ini pernah jadi bug "edit tidak tersimpan" yang sebenarnya tersimpan.

---

## 5. `src/components/` — 45 komponen + 21 mesin game

**Server (`S`)** merender data, **Client (`C`)** menangani interaksi. Yang paling sering disentuh saat memperbaiki bug:

| Komponen | Peran |
|---|---|
| `KelasIsi` (S) | isi satu tema: aktivitas, bahan, worksheet, evaluasi. Dipakai di **4 tempat** (`/kelas/[id]`, Mode Anak, Mode Ortu, teaser) — ubah satu, cek keempatnya |
| `AktivitasTema` (S) | kartu aktivitas + checklist evaluasi + tombol game, satu tombol simpan di bawah |
| `WorksheetBtn` (C) | tombol unduh; **bukan** `<a href>` — URL diberikan server setelah kuota diperiksa |
| `LaporanAnakView` (S) | badan laporan tumbuh kembang (dipakai ortu & psikolog) |
| `PemilihAnak` (C) | pemilih anak untuk halaman tanpa `anakId` di rutenya |
| `ChatKonsultasi` (C) | chat polling ~3 detik |
| `Terkunci` (S) | tampilan fitur terkunci — **pola resmi** untuk membatasi konten |
| `GameRunner` (C) | pemilih mesin game + pencatat hasil |

**Mesin game** (`src/components/game/`): 15 mesin dipilih di [GameRunner.tsx:72-86](../src/components/game/GameRunner.tsx#L72-L86) berdasarkan `paket.mesin` — `tekan-sesuai`, `seret-wadah`, `cari-pasangan`, `mewarnai`, `dekode`, `urutan`, `jalur`, `hitung`, `cocokkan`, `ejakata`, `garis`, `sukukata`, `jiplak`, `hitung-benda`, `ingatan`. Menambah mesin = tambah komponen + satu cabang di sini + tipe `butir`-nya di `lib/game/tipe.ts`.

**Pembuat gambar tanpa dependensi** (Canvas murni): `lib/rapor-jpeg.ts`, `lib/sertifikat-jpeg.ts`, `lib/kartu-bersama.ts`, `lib/story-card.ts`. Perubahan tata letak di sini **wajib diverifikasi visual** (render lewat Vite + Playwright), bukan hanya lolos `tsc`.

`rapor-jpeg.ts` menghasilkan **A4 portrait** (2480x3508 px @300dpi), **satu atau dua halaman**. Ruang gambarnya tetap dinyatakan dalam satuan LOGIS selebar 3508 lalu diperkecil sekali lewat `ctx.scale(SKALA, SKALA)` — semua ukuran huruf & jarak di berkas itu sudah ditala terhadap lebar 3508, dan menala ulangnya berarti memeriksa ulang setiap baris secara visual. Keputusannya diambil dengan menggambar pada satu halaman lebih dulu sambil menghitung berapa banyak isi yang dipotong (`terpotong`); nol potongan berarti satu halaman cukup, selain itu digambar ulang pada tinggi dua halaman. Urutannya TIDAK boleh dibalik: tata letaknya elastis (batas kolom & plafon bagian diturunkan dari tinggi kanvas), jadi mengukur langsung pada kanvas dua halaman selalu menyimpulkan "butuh dua halaman".

---

## 6. Alur ujung-ke-ujung

### A. Anak membuka tema kurikulum

```
/main/[anakId]/page.tsx
  ├─ getAnakTerjamin(anakId)               anak.ts        penjaga
  ├─ getKonteksKurikulumAnak(anakId)       kurikulum.ts   ← baca kurikulum_mulai + bulan_kurikulum + kategori_usia
  │    └─ konteksKurikulum({...})          siklus-kurikulum.ts   MURNI: siklus, umurBeku, kategori beku
  ├─ getKelasAktifCached()                 publik.ts      cache tag 'katalog'
  ├─ kelompokTemaBracket(kelas, ktx)       siklus-kurikulum.ts   MURNI: bulanIni/sudahTerbuka/terkunci
  └─ <MenuAnak kelasList=… kelasTerkunci=… bulanKurikulum=… modeWorksheet=… />
        └─ <KelasIsi> ─▶ <AktivitasTema>
              └─ simpanEvaluasi()          kurikulum-actions.ts  ← TULIS
                    └─ susunHasilEvaluasi()  kurikulum.ts  kalimat diambil dari materi server
```

**Kalau tema salah muncul/hilang:** periksa berurutan — `konteksKurikulum` (umurBeku & kategori), lalu `statusTemaBracket` (nomor bulan), baru datanya (`kategori_usia_id` & `bulan_kurikulum` tema itu).

### B. Unduh worksheet

```
<WorksheetBtn> klik
  └─ mintaWorksheet(kelasId)               worksheet-actions.ts
       ├─ baca kelas_bermain (toleran: worksheet_terbuka)
       ├─ getStatusWorksheet()             worksheet.ts
       │    ├─ getHakAkun()                langganan-anak.ts → hakAksesAkun()  entitlement.ts
       │    └─ sisaWorksheetAkun()         kuota-worksheet.ts  MURNI: gerbang mode
       ├─ TOLAK bila !boleh                pesanTolak() — pesan berbeda per keadaan
       ├─ CATAT unduhan_worksheet          sebelum URL diberikan
       └─ kembalikan url + sisa
```

**Urutan gerbangnya penting:** hak akun **dulu**, penanda `worksheet_terbuka` **sesudah**. Versi lama membalik urutan ini dan itu membuat non-member bisa mengunduh.

### C. Konsultasi psikolog (bayar per sesi)

```
/konsultasi  ──▶ daftarKonsultasi()        konsultasi-actions.ts
                   └─ RPC SQL daftar_konsultasi   ← harga/diskon/kuota/voucher dihitung DI SQL
                        └─ trigger cek_slot_konsultasi   ← penegak kuota psikolog
ortu unggah bukti ──▶ unggahBuktiKonsultasi()
/admin/psikolog  ──▶ getKonsultasiMenungguBayar()  konsultasi-bayar.ts
                     ├─ tombol 💬 WA ortu (linkWa)
                     └─ verifikasiBayarKonsultasi() → chat terbuka
```

Pratinjau biaya di form memakai `getPratinjauKonsultasi()` + `hitungBiayaKonsultasi()` — **kembaran murni** dari RPC-nya. Kalau angka di form beda dengan yang tersimpan, keduanya sudah tidak sinkron: perbaiki **bersama**.

### D. Langganan → kurikulum

```
admin klik aktifkan / verifikasiTagihan()
  └─ setPaketAnak(anakId, paketId, bulan)  langganan-anak-actions.ts
       ├─ aktif_sampai = max(hari ini, aktif_sampai) + N bulan   (WIB)
       ├─ bulan_kurikulum += N            ← BATAS bulan, bukan nomor bulan tampil
       └─ kurikulum_mulai = hari ini      ← hanya bila MASIH KOSONG
```

`hentikanPaketAnak` mengakhiri periode **kemarin** (WIB) dan **mengosongkan `paket_id`** — kalau `paket_id` dibiarkan, masa tenggang membuat haknya seolah masih jalan.

### E. Main game → skor

```
<GameRunner> onSelesai
  └─ catatHasil({...})                     skor.ts ('use server')
       └─ catatHasilCore(supabase, input)  skor-core.ts   ← dipakai juga /api/hasil-main
            ├─ insert hasil_main
            ├─ koin & streak (tanggalWIB)
            └─ evaluasiLencana()           gamifikasi.ts  MURNI
```

### F. Checkout toko

```
/keranjang ──▶ checkout()                  keranjang-actions.ts
                 ├─ baca keranjang_item + produk (harga, stok, diskon)
                 ├─ getHakAkun() → diskonKode
                 ├─ hargaProdukUntukPaket()  harga.ts   MURNI
                 ├─ nilaiVoucherById()       voucher.ts (+ validasiVoucher MURNI)
                 └─ insert pesanan + item_pesanan       ← BELUM masuk ledger

ortu unggah bukti ──▶ uploadBuktiPesanan()  pesanan-actions.ts
/admin/pesanan   ──▶ verifikasiPesanan()    admin-store-actions.ts
                       └─ catatLedger()     ledger.ts   ← uang tercatat DI SINI
```

> **Penting saat melacak selisih keuangan:** pesanan yang dibuat belum menyentuh ledger. Pemasukan tercatat hanya saat **admin memverifikasi**. Pola yang sama berlaku di semua wilayah uang — `catatLedger` dipanggil dari `verifikasiPesanan` (store), `verifikasiTagihan` (langganan), `verifikasiBayarKonsultasi` (konsultasi), `setStatusPendaftaran` (event), `catatPembayaran` (sponsor), dan `aktifkanLangganan` (admin manual). Membatalkan berarti `hapusLedgerRef()`.

### G. Rapor bulanan

```
/anak/[anakId]/rapor/[ym]/page.tsx
  ├─ kumpulkan: kegiatan_anak, hasil_main, catatan_perkembangan,
  │             evaluasi_kurikulum, rekomendasi psikolog
  ├─ ringkasBulan({...})                   laporan-bulanan.ts  MURNI
  └─ <UnduhRaporBtn> ─▶ buatRaporJpeg()    lib/rapor-jpeg.ts   Canvas
```

---

## 7. Pola toleran — wajib dipahami sebelum menambah kolom

Migrasi dijalankan **manual setelah deploy**, jadi ada jeda di mana kode baru berjalan di atas skema lama. Polanya:

**Membaca** — coba kolom baru, kalau gagal ulangi tanpa kolom itu:

```ts
const baru = await s.from('t').select('a,b,kolom_baru').eq(…);
if (!baru.error) { /* pakai */ }
else { const lama = await s.from('t').select('a,b').eq(…); /* cadangan */ }
```

Contoh nyata: `pilihToleran()` di [publik.ts](../src/lib/data/publik.ts), `getKonteksKurikulumAnak()` di [kurikulum.ts](../src/lib/data/kurikulum.ts).

**Menulis** — hapus kolomnya lalu ulangi:

```ts
if (error && /kolom_baru/.test(error.message)) { delete baris.kolom_baru; /* ulangi */ }
```

**Arah cadangan dipilih menurut apa yang rusak bila salah**, bukan kebiasaan:

| Keadaan | Arah | Alasan |
|---|---|---|
| Kurikulum tak terbaca | **MEMBUKA** (perilaku lama) | mengunci konten yang tadinya jalan terbaca sebagai fitur dicabut |
| Kuota worksheet member | **MEMBUKA** | kerugiannya kecil |
| Plafon trial worksheet | **MENUTUP** | kalau unduhan tak bisa dicatat, "1×" tak bisa ditegakkan sama sekali |

---

## 8. Indeks pelacakan bug — gejala ▸ berkas

| Gejala | Buka ini dulu |
|---|---|
| Non-member bisa akses fitur berbayar | `domain/entitlement.ts` (`hakAksesAnak`/`hakAksesAkun`) → pembaca `data/*.ts`-nya → **urutan gerbang** di action-nya |
| Kuota tak berkurang / bisa dilewati | action-nya (apakah mencatat **sebelum** memberi hasil?) → trigger SQL padanannya |
| Tema kurikulum salah muncul/hilang | `domain/siklus-kurikulum.ts` → `data/kurikulum.ts` → `kategori_usia_id` & `bulan_kurikulum` di data |
| Perubahan admin tak muncul di sisi pengguna | apakah action-nya memanggil `updateTag('katalog')`? |
| Tanggal/periode geser sehari | apakah memakai `tanggalWIB()`? `current_date` Postgres itu **UTC**. Untuk cap waktu: `tanggalWibDariISO()`, bukan `.slice(0, 10)` |
| Filter tanggal membuang hari terakhir | batas harus **inklusif** — `dalamRentang()` di `domain/saring.ts` |
| Tombol menjorok keluar dari kartu | `.kp-btn` punya bayangan solid **6px di luar** kotaknya; wadah butuh padding bawah ≥ 18px |
| Angka di form ≠ angka tersimpan | kembaran murni vs RPC SQL (`hitungBiayaKonsultasi` ↔ `daftar_konsultasi`) |
| Data akun lain bocor | apakah jalurnya memakai `createAdminClient()`? |
| Tombol/checklist mati di satu halaman saja | prop identitas opsional (`anakId`, `modeWorksheet`) lupa dipasang — `grep -n "<NamaKomponen" src` **semua** pemanggil |
| "Tersimpan" padahal tak ada yang berubah | `.update().eq()` yang tak mencocokkan baris **bukan error** — tambahkan `.select()` lalu periksa panjangnya |
| Tata letak rapor/sertifikat rusak | `lib/rapor-jpeg.ts` / `sertifikat-jpeg.ts` — **wajib** verifikasi visual |
| Fungsi SQL bisa dipanggil kunci anon | butuh **dua** pencabutan: `revoke … from public` **dan** `from anon` |
| Galat PGRST201 / daftar kosong mendadak | embed PostgREST ke tabel dengan **dua** foreign key — ambil terpisah |

---

## 9. Cara aman mengubah

**Gerbang mutu, urut, sebelum setiap commit:**

```bash
npx tsc --noEmit     # tipe
npx eslint .         # gaya (13 error pra-ada di komponen game: Date.now purity)
npm test             # vitest — 301 tes
npm run build        # Next.js production
```

**Uji daya gigit (mutation testing) — wajib untuk aturan baru.** Tes hijau belum berarti tes menjaga apa pun. Rusak sengaja aturannya, lalu pastikan tesnya jatuh:

```bash
cp src/lib/domain/x.ts /tmp/x.bak
sed -i 's/<=/</' src/lib/domain/x.ts      # balik satu keputusan
npx vitest run src/lib/domain/__tests__/x.test.ts   # HARUS gagal
cp /tmp/x.bak src/lib/domain/x.ts
```

Kalau tesnya tetap hijau, tesnya tidak menguji apa pun.

**Menambah aturan baru:** tulis fungsi murni di `domain/` + tesnya ▸ panggil dari `data/` ▸ pakai di UI ▸ tegakkan juga di RLS/trigger bila menyangkut uang, kuota, atau kepemilikan.

**Memverifikasi migrasi mendarat** (baca-saja, kunci anon) — sertakan **kolom kontrol palsu** yang harus menjawab `42703`, kalau tidak Anda tak bisa membedakan "kolomnya ada" dari "probe-nya rusak".

---

## 10. Dokumen lain

| Dokumen | Isi |
|---|---|
| `CLAUDE.md` | aturan tetap yang tak boleh dilanggar (ringkas, wajib dibaca) |
| `docs/DEVELOPER-KIDZPLAYFUL.md` | **kenapa** tiap keputusan diambil + katalog bug yang pernah terjadi |
| `docs/DOKUMENTASI-KIDZPLAYFUL.md` | sisi pengguna & admin + urutan 104 migrasi |
| `supabase/migrations/` | skema; tiap berkas menjelaskan sendiri alasannya di kepala berkas |
