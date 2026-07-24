# Desain: Bagikan ke Story (kartu gambar)

Tanggal: 2026-07-24
Status: disetujui (Pendekatan A — canvas klien)

## Tujuan
User dapat membagikan konten (artikel/kelas/game) sebagai **kartu gambar ukuran Story (1080×1920)** ke Instagram Story (atau sosmed lain), karena IG Story tidak menerima link biasa. Kartu berisi gambar konten + judul + ajakan + teks URL teaser; user menambahkan link sticker sendiri.

## Batasan platform
- IG Story berbasis gambar/video; tak ada API web untuk push link langsung ke Story. Solusi: bagikan **file gambar** via `navigator.share({files})` (HP → user pilih Instagram) atau **unduh** (desktop).
- Membuka image ke canvas butuh CORS bersih; bila gagal → kartu dibuat tanpa gambar (fallback).

## Unit & perubahan

### 1. Util kartu — `src/lib/story-card.ts` (client)
- **`bungkusTeks(teks: string, maksChar: number): string[]`** — helper murni pemecah teks jadi baris berdasarkan batas karakter per baris (pecah per kata; kata > maksChar tetap satu baris). **Teruji vitest.**
- **`buatKartuStory(opts): Promise<Blob>`** dengan `opts: { judul: string; jenisLabel: string; ajakan: string; gambar?: string; urlTeks: string }`:
  - Buat `<canvas>` 1080×1920.
  - Gambar latar gradient brand (lavender→biru), wordmark "🎈 KidzPlayful" atas.
  - Bila `gambar` ada: muat `new Image()` dgn `crossOrigin='anonymous'`; gambar ke area membulat (cover). Bila `onerror`/taint → lewati (kartu tanpa gambar). Kelas tanpa `gambar` → blok brand + emoji.
  - Tulis `judul` (auto-wrap via `bungkusTeks`), `jenisLabel`, `ajakan` (CTA), dan `urlTeks` di bawah.
  - Return `await new Promise((res)=>canvas.toBlob((b)=>res(b!), 'image/png'))`.
- Tidak menguji canvas (hanya `bungkusTeks`).

### 2. ShareButton — opsi "📸 Bagikan ke Story"
File: `src/components/ShareButton.tsx`.
- Prop baru opsional **`gambar?: string`** (URL gambar konten untuk kartu).
- Tambah item menu **"📸 Bagikan ke Story"** (paling atas di popover fallback) dan/atau selalu tampil.
- Handler `bagikanStory()`:
  - `const blob = await buatKartuStory({ judul: title, jenisLabel: LABEL_JENIS[jenis], ajakan: 'Coba Gratis di KidzPlayful ✨', gambar, urlTeks: absolut().replace(/^https?:\/\//,'') })`.
  - `const file = new File([blob], 'kidzplayful-story.png', { type: 'image/png' })`.
  - `const teks = `${text ?? title}\n${urlShare('story')}`` (URL ber-UTM `utm_medium=story`).
  - Bila `navigator.canShare?.({ files: [file] })` → `await navigator.share({ files: [file], title, text: teks })`.
  - Else → unduh: buat `URL.createObjectURL(blob)` → `<a download='kidzplayful-story.png'>` klik → revoke; toast "Gambar Story diunduh — posting ke IG Story lalu tambahkan link sticker".
  - Bungkus try/catch; batal/gagal → toast ramah, tutup popover.
- `LABEL_JENIS` lokal kecil di ShareButton: `{ artikel:'Artikel', kelas:'Kelas Bermain', game:'Game' }` (untuk jenisLabel kartu).

### 3. Call sites — kirim `gambar`
- `src/app/artikel/[slug]/page.tsx`: `<ShareButton ... gambar={a.sampul_url ?? undefined} />`.
- `src/app/main/[anakId]/MenuAnak.tsx` (tema): `gambar={temaTerpilih.tema.sampul ?? undefined}`.
- `src/components/KelasIsi.tsx` (kelas): tak ada gambar → tidak kirim `gambar` (kartu brand). (ShareButton kelas tetap dapat opsi Story.)

### 4. Atribusi
- `utm_medium=story` dipakai untuk link yang disertakan di teks share Story (via `denganUtm(url,{medium:'story',jenis})`).
- Dashboard: tambah label `story: 'Instagram Story'` ke `LABEL_SALURAN` di `src/lib/data/atribusi.ts` agar tampil ramah.

### 5. Testing
- **Unit (vitest)** `src/lib/__tests__/story-card.test.ts`: `bungkusTeks` — kalimat pendek → 1 baris; kalimat panjang → pecah sesuai batas; kata sangat panjang → tetap satu baris utuh; string kosong/whitespace → `[]`.
- **Manual**: HP → Bagikan → "Bagikan ke Story" → share sheet muncul membawa gambar → pilih IG → posting Story. Desktop → PNG terunduh. Cek `/admin/analitik` medium "Instagram Story" bertambah setelah ada pendaftar dari link story.
- Gerbang: `npx tsc --noEmit` + `npm test` + `npm run build` hijau.

## Batas (YAGNI)
- Tanpa QR code; kelas tanpa gambar konten (kartu brand); tanpa generasi server; CORS gagal → kartu tanpa gambar.

## Catatan
- Tidak ada migrasi DB (medium `story` masuk ke kolom `ref_saluran` yang sudah ada dari 0082).
- `Date.now()`/canvas dipakai di util client biasa → aman.
