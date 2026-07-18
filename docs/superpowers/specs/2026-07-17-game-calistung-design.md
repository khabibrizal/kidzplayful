# Desain: 3 Mesin Game Calistung — Suku Kata, Jiplak, Hitung Benda

Tanggal: 2026-07-17 · Status: disetujui owner (hasil brainstorming)

## Latar belakang
Owner (perspektif psikolog anak) ingin game pembelajaran **calistung** (baca-tulis-hitung) untuk sasaran **pra-calistung + awal (3–6 th)**. Mesin yang ada baru menutup sebagian: Eja Kata (mengeja), Hitung-Kode (aritmetika simbol), Urutan (pola), Garis/Mewarnai (motorik halus). Gap yang ditutup desain ini:
- **Baca**: kesadaran fonologis & metode suku kata (standar untuk bahasa Indonesia).
- **Tulis**: menjiplak (tracing) huruf/angka — belum ada sama sekali.
- **Hitung**: number sense konkret (one-to-one correspondence) sebelum aritmetika simbolik.

Keputusan suara: **TTS dulu** (`speak()` `lib/tts.ts`), tiap soal punya `audio_url?` opsional agar kelak bisa diganti rekaman tanpa ubah engine.

## Prinsip arsitektur
Tanpa migrasi DB (`paket_aset.butir` jsonb, `mesin` teks). Tiap mesin mengikuti pola 5-titik yang dipakai 11 mesin lain:
`tipe.ts` (union `Mesin` + `Data*`) → engine `components/game/*.tsx` (`{data,onSelesai}` → `onSelesai({benar,total,durasiDetik})`, sehingga skor/koin/streak/lencana otomatis via `catatHasil`) → `GameRunner.tsx` → `PaketForm.tsx` (+mapping `AREA`) → `butir.ts` (`butirDariForm` + `validasiButir`) + unit test vitest.

## Mesin 1: `sukukata` — Rangkai Suku Kata (Baca) → area `kognitif`
- **Mode `susun`** (utama): gambar (`Aset.tsx`) + 🔊 kata utuh; slot suku kata kosong + kartu teracak (suku kata benar + pengecoh). Tap kartu berurutan → TTS ucapkan suku kata; selesai → TTS baca kata utuh + "Hebat!"; salah → `kp-shake` + "Coba lagi ya" (pola `EjaKataGame`).
- **Mode `dengar`** (fonik): TTS ucapkan 1 suku kata → tap kartu benar dari 3–4 pilihan.
- **Data**: `SukuKataSoal { kata; sukuKata: string[]; pengecoh: string[]; gambar?; audio_url?; mode: 'susun'|'dengar' }`; `DataSukuKata { soal: SukuKataSoal[] }`.
- **Validasi**: `sukuKata.join('') === kata` (tanpa spasi/strip); `dengar` ≥1 pengecoh; `susun` ≥2 suku kata.
- **Form admin**: input kata + suku kata dipisah strip (`bu-ku` → auto-split), pengecoh, `AsetInput` gambar, pilih mode per soal.

## Mesin 2: `jiplak` — Jiplak Huruf & Angka (Tulis) → area `motorik-halus`
- Outline karakter putus-putus + titik mulai hijau + panah arah goresan. Anak menyeret jari mengikuti jalur; jejak menebal progresif. Deteksi radius toleransi longgar dari path; keluar jalur → jejak berhenti tanpa hukuman, lanjut dari titik terakhir. Goresan berurutan; semua selesai → karakter menyala + TTS sebut karakternya. Pointer events pola `GarisGame`/`MewarnaiGame`.
- **`lib/game/jiplak-path.ts`**: konstanta `JALUR_KARAKTER` — polyline per goresan untuk `A–Z a–z 0–9` (viewBox 100×140, urutan goresan sesuai kaidah menulis). Admin tidak menggambar path — cukup mengetik daftar karakter.
- **Data**: `JiplakSoal { karakter; audio_url? }`; `DataJiplak { soal: JiplakSoal[] }`.
- **Validasi**: tiap `karakter` ada di `JALUR_KARAKTER`. **Form admin**: satu input teks (`ABC123` → 6 soal) + preview.
- **Skor**: `benar` = karakter selesai dengan keluar-jalur ≤ N kali (rapi = 3 bintang, sejalan `hitungBintang`).

## Mesin 3: `hitung-benda` — Hitung Benda (Hitung) → area `kognitif`
- **Mode `hitung`** (utama): N benda (emoji/aset) posisi acak-rapi; tap satu per satu → benda membesar + badge angka + TTS hitungan ("satu… dua…"); semua tertandai → pilih angka dari 3–4 opsi.
- **Mode `banyak-mana`**: dua kelompok berdampingan; TTS "mana yang lebih banyak?" → tap kelompok benar.
- **Data**: `HitungBendaSoal { benda; jumlah; benda2?; jumlah2?; mode: 'hitung'|'banyak-mana'; audio_url? }`; `DataHitungBenda { soal: HitungBendaSoal[] }`.
- **Validasi**: `jumlah` (dan `jumlah2`) 1–10; `banyak-mana` wajib `benda2`+`jumlah2` dan `jumlah ≠ jumlah2`.
- **Form admin**: `AsetInput` benda, angka jumlah, pilih mode.

## Suara
Helper `bunyikan(teks, audioUrl?)`: putar `Audio(audio_url)` bila ada, else `speak(teks)`. Semua engine memakai helper ini.

## Pengujian & verifikasi
1. Unit test `validasiButir` 3 mesin (pola test operasi × ÷) di `src/lib/game/__tests__/butir.test.ts`.
2. Gerbang: `tsc --noEmit` + `npm test` + `npm run build` + CI GitHub Actions.
3. Manual: admin buat tema "Calistung" + 3 paket (usia 3–6) → mainkan di `/main/[anakId]` → Reward muncul, koin/bintang/streak tercatat di rapor.
4. `GET /api/pustaka` memuat paket mesin baru tanpa perubahan kontrak.

## Non-tujuan
- Rekaman audio (struktur siap via `audio_url`, konten menyusul).
- Pengenalan tulisan bebas (handwriting recognition) — jiplak cukup tracing berpanduan.
- Level membaca lanjut (kalimat/dikte) — menyusul setelah 3 mesin ini dipakai.
