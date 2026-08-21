# PRD — Kurikulum Preschool Homeschooling: Evaluasi per Aktivitas, Game Terhubung & Rilis Bertahap

**Penulis:** CPO · **Tanggal:** 2026-08-21 · **Status:** disetujui untuk implementasi

---

## 1. Konteks & masalah

Rangkaian langganan bertingkat (migrasi 0089–0097) sudah selesai: paket per anak, tagihan, konsultasi bayar-per-sesi, rapor bulanan yang bisa diunduh. Yang masih kosong justru **isi** dari kata "preschool homeschooling": hari ini Ide Bermain (`kelas_bermain`) adalah **kumpulan materi lepas** — semuanya tampil sekaligus, tak berurutan, tak ada penilaian, dan tak meninggalkan jejak apa pun di rapor anak. Orang tua mengerjakan aktivitas di rumah lalu tak punya bukti bahwa anaknya berkembang.

Tiga kekurangan konkret yang ditutup PRD ini:

1. **Tak ada evaluasi.** Penilaian perkembangan hanya lahir dari **event** (`event.indikator_perkembangan` → `catatan_perkembangan.penilaian`, dinilai guru). Aktivitas yang dikerjakan di rumah — inti homeschooling — tak pernah dinilai siapa pun.
2. **Game dan aktivitas hidup terpisah.** `paket_aset` (game) hanya bisa ditemukan lewat Mode Anak; tak ada jalan dari sebuah aktivitas ke game yang melatih keterampilan yang sama.
3. **Tak ada alasan menunggu bulan depan.** Seluruh materi aktif tampil sekaligus (`getKelasAktifCached()` mengambil semua `status='aktif'`), jadi orang tua yang sudah menyerap semuanya tak punya alasan memperpanjang.

**Hasil yang dituju:** kurikulum berjalan **per anak** dengan 4 tema tiap bulan langganan; setiap aktivitas punya checklist evaluasi yang diisi orang tua (juga boleh guru/psikolog) dan **masuk ke rapor**; setiap aktivitas bisa dilanjutkan ke game yang relevan lalu kembali ke tempat semula.

---

## 2. Keputusan yang sudah ditetapkan

| Topik | Keputusan |
|---|---|
| Bentuk penilaian | **Kalimat bebas per aktivitas** (diinput admin, boleh berbeda tiap aktivitas) + **centang sederhana** (tercapai / belum) |
| Penilai | **Orang tua**, **guru/admin**, **dan psikolog** |
| Hak akses | **Semua paket, termasuk Basic** (dan masa trial) — kurikulum bukan pembeda paket |
| Cadensa tema | **4 tema per bulan**, kohort **per ANAK** dari mulai langganan anak itu |
| Jam kohort | **Ikut jumlah bulan berlangganan** — bulan tidak aktif tidak menambah hitungan |
| Kunci tema | **Per anak, TANPA penggabungan**: kakak di bulan ke-3 tidak membuka tema itu untuk bayi yang masih bulan ke-1 |
| Tema lama | **Tetap terbuka selamanya** untuk anak itu (penghitungnya tak pernah turun) |
| Tema bulan depan | **Judul + sampul saja**, tanpa isi |
| Pemilihan game | Admin memilihkan game per aktivitas dan **boleh tidak memilih** (`null` = aktivitas tanpa game) |

### Konsekuensi yang disadari sejak awal

- **Daftar tema tak bisa lagi tingkat akun.** Ide Bermain dirender di 4 tempat: Mode Anak (`/main/[anakId]`) dan Mode Ortu (`/ortu/[anakId]`) sudah punya `anakId`; **`/kelas-saya` dan `/kelas/[id]` tidak** dan harus diberi konteks anak (`?anak=<id>`, bawaan anak pertama / anak yang terakhir dinilai) dengan **pemilih anak yang selalu terlihat**.
- **Layar wajib menyebut atas nama siapa** kurikulum ditampilkan ("Kurikulum **Aletta** · bulan ke-3"), dan tema terkunci menyebut sebabnya ("terbuka pada bulan ke-4 langganan **Bima**"). Tanpa itu, orang tua yang melihat tema terbuka di halaman kakak lalu terkunci di halaman bayi akan menyimpulkan aplikasinya rusak.
- **"4 per bulan" adalah aturan ISI, bukan hukum kode.** Yang dikodekan adalah "tema bulan ke-N"; admin diberi peringatan bila sebuah bulan berisi ≠ 4 tema. Memaksa tepat 4 di kode akan menyembunyikan tema ke-5 tanpa jejak.
- **Trial & Basic ikut mendapat bulan ke-1.** Anak tanpa langganan berjalan di bulan ke-1 — 4 tema pertama terbuka, judul bulan ke-2 terlihat. Inilah teaser-nya.

---

## 3. Model data

### Kolom baru `kelas_bermain`

| Kolom | Isi |
|---|---|
| `bulan_kurikulum int not null default 1` | tema ini milik **bulan ke-berapa**. Eksplisit, bukan `ceil(urutan/4)` — admin bisa menata bulan dengan jumlah tak sama tanpa menyentuh kode |
| `urutan int not null default 0` | urutan tampil di dalam bulan itu |

`fokus_area text[]` yang sudah ada **tetap** menjadi "area tumbuh kembang" tema (master `fokus_area`, 0078) — tidak ada tabel area baru.

### Di dalam `kelas_bermain.aktivitas jsonb` (tanpa kolom baru)

Bentuk sekarang `[{judul, cara_membuat, langkah[], catatan_ortu}]` ditambah **dua field opsional**:

```jsonc
{
  "judul": "Meronce manik besar",
  "evaluasi": [
    "Anak mau memegang manik tanpa dibantu",
    "Anak menyelesaikan minimal 5 manik",
    "Anak menyebut warna manik yang dipegang"
  ],
  "game_paket_id": "uuid-paket_aset"   // null / tak ada = aktivitas tanpa game
}
```

Ditaruh di jsonb yang sudah ada karena jumlah butir evaluasi berbeda tiap aktivitas — kolom tabel akan memaksa jumlah tetap. Konsekuensinya kode harus tahan kedua field itu tidak ada (materi lama), dan itu otomatis aman karena keduanya opsional.

### Tabel baru `evaluasi_kurikulum`

`id` · `anak_id` · `ortu_id` (untuk RLS) · `kelas_id` · `hasil jsonb` · `catatan text` · `dinilai_oleh text` · `peran text check (peran in ('ortu','guru','psikolog','admin'))` · `created_at` · `updated_at` · **unique (anak_id, kelas_id)**.

`hasil` menyimpan **snapshot kalimatnya**, bukan indeks:

```jsonc
[{ "aktivitas": "Meronce manik besar", "butir": "Anak mau memegang manik tanpa dibantu", "tercapai": true }]
```

Alasannya sama dengan `catatan_perkembangan.penilaian` dan `kegiatan_anak.judul`: begitu admin menyunting kalimat evaluasi, rapor bulan lalu **tidak boleh berubah artinya**. Menyimpan `[true,false,true]` beracuan indeks akan membuat rapor lama berbohong saat urutan butir bergeser.

**RLS:** baca & tulis oleh `ortu_id = auth.uid()`, plus `is_admin()` / `is_guru()` / `boleh_lihat_laporan_anak(anak_id)` (0066) untuk psikolog. **Tanpa DELETE untuk ortu** — riwayat rapor tak boleh dirapikan belakangan (pola `kegiatan_anak`, 0093).

### Penghitung bulan langganan per anak

`langganan_anak.bulan_kurikulum int not null default 0` — bertambah saat sebuah bulan berbayar benar-benar diberikan, yaitu di dalam `setPaketAnak(anakId, paketId, bulan)` (`lib/data/langganan-anak-actions.ts`), satu-satunya tempat periode diperpanjang (dipakai admin manual **dan** `verifikasiTagihan`).

Kenapa penghitung tersimpan, bukan diturunkan dari riwayat: riwayat pembayaran per **anak** hanya ada di `tagihan_langganan_item` (0090) dan itu **tidak mencakup** aktivasi manual admin maupun member lama hasil backfill 0089 — menurunkan angkanya akan salah untuk keduanya. `hentikanPaketAnak` **tidak** mengurangi: bulan yang sudah dijalani tidak hilang.

**Backfill:** anak yang kini punya `langganan_anak` diberi `bulan_kurikulum = greatest(1, Σ bulan dari tagihan diterima miliknya)`.

---

## 4. Aturan yang dikodekan (murni & diuji)

`src/lib/domain/kurikulum.ts` — satu tempat, tanpa I/O:

```
bulanKurikulumAnak(bulanTersimpan)   → number   // minimal 1: trial/Basic dapat bulan ke-1
statusTema(tema, bulanAnak)          → 'terbuka' | 'kunci-judul' | 'tersembunyi'
kelompokTema(temaList, bulanAnak)    → { bulanIni[], sudahTerbuka[], bulanDepan[] }
ringkasEvaluasi(hasil)               → { total, tercapai, persen }
```

`bulanAnak` **selalu milik satu anak** — tidak ada varian tingkat akun, supaya tak ada jalan pintas yang diam-diam menggabungkan kohort dua anak.

- `terbuka` bila `tema.bulan_kurikulum <= bulanAnak`
- `kunci-judul` bila `= bulanAnak + 1` → judul + sampul saja
- `tersembunyi` bila lebih jauh: menampilkan 12 bulan judul sekaligus mematikan rasa penasaran, bukan menumbuhkannya

---

## 5. Alur pengguna

Tiap aktivitas mendapat dua tambahan:

```
🎯 Meronce manik besar
   🛠️ Cara membuat … 🎲 Cara bermain …
   🎮 [ Mainkan game: Cari Pasangan Warna ]      ← hanya bila admin memilih game
   📋 EVALUASI (untuk Aletta)
      [x] Anak mau memegang manik tanpa dibantu
      [ ] Anak menyelesaikan minimal 5 manik
      [x] Anak menyebut warna manik yang dipegang
…
[ 💾 Simpan evaluasi tema ini ]   3 dari 7 butir tercapai · belum tersimpan
```

- **Satu tombol simpan per tema** menyimpan seluruh aktivitas sekaligus (satu baris `evaluasi_kurikulum`). Sebelum disimpan, centangnya tak berarti apa pun — dan itu **dinyatakan di layar**, karena checklist yang tampak tersimpan padahal tidak adalah cara tercepat kehilangan kepercayaan.
- **Menyimpan ulang** menimpa baris yang sama (`unique(anak_id, kelas_id)`) dan mencatat `peran` + `dinilai_oleh` penyimpan terakhir. Rapor menampilkan **siapa yang menilai**, karena "dinilai orang tua" dan "dinilai guru" tidak setara sebagai bukti.
- **Game dari aktivitas:** `/main/[anakId]?paket=<game_paket_id>&kembali=<path asal>`. Jalur `?paket=` **sudah ada** (`main/[anakId]/page.tsx` → `MenuAnak.paketAwal`); yang ditambahkan hanya `kembali`, dipakai `MenuAnak.onKeluar`. `kembali` hanya menerima **path internal** — parameter redirect yang menerima URL apa pun adalah lubang open-redirect.
- **Rilis bertahap:**

```
Kurikulum Aletta · bulan ke-3            [ ganti anak ▾ ]
BULAN INI (bulan ke-3)     4 tema, terbuka penuh
SUDAH TERBUKA              bulan 1–2, tetap bisa dibuka selamanya
BULAN DEPAN                judul saja + "terbuka saat langganan Aletta masuk bulan ke-4"
```

- **Rapor:** blok baru **"📋 Evaluasi Kurikulum"** di `LaporanAnakView` (per tema: judul, tanggal, `x dari y` butir, siapa penilai, butir yang belum tercapai) dan di **rapor bulanan** (`domain/laporan-bulanan.ts` + `lib/rapor-jpeg.ts`) — difilter `updated_at` di dalam `rentangBulan(ym)`, seperti rekomendasi psikolog.

---

## 6. Sisi admin

- **`/admin/kelas-bermain`** (`KelasAdmin.tsx`): per aktivitas → **daftar kalimat evaluasi** yang bisa ditambah/hapus (pola baris seperti `ParameterPerkembanganForm.tsx`) + **pemilih game OPSIONAL** (dropdown `paket_aset` bergrup per `tema`, menampilkan `area_skill` supaya admin bisa menilai kecocokan; pilihan pertama "— tanpa game —"). Per tema → **bulan kurikulum** + **urutan**.
- **Peringatan bulan tak berisi 4 tema** di daftar admin (mis. "Bulan 3: 5 tema"), bukan dipaksa di kode.
- **`/admin/langganan`**: tampilkan `bulan_kurikulum` tiap anak + koreksi manual — penghitung tersimpan pasti akan perlu dikoreksi suatu hari.

---

## 7. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| **Penghitung bulan salah** (aktivasi manual, backfill, koreksi) | Satu titik penambahan (`setPaketAnak`), backfill dari tagihan diterima, koreksi manual di admin |
| Indeks butir bergeser saat admin menyunting evaluasi | `hasil` menyimpan **snapshot kalimat**, bukan indeks |
| Orang tua mengira centang tersimpan otomatis | Penanda "belum tersimpan" + satu tombol simpan eksplisit per tema |
| Rapor mencampur penilaian orang tua & guru | `peran` + `dinilai_oleh` disimpan **dan** ditampilkan |
| **Tema terbuka untuk kakak, terkunci untuk bayi** | Konsekuensi sah dari kohort per anak: halaman menyebut nama anaknya, pemilih anak selalu terlihat, tema terkunci menyebut sebabnya |
| Halaman tingkat akun diam-diam menggabungkan kohort | `statusTema` hanya menerima `bulanAnak`; tak ada varian tingkat akun yang bisa dipanggil keliru |
| `kembali` dipakai untuk open-redirect | Hanya path internal yang diterima (helper murni + tes) |
| Kolom/tabel baru dibaca sebelum migrasi jalan | Pola `pilihToleran` (`lib/data/publik.ts`) + default aman: gagal baca `bulan_kurikulum` → semua tema dianggap **terbuka** (jangan mengunci konten yang tadinya jalan) |

---

## 8. Di luar lingkup

Kurikulum berjenjang per usia (satu urutan untuk semua), penjadwalan otomatis/cron, sertifikat kelulusan bulanan, dan ekspor kurikulum ke PDF. Rebranding "preschool homeschooling" (sub-proyek D PRD langganan) tetap terpisah.

---

## 9. Verifikasi

1. **Gerbang mutu tiap tahap**: `npx tsc --noEmit` → `npx eslint` → `npm test` → `npm run build`.
2. **Hidup sebelum migrasi**: buka Mode Ortu & `/kelas/[id]` saat kolom/tabel baru belum ada — semua tema harus **terbuka**, bukan terkunci.
3. **Unit test `domain/kurikulum.ts`**: bulan 0 → tetap bulan 1 · tema bulan ke-N+1 → `kunci-judul` · N+2 → `tersembunyi` · tema lewat → `terbuka` · `ringkasEvaluasi` kosong/penuh.
4. **Uji daya gigit**: mutasi `<=` → `<` pada `statusTema` dan hilangkan `Math.max(1, …)` — masing-masing harus menjatuhkan tes.
5. **E2E**: (a) anak trial → 4 tema bulan 1 + judul bulan 2; (b) admin memperpanjang 2 bulan → penghitung naik 2, tema bulan 3 terbuka; (c) simpan checklist → muncul di `/anak/[id]/laporan` **dan** rapor bulan itu dengan label penilai; (d) sunting kalimat evaluasi → rapor lama **tidak berubah**; (e) game dari aktivitas → keluar kembali **ke aktivitas itu**; (f) aktivitas tanpa game → tak ada tombol, halaman normal.
6. **Uji kohort per anak**: kakak `bulan_kurikulum = 3`, bayi `= 1` → tema bulan ke-3 **terbuka untuk kakak, TERKUNCI untuk bayi**; ganti anak mengunci/membuka daftar; checklist kakak **tidak** muncul di rapor bayi.
7. **Uji keamanan** (REST sebagai ortu): PATCH `evaluasi_kurikulum` milik akun lain → gagal · DELETE baris sendiri → gagal · `kembali=https://luar.example` → ditolak.
8. **Verifikasi migrasi**: probe anon baca-saja seperti 0093–0097 (tabel & kolom ada, kolom kontrol tetap `42703`).
