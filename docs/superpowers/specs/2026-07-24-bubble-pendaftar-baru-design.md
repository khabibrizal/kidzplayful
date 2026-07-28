# Desain: Bubble Notifikasi Pendaftar Baru di Card Event

Tanggal: 2026-07-24
Status: disetujui

## Tujuan
Admin langsung tahu di halaman `/admin/event` bila ada **pendaftar baru yang belum diproses** pada sebuah event, lewat **badge/bubble merah** di card event — tanpa harus membuka halaman Pendaftar satu per satu.

## Definisi "baru"
Pendaftaran berstatus **`menunggu`** (belum Diterima/Ditolak). Berbasis status yang sudah ada → tanpa migrasi/kolom/tabel baru; badge otomatis berkurang saat admin memproses (Terima/Tolak).

## Unit & perubahan

### 1. Reader `getJumlahMenunggu`
- File: `src/lib/data/admin-event.ts`.
- Fungsi baru:
  ```ts
  export async function getJumlahMenunggu(): Promise<Record<string, number>> {
    const s = await createClient();
    const { data } = await s.from('pendaftaran_event').select('event_id').eq('status', 'menunggu');
    const map: Record<string, number> = {};
    for (const r of data ?? []) map[r.event_id as string] = (map[r.event_id as string] ?? 0) + 1;
    return map;
  }
  ```
- Terpisah dari `getJumlahPendaftar` (tak mengubahnya).

### 2. Halaman `/admin/event` (`src/app/admin/event/page.tsx`)
- Ambil `menunggu` paralel dengan `events` & `counts`:
  ```ts
  const [events, counts, menunggu] = await Promise.all([getEventSemua(), getJumlahPendaftar(), getJumlahMenunggu()]);
  return <EventAdmin awal={events} counts={counts} menunggu={menunggu} />;
  ```

### 3. Bubble di card (`src/app/admin/event/EventAdmin.tsx`)
- Prop baru `menunggu?: Record<string, number>` (default `{}`).
- Di setiap card event, bila `menunggu[e.id] > 0`:
  - **Badge merah "🔴 N baru"** menempel di tombol **👥 Pendaftar** (mis. `<span>` merah dengan angka, di sebelah link Pendaftar).
  - **Titik merah kecil** di pojok kanan-atas card (posisi absolute) sebagai penanda cepat. Card wrapper diberi `position: relative` bila belum.
- Bila 0 / tak ada: tak ada badge/titik.
- Reaktif via data server: setelah admin Terima/Tolak di halaman Pendaftar lalu kembali/refresh `/admin/event`, hitungan `menunggu` ter-update (status berubah).

## Testing
- **Manual**: (a) buat pendaftaran baru pada suatu event (status `menunggu`) → `/admin/event` card event menampilkan "🔴 N baru" + titik merah pojok. (b) buka Pendaftar → Terima/Tolak salah satu → kembali ke `/admin/event` → hitungan berkurang; semua diproses → badge & titik hilang.
- Gerbang: `npx tsc --noEmit` + `npm run build` hijau. (Tak ada unit baru — reader query + UI.)

## Batas (YAGNI)
- Berbasis status `menunggu` (bukan last-seen per admin).
- Tanpa migrasi; hanya di card event admin `/admin/event`.
- Tanpa realtime push (ter-update saat halaman dimuat/refresh).
