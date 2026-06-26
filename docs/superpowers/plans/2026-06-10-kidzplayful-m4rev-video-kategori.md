# KidzPlayful — Revisi M4: Video per Kategori (baby/toddler) — Implementation Plan

> Pola subagent-driven. Langkah pakai checkbox `- [ ]`.

**Goal:** Ubah model video dari "per tema" menjadi **per kategori usia (baby/toddler), lepas dari tema**. Admin mengelola video di halaman khusus **/admin/video** (input URL + pilih kategori). Di app, **Pojok Video** menampilkan video sesuai kategori anak (umur <2 = baby, ≥2 = toddler).

**Architecture:** Lanjutan M4. Tabel `video` dapat kolom `kategori`, `tema_id` jadi nullable. Data baca baru `getVideoByKategori`. Form admin video dipindah dari Kelola-Tema ke `/admin/video`. Mode Anak menghitung kategori dari usia anak lalu memuat video kategori itu.

**Prasyarat:** M1–M4 selesai. Acuan: §6 (Pojok Video), keputusan revisi video per kategori.

---

## Task 1: Migrasi kategori video

**Files:** Create `supabase/migrations/0005_video_kategori.sql`

- [ ] **Step 1: Tulis migrasi**

```sql
-- supabase/migrations/0005_video_kategori.sql
alter table public.video add column if not exists kategori text not null default 'toddler'
  check (kategori in ('baby','toddler'));
alter table public.video alter column tema_id drop not null;
-- video seed lama (Hewan) anggap toddler
update public.video set kategori = 'toddler' where kategori is null;
```

- [ ] **Step 2: Terapkan** (Dashboard SQL Editor / `supabase db push`).
Expected: kolom `kategori` ada; `tema_id` nullable.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(db): video.kategori baby/toddler + tema_id nullable"`

---

## Task 2: Domain kategoriUsia + tipe Video

**Files:** Modify `src/lib/domain/usia.ts`, `src/lib/domain/__tests__/usia.test.ts`, `src/lib/game/tipe.ts`

- [ ] **Step 1: Tambah test (di akhir usia.test.ts)**

```ts
import { kategoriUsia } from '../usia';
describe('kategoriUsia', () => {
  it('umur < 2 -> baby', () => expect(kategoriUsia(1)).toBe('baby'));
  it('umur >= 2 -> toddler', () => expect(kategoriUsia(2)).toBe('toddler'));
});
```
(Pastikan import digabung dengan import `cocokUsia` yang sudah ada bila perlu.)

- [ ] **Step 2: Jalankan → gagal** `npx vitest run src/lib/domain/__tests__/usia.test.ts`

- [ ] **Step 3: Implementasi (tambah di `src/lib/domain/usia.ts`)**

```ts
export type KategoriUsia = 'baby' | 'toddler';
export function kategoriUsia(umur: number): KategoriUsia {
  return umur < 2 ? 'baby' : 'toddler';
}
```

- [ ] **Step 4: Tipe Video — tambah `kategori` di `src/lib/game/tipe.ts`** (ubah interface `Video`):

```ts
export interface Video {
  id: string;
  judul: string;
  youtube_id: string;
  durasi_detik: number;
  kategori: 'baby' | 'toddler';
}
```

- [ ] **Step 5: Jalankan → lulus** `npx vitest run src/lib/domain/__tests__/usia.test.ts` lalu `npx tsc --noEmit`.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat(domain): kategoriUsia + Video.kategori"`

---

## Task 3: Data getVideoByKategori + anak.tanggal_lahir

**Files:** Create `src/lib/data/video.ts`; Modify `src/lib/data/anak.ts`

- [ ] **Step 1: getVideoByKategori**

```ts
// src/lib/data/video.ts
import { createClient } from '@/lib/supabase/server';
import type { Video } from '@/lib/game/tipe';

export async function getVideoByKategori(kategori: 'baby' | 'toddler'): Promise<Video[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('video')
    .select('id,judul,youtube_id,durasi_detik,kategori')
    .eq('kategori', kategori).eq('status', 'disetujui').eq('link_ok', true)
    .order('urutan');
  return (data ?? []) as unknown as Video[];
}
```

- [ ] **Step 2: getAnakTerjamin tambah `tanggal_lahir`** — di `src/lib/data/anak.ts`, ubah select & biarkan return menyertakannya:

Ubah baris select:
```ts
    .from('anak').select('id,nama,mode_default,batas_menit,koin,tanggal_lahir').eq('id', anakId).single();
```

- [ ] **Step 3: Verifikasi** `npx tsc --noEmit`.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat(data): getVideoByKategori + anak.tanggal_lahir"`

---

## Task 4: Server actions video (revisi)

**Files:** Modify `src/lib/data/admin-konten.ts`

- [ ] **Step 1: Ganti `buatVideo` & `hapusVideo`** menjadi (berbasis kategori, tanpa temaId):

```ts
export async function buatVideo(input: { judul: string; youtubeId: string; kategori: 'baby' | 'toddler'; durasiDetik: number }) {
  const supabase = await db();
  const yid = await ekstrakYoutubeId(input.youtubeId);
  if (!yid) throw new Error('Link/ID YouTube tidak valid.');
  const { error } = await supabase.from('video').insert({
    tema_id: null, judul: input.judul.trim() || 'Video', youtube_id: yid,
    kategori: input.kategori, durasi_detik: input.durasiDetik || 0, status: 'disetujui', link_ok: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/video');
}

export async function hapusVideo(id: string) {
  const supabase = await db();
  const { error } = await supabase.from('video').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/video');
}
```

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit` (akan ada error di pemakai lama `hapusVideo(id, temaId)` & `<VideoForm>` di kelola-tema; diperbaiki di Task 5/6).

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(admin): video actions per kategori (revisi)"`

---

## Task 5: Halaman /admin/video + VideoForm kategori; lepas dari Kelola-Tema

**Files:** Create `src/app/admin/video/page.tsx`, `src/app/admin/video/VideoForm.tsx`; Modify `src/app/admin/tema/[id]/page.tsx` (buang bagian video); Delete `src/app/admin/tema/[id]/VideoForm.tsx`; Modify `src/app/admin/page.tsx` (tambah nav)

- [ ] **Step 1: VideoForm (kategori)**

```tsx
// src/app/admin/video/VideoForm.tsx
'use client';
import { useState } from 'react';
import { buatVideo } from '@/lib/data/admin-konten';
import s from '../admin.module.css';

export default function VideoForm() {
  const [judul, setJudul] = useState('');
  const [link, setLink] = useState('');
  const [menit, setMenit] = useState('2');
  const [kategori, setKategori] = useState<'baby' | 'toddler'>('toddler');
  const [err, setErr] = useState('');

  async function simpan() {
    setErr('');
    try {
      await buatVideo({ judul, youtubeId: link, kategori, durasiDetik: (Number(menit) || 0) * 60 });
      location.reload();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal'); }
  }

  return (
    <div className={s.card}>
      <div className={s.row}>
        <input className={s.inp} placeholder="Judul video" value={judul} onChange={(e) => setJudul(e.target.value)} style={{ flex: 1 }} />
        <select className={s.inp} value={kategori} onChange={(e) => setKategori(e.target.value as 'baby' | 'toddler')}>
          <option value="baby">Baby (0-2)</option>
          <option value="toddler">Toddler (2+)</option>
        </select>
        <input className={s.inp} placeholder="menit" value={menit} onChange={(e) => setMenit(e.target.value)} style={{ width: 70 }} />
      </div>
      <div className={s.row} style={{ marginTop: 6 }}>
        <input className={s.inp} placeholder="Link/ID YouTube" value={link} onChange={(e) => setLink(e.target.value)} style={{ flex: 1 }} />
        <button className={s.btn} onClick={simpan}>+ Video</button>
      </div>
      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 6 }}>{err}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Halaman /admin/video**

```tsx
// src/app/admin/video/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { hapusVideo } from '@/lib/data/admin-konten';
import VideoForm from './VideoForm';
import s from '../admin.module.css';

export default async function KelolaVideo() {
  const supabase = await createClient();
  const { data: video } = await supabase
    .from('video').select('id,judul,youtube_id,kategori').order('kategori').order('urutan');

  async function aksiHapus(fd: FormData) { 'use server'; await hapusVideo(String(fd.get('id'))); }

  const grup = (k: string) => (video ?? []).filter((v) => v.kategori === k);

  return (
    <div>
      <Link href="/admin" className={s.muted}>← dashboard</Link>
      <div className={s.section}>Tambah Video</div>
      <VideoForm />

      {(['baby', 'toddler'] as const).map((k) => (
        <div key={k}>
          <div className={s.section}>{k === 'baby' ? 'Baby (0-2)' : 'Toddler (2+)'} ({grup(k).length})</div>
          {grup(k).map((v) => (
            <div key={v.id} className={s.card}>
              <div className={s.row}>
                <span style={{ flex: 1 }}><b>{v.judul}</b> <span className={s.muted}>{v.youtube_id}</span></span>
                <form action={aksiHapus}><input type="hidden" name="id" value={v.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Hapus VideoForm lama & bagian video di Kelola-Tema**

Run: `rm src/app/admin/tema/[id]/VideoForm.tsx`

Di `src/app/admin/tema/[id]/page.tsx`:
- Hapus baris `import VideoForm from './VideoForm';`
- Hapus `import { ... hapusVideo ... }` → ganti jadi tanpa `hapusVideo` (sisakan `hapusPaket, setStatusTema, setMingguIni`).
- Hapus fungsi `aksiHapusVideo`.
- Hapus seluruh blok "Video" (mulai `<div className={s.section}>Video ...` sampai `<VideoForm temaId={id} />`).
- Tambah tautan ke kelola video global setelah bagian Game, mis.:
```tsx
      <div className={s.section}>Video</div>
      <p className={s.muted}>Video dikelola per kategori usia di <Link href="/admin/video">Kelola Video</Link>.</p>
```

- [ ] **Step 4: Tambah nav "Kelola Video" di dashboard** — di `src/app/admin/page.tsx`, tepat setelah `<div className={s.section}>Tambah Tema</div>` (atau di atasnya), tambah:
```tsx
      <p style={{ marginBottom: 12 }}><Link href="/admin/video" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>📺 Kelola Video</Link></p>
```
(Pastikan `Link` sudah diimport di page.tsx — sudah ada.)

- [ ] **Step 5: Verifikasi** `npx tsc --noEmit && npm run build` → sukses; route `/admin/video` dinamis.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat(admin): halaman Kelola Video per kategori; lepas dari tema"`

---

## Task 6: Pojok Video sisi anak pakai kategori

**Files:** Modify `src/app/main/[anakId]/page.tsx`, `src/app/main/[anakId]/MenuAnak.tsx`

- [ ] **Step 1: page.tsx — hitung kategori & muat video**

Di `src/app/main/[anakId]/page.tsx`, tambah import & logika; teruskan prop `video`:

```tsx
import { umurTahun } from '@/lib/domain/anak';
import { kategoriUsia } from '@/lib/domain/usia';
import { getVideoByKategori } from '@/lib/data/video';
```
Setelah `const anak = await getAnakTerjamin(anakId);`:
```tsx
  const umur = umurTahun(new Date(anak.tanggal_lahir + 'T00:00:00Z'), new Date());
  const video = await getVideoByKategori(kategoriUsia(umur));
```
Lalu pada `<MenuAnak ... />` tambahkan prop `video={video}`.

- [ ] **Step 2: MenuAnak — terima & pakai prop `video`**

Di `src/app/main/[anakId]/MenuAnak.tsx`:
- Tambah import tipe: `import type { Paket, TemaLengkap, Video } from '@/lib/game/tipe';`
- Tambah `video` ke props:
```tsx
export default function MenuAnak({
  anak, pustaka, pinTersimpan, video,
}: {
  anak: { id: string; koin: number; batas_menit: number };
  pustaka: TemaLengkap[]; pinTersimpan: string | null; video: Video[];
}) {
```
- Di layar `video`, ganti `video={mingguIni?.video ?? []}` menjadi `video={video}`:
```tsx
        <VideoPojok video={video} onKeluar={() => setLayar('menu')} />
```

- [ ] **Step 3: Verifikasi** `npx tsc --noEmit && npm run build` → sukses.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat(main): Pojok Video per kategori usia anak"`

---

## Task 7: Verifikasi akhir

- [ ] **Step 1: Unit** `npm test` → 25 test (sebelumnya 23 + kategoriUsia 2).
- [ ] **Step 2: Build** `npm run build` → sukses; route `/admin/video` ada.
- [ ] **Step 3: Smoke manual** (akun admin): /admin → 📺 Kelola Video → tambah video URL kategori Toddler → buka Mode Anak (anak usia 3) → Pojok Video menampilkan video itu. Tambah video kategori Baby → tidak muncul untuk anak toddler.
- [ ] **Step 4: Commit penutup** bila ada.

---

## Definition of Done
- Tabel `video` punya `kategori` (baby/toddler); `tema_id` nullable.
- Admin mengelola video di **/admin/video** (input URL + kategori), dikelompokkan baby/toddler.
- Bagian video DIHAPUS dari Kelola-Tema (diarahkan ke /admin/video).
- **Pojok Video** di Mode Anak menampilkan video sesuai **kategori usia anak**.
- Unit test hijau (25), build sukses.
