# KidzPlayful — Dokumen Desain (Spec)

- **Tanggal:** 2026-06-10
- **Status:** Disetujui untuk masuk tahap perencanaan implementasi
- **Pemilik produk:** Owner kelas bermain "kidzplayful"
- **Jenis:** Web app berlangganan untuk edukasi anak 0-4 tahun

---

## 1. Latar Belakang & Tujuan

Owner menjalankan kelas bermain **kidzplayful** untuk anak usia 1-4 tahun (tema berganti tiap
minggu, melatih sensorik, motorik, dan kemandirian). Kelas tersebut kini berhenti. Owner juga
menjual bahan mainan sensorik dan worksheet digital anak.

Tujuan produk ini: **memindahkan nilai kelas bermain ke produk digital berlangganan**, sebagai
sumber pemasukan berulang pengganti kelas, sambil tetap setia pada nilai brand (bermain melatih
sensorik-motorik) — yaitu **screen time yang terkontrol dan bermakna**, bukan layar tanpa batas.

### Paradoks yang disadari & cara mengatasinya
Brand dibangun di atas bermain fisik/hands-on, sedangkan ini produk layar untuk balita. Pedoman
WHO/IDAI menyarankan **0 screen time untuk di bawah 2 tahun** dan terbatas untuk 2-4 tahun.
Diatasi dengan **segmentasi umur**:
- **0-2 tahun → Mode Orang Tua:** layar di tangan ortu (panduan aktivitas fisik + worksheet).
- **2 tahun ke atas → Mode Anak:** game di layar dengan skor, dengan batas waktu ketat.

Satu aplikasi yang **tumbuh bersama anak** (dipakai dari bayi sampai balita) → bagus untuk retensi.

---

## 2. Keputusan Kunci (yang sudah disepakati)

| Topik | Keputusan |
|---|---|
| Pemegang layar | Segmentasi umur: 0-2 = ortu, 2+ = anak |
| Hubungan dengan kelas lama | **Campuran**: ada jalur tema mingguan + akses bebas semua konten |
| Skor | **Dua wajah**: bintang/koin untuk anak (semangat, tanpa menang-kalah) + data perkembangan untuk ortu |
| Platform | **Web app** (browser HP/tablet/laptop), bukan app native dulu |
| Monetisasi | **Langganan bulanan** + **free trial 14 hari** |
| Cara membangun | **Opsi B**: web app penuh, tapi **aktivasi langganan manual** dulu (gateway otomatis menyusul) |
| Strategi game | **Opsi 1**: beberapa "mesin game" yang diganti-tema tiap minggu (bukan game unik dari nol) |
| Fitur tambahan | **Pojok Video**: video YouTube terkurasi & terkunci di dalam app |
| Bahasa produk & dokumen | Bahasa Indonesia |
| Nama kerja | KidzPlayful |

---

## 3. Lingkup Bertahap

Semua fitur adalah bagian dari visi penuh, tetapi dibangun bertahap agar bisa meluncur cepat dan
produksi konten tidak macet ("treadmill konten").

- **Tahap 1 (peluncuran):** Mode Anak (game + skor), Pojok Video, jalur tema mingguan + pustaka,
  langganan/trial dengan aktivasi manual, Dashboard Admin, **perekaman data skor** (untuk laporan nanti).
- **Tahap 2:** Mode Orang Tua 0-2 (panduan aktivitas + worksheet bertema).
- **Tahap 3:** Laporan Perkembangan ortu (grafik per area skill, memakai data yang sudah direkam sejak Tahap 1).
- **Tahap berikutnya:** Pembayaran otomatis (Midtrans/Xendit), lalu app HP native, lalu video milik sendiri.

### Yang sengaja TIDAK dibangun (YAGNI)
- Pembayaran otomatis (manual dulu).
- App HP native (web app dulu).
- Fitur sosial / leaderboard antar anak (tidak sehat untuk balita).
- Pencarian video bebas (hanya video terkurasi).

---

## 4. Arsitektur

```
Pengguna (browser HP/tablet/laptop)
        │
   Web App  (Next.js)
   ├─ Halaman publik: beranda, daftar, login
   ├─ Mode Anak: pemutar game (game engine) + Pojok Video
   ├─ Mode Ortu: panduan, worksheet, laporan        (Tahap 2 & 3)
   └─ Dashboard Admin (khusus owner): aktivasi langganan, kelola tema/konten/video
        │
   Supabase  (satu layanan untuk semua data)
   ├─ Auth (login ortu)
   ├─ Database: akun, profil anak, langganan, tema, aset, hasil main/skor
   └─ Storage: gambar game, audio, file worksheet (PDF)
```

- Stack: **Next.js** (frontend + admin) + **Supabase** (auth, database, storage).
- Satu akun **orang tua** dapat memiliki **beberapa profil anak** (progres terpisah per anak).
- Login & semua data dimiliki orang tua; **anak tidak pernah memasukkan data apa pun**.

---

## 5. Mesin Game & Sistem Skor (inti produk)

### 5.1 Prinsip desain game untuk balita (2-4 thn)
- Instruksi lewat **suara + gambar**, bukan teks (anak belum bisa baca).
- **Target besar**, mudah ditekan jari kecil.
- **Tidak ada "kalah"/game over.** Salah = isyarat lembut lalu ulang. Tanpa timer menekan.
- **Sesi pendek** (1-3 menit per game), sesuai rentang fokus balita.

### 5.2 Mesin game (dibuat sekali, dipakai selamanya dengan ganti tema)

| Mesin | Cara main | Melatih | Tahap |
|---|---|---|---|
| 1. Cocokkan | Pasangkan gambar ke pasangannya | Visual, kognitif, fokus | 1 |
| 2. Seret ke Wadah | Seret benda ke keranjang yang benar | Motorik halus + klasifikasi | 1 |
| 3. Tekan yang Sesuai | Suara menyebut sesuatu, anak tekan gambar yang cocok | Menyimak + motorik + pengenalan | 1 |
| 4. Telusuri | Telusuri garis/bentuk dengan jari | Motorik halus pra-menulis | 2 |

### 5.3 Mekanisme "ganti tema" (kunci treadmill mingguan)
Tiap mesin **membaca data, bukan kode**. Owner mengganti **paket aset** (gambar + suara +
jawaban benar) per tema lewat Dashboard Admin, tanpa menyentuh kode. Contoh paket tema "Hewan"
untuk mesin "Tekan yang Sesuai":

```json
{
  "tema": "Hewan",
  "mesin": "tekan-sesuai",
  "butir": [
    { "suara": "mana kucing?", "gambar_benar": "kucing.png",
      "pengecoh": ["anjing.png", "sapi.png"] }
  ]
}
```

### 5.4 Sistem skor — dua wajah
**Wajah anak:** selesai aktivitas → animasi + **bintang 1-3** + bunyi ceria; kumpulan bintang →
**koin/stiker** untuk "kebun stiker". Murni semangat & mau mengulang; tanpa peringkat/menang-kalah.

**Wajah orang tua (data di belakang layar, direkam sejak Tahap 1):**
```json
{ "anak_id": "...", "tanggal": "...", "mesin": "...",
  "area_skill": "motorik-halus", "jumlah_coba": 2, "selesai": true, "durasi": 95 }
```
`area_skill` (sensorik / motorik halus / kognitif / kemandirian) ditempel ke tiap mesin.
Data direkam dari awal, ditampilkan sebagai grafik di **Laporan Perkembangan (Tahap 3)**.

### 5.5 Gerbang Orang Tua & batas waktu
- **PIN orang tua** untuk keluar Mode Anak, mengatur batas, membuka Pojok Video.
- **Batas screen time** (mis. 15/20/30 menit) → habis waktu, layar lembut mengajak berhenti
  ("waktunya istirahat, sampai jumpa besok!"). Hanya bisa dilanjut dengan PIN ortu.

---

## 6. Pojok Video (Mode Anak)

Tujuan: anak bosan main bisa menonton video sebentar **tanpa keluar ke aplikasi YouTube**.

Aturan (wajib, demi keamanan screen time):
- **Bukan pencarian, bukan rekomendasi** — anak tidak bisa mencari video sendiri.
- Daftar video **dikurasi owner**, ditempel ke tema mingguan, diatur dari Dashboard Admin.
- Diputar dalam **pemutar terkunci** di dalam app: mode privasi `youtube-nocookie`, rekomendasi
  disembunyikan semaksimal mungkin, tanpa tombol keluar ke YouTube.
- **Batas jumlah/waktu** (mis. maksimal 2 video lalu kembali ke menu).
- Di bawah kendali **Gerbang Orang Tua (PIN)**.
- Catatan: embed YouTube tidak pernah 100% bebas elemen YouTube; alternatif jangka panjang =
  unggah video pendek milik sendiri. Untuk MVP cukup embed terkurasi + terkunci. **Masuk Tahap 1.**

---

## 7. Tema Mingguan, Akses Bebas & Pustaka

- **Tema Minggu Ini** tampil paling depan ("Minggu Hewan 🐰"): game bertema + Pojok Video bertema +
  (Tahap 2) panduan ortu & worksheet bertema. Ini "kelas minggu ini".
- **Pustaka:** semua tema lama tersimpan & **bisa diakses bebas** kapan saja.
- Satu tema = satu paket di Admin: nama, sampul, aset per mesin game, daftar video, (nanti)
  worksheet & panduan. Owner **menjadwalkan** tema mana yang tayang sebagai "Minggu Ini".

---

## 8. Alur Pengguna

### 8.1 Orang Tua (pemilik akun)
```
Daftar (email + buat profil anak: nama, umur)
  → Trial 14 hari otomatis aktif
  → Pilih anak → masuk Mode Anak (PIN melindungi keluar)
  → Trial mau habis: app ingatkan "lanjut langganan?"
      → transfer/QRIS → owner aktifkan di Admin → akun aktif
  → Kelola: profil anak, batas screen time, PIN
```
Umur anak menentukan mode default: 0-2 → Mode Ortu (Tahap 2); 2+ → Mode Anak. Bisa diganti manual.

### 8.2 Anak (Mode Anak — sesederhana mungkin)
```
Layar besar bergambar → "Minggu Ini" + "Pustaka" + "Pojok Video"
  → tekan satu kegiatan → mesin game jalan (instruksi suara)
  → selesai → bintang & koin → kembali ke menu
  → batas waktu habis → layar "istirahat dulu ya" (perlu PIN ortu untuk lanjut)
```
Navigasi anak: **ikon besar, suara, tanpa teks, tanpa menu rumit.** Tanpa tautan keluar, tanpa
iklan, tanpa pembelian di dalam Mode Anak.

### 8.3 Owner (Dashboard Admin)
```
- Kelola Tema: buat tema, unggah aset per mesin, pilih jawaban benar, atur video
- Jadwalkan "Minggu Ini"
- Kelola Langganan: lihat status trial/aktif/kadaluarsa, aktifkan manual setelah bayar
- (Tahap 3) Lihat ringkasan penggunaan
```

---

## 9. Penanganan Error

- **Mode Anak tidak pernah menampilkan error teknis.** Gambar/video gagal atau internet putus →
  layar ramah ("Yah, gambarnya lagi tidur 😴 — coba lagi ya"), tombol besar. Game gagal di-skip
  ke menu, tidak ngehang.
- **Video mati/dihapus dari YouTube:** Pojok Video diam-diam melewati; owner diberi tanda link rusak di Admin.
- **Pembayaran manual:** setelah trial habis, akun **tidak langsung dikunci keras** — ada masa
  tenggang singkat + instruksi jelas ("sudah transfer? akun aktif < 1×24 jam") agar ortu tidak kesal.
- **Batas screen time habis:** bukan error — layar lembut "istirahat dulu", dilanjut hanya dengan PIN ortu.

---

## 10. Privasi Data Anak

- **Kumpulkan seminimal mungkin:** cukup nama panggilan + umur/tanggal lahir anak. Tidak meminta
  data sensitif (alamat, foto wajah, dll.) yang tidak perlu.
- **Akun & login milik orang tua.** Anak tidak memasukkan data apa pun.
- **Tanpa iklan, tanpa pelacak pihak ketiga** di area anak. Video pakai `youtube-nocookie`.
- **Halaman Kebijakan Privasi sederhana** sejak awal: apa yang dikumpulkan, untuk apa, cara hapus akun.
- Data progres anak hanya bisa dilihat oleh ortu pemilik akun & owner (admin).

---

## 11. Rencana Pengujian

- **Uji otomatis:** alur kritis — daftar→trial aktif, login, satu putaran tiap mesin game mencatat
  skor benar, batas waktu memicu layar istirahat, PIN melindungi keluar, admin bisa aktifkan langganan.
- **Uji "konten kosong":** tema tanpa aset / video rusak tidak bikin app crash.
- **Uji perangkat nyata:** dicoba di **HP & tablet** (sentuh, ukuran jari), bukan cuma laptop.
- **Uji pengguna nyata (paling penting):** dudukkan **2-3 anak betulan** di depan game sebelum
  luncur, untuk memastikan game benar-benar jalan untuk balita.

---

## 12. Pertanyaan Terbuka (untuk tahap perencanaan)

- Harga langganan bulanan & detail mekanik trial (kartu/tanpa kartu).
- Metode transfer/QRIS apa saja yang diterima saat aktivasi manual.
- Jumlah tema & aset awal yang siap saat peluncuran (minimal berapa minggu konten cadangan).
- Detail desain visual / brand kit (warna, maskot, font).
