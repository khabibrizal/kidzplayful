# Desain: Filter Transaksi per Event di Keuangan

Tanggal: 2026-07-24
Status: disetujui

## Tujuan
Admin dapat melihat laporan **transaksi pemasukan per event** di `/admin/keuangan/transaksi` lewat **dropdown filter Event** — untuk tahu total kas masuk dari sebuah event.

## Konteks
Transaksi pemasukan pendaftaran event tercatat di `transaksi_keuangan` dengan `kategori='event'`, `ref_tipe='pendaftaran'`, `ref_id`=id `pendaftaran_event`. Transaksi tidak menyimpan `event_id` langsung → filter per event = transaksi yang `ref_id`-nya milik pendaftaran event tersebut. Hanya pendaftaran **Diterima** yang masuk ledger (prinsip kas).

## Unit & perubahan (tanpa migrasi)

### 1. Reader `getLedger` (`src/lib/data/keuangan.ts`)
- Tambah opsi `eventId?: string` pada `getLedger(opts)`.
- Bila `eventId` diisi:
  - Query `pendaftaran_event` `select('id').eq('event_id', eventId)` → kumpulan `refIds`.
  - Bila `refIds` kosong → kembalikan `[]`.
  - Tambahkan ke query utama: `.eq('ref_tipe', 'pendaftaran').in('ref_id', refIds)`.
- Filter lain (from/to/arah/kategori/limit) tetap berlaku & dikombinasikan.

### 2. UI `src/app/admin/keuangan/transaksi/page.tsx`
- `searchParams` tambah `event?: string`.
- Ambil daftar event: `getEventSemua()` (`admin-event.ts`) untuk isi dropdown.
- Tambah `<select name="event">` di form filter: opsi pertama `"Semua event"` (value kosong), lalu tiap event `<option value={e.id}>{e.judul}{e.tanggal ? ` (${e.tanggal})` : ''}</option>`.
- Teruskan `eventId: sp.event || undefined` ke `getLedger`.
- Kartu ringkasan (Kas masuk/keluar/selisih) memakai `rows` yang sudah terfilter → saat event dipilih, "Kas masuk" = total pemasukan event itu.

### 3. Testing
- **Manual**: pilih event di dropdown → hanya transaksi pendaftaran event itu tampil; "Kas masuk" = pendapatan event; ganti event → berubah; "Semua event" → perilaku sekarang. Event tanpa transaksi diterima → daftar kosong (pesan "Tidak ada transaksi…").
- Gerbang: `npx tsc --noEmit` + `npm run build` hijau. (Tak ada unit baru — filter query + UI.)

## Batas (YAGNI)
- Filter per satu event (bukan multi). Hanya transaksi yang sudah di ledger (Diterima). Tanpa ekspor khusus per event (ekspor CSV yang ada mengikuti filter aktif bila memakai searchParams — di luar scope perubahan ini).
