# Roadmap Pengembangan KidzPlayful

**Dokumen rencana kerja fitur mendatang**
Disusun: 6 Juli 2026 · Status produk: **pra-launch** · Platform: Next.js 16 + Supabase (Vercel), www.kidzplayful.com

---

## 1. Ringkasan Eksekutif

KidzPlayful sudah memiliki fondasi produk yang lengkap: aplikasi kelas bermain & game edukasi anak usia 0–6 tahun, lengkap dengan langganan, 11 engine game, rapor perkembangan, e-sertifikat, event kelas bermain, toko, komunitas, dashboard admin, REST API mobile, dan paket SEO (landing + blog + Search Console).

Karena produk **belum diluncurkan resmi**, roadmap ini disusun bukan sebagai "kerjakan semua sekaligus", melainkan **berurutan berdasarkan prioritas**: dahulukan hal yang menghalangi peluncuran & membangun kepercayaan, lalu mesin monetisasi & operasi, kemudian pertumbuhan, dan terakhir retensi jangka panjang. Dengan urutan ini, keempat tujuan bisnis — **monetisasi, pertumbuhan, retensi, dan efisiensi operasional** — tetap tercapai secara bertahap.

**Prinsip:** setiap fitur besar akan melewati siklus perancangan (brainstorm → spesifikasi → rencana implementasi) tersendiri saat mulai dikerjakan. Dokumen ini adalah **peta prioritas**, bukan spesifikasi teknis.

**Keterangan Effort:** S = ≤1 hari · M = 2–4 hari · L = 1–2 minggu.

---

## 2. Kondisi Saat Ini

**Sudah tersedia:** Auth orang tua + profil anak · Langganan (trial/aktif, *aktivasi manual*) · 11 engine game + reward/koin · Rapor per anak + e-sertifikat · Event kelas bermain (pendaftaran, absensi, reschedule, stiker, catatan PAUD guru) · Toko (keranjang → checkout → pesanan, *bayar manual + bukti*) · Komunitas forum · Kelas bermain + video · Dashboard admin (analitik DAU/WAU/MAU, laporan, guru, reminder WA manual) · REST API untuk app Flutter · Konfigurasi pembayaran dinamis · SEO (landing, blog + pencarian, sitemap, Search Console).

**Belum tersedia (peluang roadmap):** pembayaran otomatis (payment gateway), email transaksional, push notification, PWA, program referral/promo, onboarding, ulasan/testimoni, halaman legal, kurikulum terstruktur, streak/badge, multi-bahasa, cron auto-expire langganan.

---

## 3. Roadmap per Fase

### 🔴 Fase 0 — Fondasi Sebelum Launch (prioritas tertinggi)
*Tujuan: bisa menerima uang otomatis, dipercaya orang tua, dan tidak menumpuk kerja manual sejak hari pertama.*

| # | Fitur | Tujuan | Effort |
|---|-------|--------|--------|
| 1 | **Halaman legal** (Kebijakan Privasi, S&K, Tentang Kami) | Kepercayaan + syarat Google Ads/Play Store | S |
| 2 | **Pembayaran otomatis (payment gateway)** — Midtrans/Xendit + webhook, auto-aktivasi langganan & pesanan | Monetisasi + efisiensi | L |
| 3 | **Email transaksional** — welcome, trial habis, pembayaran diterima, pengingat event | Retensi + operasi | M |
| 4 | **Auto-expire langganan + reminder trial (cron)** | Monetisasi (nudge bayar) + efisiensi | M |
| 5 | **Hapus akun & privasi data anak** | Kepatuhan data anak + syarat app store | S–M |
| 6 | **Onboarding orang tua baru** (tur singkat pasca-daftar) | Aktivasi + kesan pertama | S–M |

### 🟠 Fase 1 — Pertumbuhan / Akuisisi
*Tujuan: mendatangkan & meyakinkan orang tua baru setelah launch.*

| # | Fitur | Tujuan | Effort |
|---|-------|--------|--------|
| 7 | **Testimoni & ulasan** (landing + rating produk toko) | Social proof → konversi & SEO | M |
| 8 | **Referral / undang teman + kode promo/voucher** | Pertumbuhan + monetisasi | L |
| 9 | **Lanjutan SEO konten** (jadwal artikel, kategori/tag, internal link) | Akuisisi organik | S (berulang) |

### 🟡 Fase 2 — Retensi & Engagement
*Tujuan: membuat anak & orang tua aktif lebih lama, mengurangi churn.*

| # | Fitur | Tujuan | Effort |
|---|-------|--------|--------|
| 10 | **Streak harian + badge/lencana + tantangan harian** | Engagement | M–L |
| 11 | **Jalur belajar terstruktur (kurikulum per usia)** | Retensi + nilai produk | L |
| 12 | **PWA installable + push notification** | Retensi | M–L |

### ⚪ Fase 3 — Skala & Ekspansi
*Tujuan: mendukung pertumbuhan lokasi & platform (jangka panjang).*

| # | Fitur | Tujuan | Effort |
|---|-------|--------|--------|
| 13 | **Multi-lokasi / jadwal kelas offline** (hybrid) | Ekspansi cabang | L |
| 14 | **Kelengkapan app mobile Flutter** + push native | Jangkauan platform | L |
| 15 | **Analitik lanjutan** (cohort, funnel trial→bayar, churn) | Keputusan berbasis data | M |

---

## 4. Rekomendasi Langkah Pertama

Untuk tahap pra-launch, mulai dari **Fase 0** dengan urutan berikut:

1. **Halaman legal** — cepat dikerjakan, tetapi menjadi penghalang untuk beriklan & mendaftar app store.
2. **Pembayaran otomatis** — paling berdampak ke monetisasi & efisiensi; karena porsinya paling besar, sebaiknya dimulai lebih awal.
3. **Email transaksional** — fondasi yang akan dipakai oleh reminder trial (#4) dan notifikasi lain.

---

## 5. Catatan Pelaksanaan

- Dokumen ini adalah **peta prioritas**, bukan spesifikasi implementasi. Setiap fitur besar (payment gateway, referral, kurikulum, dll.) akan melewati perancangan tersendiri saat dipilih untuk dikerjakan.
- Migrasi database dijalankan manual di Supabase SQL Editor (sesuai kebiasaan proyek).
- Fitur baru mengikuti pola arsitektur yang ada: baca = Server Component, tulis = Server Action, keamanan = RLS + guard peran.
- Roadmap bersifat hidup — prioritas dapat disesuaikan seiring masukan pengguna nyata setelah peluncuran.

---

*KidzPlayful — main sambil belajar. Kelas bermain & game edukasi anak usia 0–6 tahun.*
