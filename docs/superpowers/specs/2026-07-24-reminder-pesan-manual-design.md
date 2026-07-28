# Desain: Pesan WA Manual per Event di Reminder

Tanggal: 2026-07-24
Status: disetujui

## Tujuan
Di `/admin/reminder`, admin dapat menulis **pesan WA manual per event** (tiap event beda isi). Pesan WA yang dikirim ke tiap peserta = **sapaan + teks pengingat + detail pendaftaran (otomatis dari data) + pesan manual admin**.

## Susunan pesan WA final (per penerima)
```
Halo Kak {nama ortu} 👋

Terimakasih sudah mendaftar di event kami kak, jangan lupa untuk hadir ya

📅 *{judul event}*
🗓️ {tanggal}, pukul {jam_mulai}-{jam_selesai} WIB
📍 {lokasi}
🧒 Peserta: {nama anak, dipisah koma}
🏷️ Kelas: {Baby Class / Toddler Class}

{pesan manual admin}

— KidzPlayful
```
Aturan baris:
- **Sapaan** `Halo Kak {nama}` (nama ortu; bila kosong → `Halo Kak 👋`).
- **Teks pengingat** (tetap): `Terimakasih sudah mendaftar di event kami kak, jangan lupa untuk hadir ya`.
- **📅 judul** selalu ada.
- **🗓️ tanggal** bila ada; sisipkan `, pukul {jam_mulai}[-{jam_selesai}] WIB` bila `jam_mulai` ada.
- **📍 lokasi** hanya bila ada.
- **🧒 Peserta** dari `anak_nama` (join koma) bila tidak kosong.
- **🏷️ Kelas** hanya bila `kelas` ∈ {`baby`,`toddler`} → "Baby Class"/"Toddler Class"; `gabungan`/null → baris dilewati.
- **Pesan manual admin** (dari `event.pesan_reminder`) setelah detail; bila kosong → baris dilewati.
- Tanda tangan `— KidzPlayful`.

## Unit & perubahan

### 1. Data
- **Migrasi `0085_event_pesan_reminder.sql`**: `alter table public.event add column if not exists pesan_reminder text;`
- `src/lib/data/admin-reminder.ts`:
  - `ReminderRow.event` + `pesan_reminder: string | null`; `ReminderRow` + `kelas: string | null`.
  - `getReminderPendaftaran` select: tambah `pesan_reminder` pada `event:event_id(...)` dan `kelas` pada baris pendaftaran.

### 2. Server action
- `src/lib/data/admin-reminder-actions.ts`: `simpanPesanReminder(eventId: string, pesan: string): Promise<{ok:boolean;error?:string}>` — `adminDb()` cek is_admin → `update event set pesan_reminder = pesan.trim() || null where id=eventId` → `revalidatePath('/admin/reminder')`.

### 3. Util murni + test
- `src/lib/domain/reminder.ts` `susunPesanReminder(in)`:
  - `in: { nama: string | null; judul: string; tanggal: string | null; jamMulai: string | null; jamSelesai: string | null; lokasi: string | null; anakNama: string[]; kelas: string | null; pesanManual: string | null; tanggalFmt?: string }`
  - Susun sesuai susunan di atas; kembalikan string. (Format tanggal diteruskan sudah jadi lewat `tanggalFmt`, atau pakai `tanggal` apa adanya bila tak ada — agar util murni tanpa dependency `formatTanggal`.)
  - **Teruji vitest**: mengandung nama ortu, teks pengingat, judul, nama anak, pesan manual; baris Kelas muncul untuk baby/toddler & tidak untuk gabungan/null; jam/lokasi opsional; manual kosong → tanpa baris manual.

### 4. UI `/admin/reminder` (`ReminderAdmin.tsx`)
- Prop data sudah membawa `pesan_reminder` & `kelas` per baris.
- Ganti fungsi lokal `pesanReminder(...)` agar memanggil `susunPesanReminder` (format tanggal via `formatTanggal` di komponen, diteruskan sebagai `tanggalFmt`).
- Per grup event: tambah **textarea "✍️ Pesan reminder (opsional)"** terisi dari `event.pesan_reminder` (state per event) + tombol **Simpan** → `simpanPesanReminder(eventId, teks)` (toast ok/gagal). Placeholder mencontohkan; catatan kecil "detail event & nama anak otomatis ditambahkan".
- Tombol **Kirim WA** memakai pesan hasil `susunPesanReminder` (manual diambil dari state textarea yang tersimpan / nilai awal `event.pesan_reminder`).

### 5. Testing
- **Unit (vitest)** `src/lib/domain/__tests__/reminder.test.ts` (kasus di atas).
- **Manual**: `/admin/reminder` → isi pesan manual event A → Simpan → Kirim WA salah satu peserta → WhatsApp berisi: sapaan nama ortu, teks pengingat, judul/tanggal/jam/lokasi, nama anak, kelas (bila baby/toddler), lalu pesan manual. Event tanpa pesan manual → pesan tetap valid tanpa baris manual.
- Gerbang: `npx tsc --noEmit` + `npm test` + `npm run build` hijau.

## Langkah manual pasca-implementasi
- Jalankan `0085_event_pesan_reminder.sql` di Supabase SQL Editor.

## Batas (YAGNI)
- Satu pesan manual per event (bukan per peserta). Tanpa kirim WA massal otomatis (tetap manual per peserta seperti sekarang). Teks pengingat tetap (bukan input).
