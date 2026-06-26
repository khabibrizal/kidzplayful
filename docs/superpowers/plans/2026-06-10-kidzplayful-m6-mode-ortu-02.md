# KidzPlayful — M6: Mode Orang Tua 0-2 (Baby) — Implementation Plan

> Pola subagent-driven. Langkah pakai checkbox `- [ ]`.

**Goal:** Mode untuk anak **0-2 tahun** (layar di tangan ortu): **panduan aktivitas** bertema (bahan + langkah) + **worksheet PDF** (unduh) + **video Baby**. Admin mengelola panduan per tema (termasuk unggah PDF). Anak ber-`mode_default='ortu'` diarahkan ke Mode Ortu dari pilih-anak.

**Architecture:** Lanjutan M1–M5. Tabel baru `panduan` (1-1 per tema: bahan, langkah[], worksheet_url). PDF disimpan di bucket Storage `aset` (sudah ada). Mode Ortu = halaman `/ortu/[anakId]` (Server Component, guard sama seperti Mode Anak). Video Baby pakai `getVideoByKategori('baby')` (sudah ada). Admin panduan ditambah di halaman Kelola Tema.

**Prasyarat:** M1–M5 selesai (bucket `aset` ada, admin, video kategori). Acuan spec: §1 (0-2 = Mode Ortu), §12 (Panduan), §15 (ERD `panduan`).

---

## Task 1: Migrasi tabel panduan

**Files:** Create `supabase/migrations/0008_panduan.sql`

- [ ] **Step 1: Tulis migrasi**

```sql
-- supabase/migrations/0008_panduan.sql
create table public.panduan (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid not null unique references public.tema(id) on delete cascade,
  bahan text,
  langkah jsonb not null default '[]'::jsonb,
  worksheet_url text,
  status text not null default 'disetujui' check (status in ('draf','disetujui'))
);

alter table public.panduan enable row level security;
create policy "baca panduan disetujui" on public.panduan
  for select to authenticated using (status = 'disetujui');
create policy "admin kelola panduan" on public.panduan
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin baca semua panduan" on public.panduan
  for select to authenticated using (public.is_admin());
```

- [ ] **Step 2: Terapkan** (Dashboard SQL Editor / `supabase db push`).
Expected: tabel `panduan` + 3 policy.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(db): tabel panduan (Mode Ortu 0-2) + RLS"`

---

## Task 2: Tipe + data panduan

**Files:** Modify `src/lib/game/tipe.ts`; Create `src/lib/data/panduan.ts`

- [ ] **Step 1: Tipe Panduan** — tambah di `src/lib/game/tipe.ts`:

```ts
export interface Panduan {
  tema_id: string;
  bahan: string | null;
  langkah: string[];
  worksheet_url: string | null;
}
export interface TemaPanduan {
  tema: TemaInfo;
  panduan: Panduan | null;
}
```

- [ ] **Step 2: Data getModeOrtu** (semua tema disetujui + panduannya):

```ts
// src/lib/data/panduan.ts
import { createClient } from '@/lib/supabase/server';
import type { TemaPanduan, Panduan } from '@/lib/game/tipe';

export async function getModeOrtu(): Promise<TemaPanduan[]> {
  const supabase = await createClient();
  const { data: tema } = await supabase
    .from('tema').select('id,nama,sampul,is_minggu_ini').eq('status', 'disetujui')
    .order('is_minggu_ini', { ascending: false }).order('created_at');
  if (!tema) return [];
  const ids = tema.map((t) => t.id);
  const { data: pan } = await supabase
    .from('panduan').select('tema_id,bahan,langkah,worksheet_url').in('tema_id', ids);
  const map = new Map((pan ?? []).map((p) => [p.tema_id, p as unknown as Panduan]));
  return tema.map((t) => ({
    tema: { id: t.id, nama: t.nama, sampul: t.sampul, is_minggu_ini: t.is_minggu_ini },
    panduan: map.get(t.id) ?? null,
  }));
}
```

- [ ] **Step 3: Verifikasi** `npx tsc --noEmit`.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat(data): tipe Panduan + getModeOrtu"`

---

## Task 3: Server action simpan panduan

**Files:** Modify `src/lib/data/admin-konten.ts`

- [ ] **Step 1: Tambah action** di `src/lib/data/admin-konten.ts`:

```ts
export async function simpanPanduan(input: { temaId: string; bahan: string; langkah: string[]; worksheetUrl: string | null }) {
  const supabase = await db();
  const { error } = await supabase.from('panduan').upsert({
    tema_id: input.temaId,
    bahan: input.bahan.trim() || null,
    langkah: input.langkah.filter((x) => x.trim()),
    worksheet_url: input.worksheetUrl?.trim() || null,
    status: 'disetujui',
  }, { onConflict: 'tema_id' });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tema/${input.temaId}`);
}
```

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit`.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(admin): server action simpanPanduan (upsert)"`

---

## Task 4: Admin PanduanForm + wire ke Kelola Tema

**Files:** Create `src/app/admin/tema/[id]/PanduanForm.tsx`; Modify `src/app/admin/tema/[id]/page.tsx`

- [ ] **Step 1: PanduanForm (client) — bahan + langkah[] + upload PDF**

```tsx
// src/app/admin/tema/[id]/PanduanForm.tsx
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { simpanPanduan } from '@/lib/data/admin-konten';
import s from '../../admin.module.css';

export default function PanduanForm({
  temaId, awal,
}: { temaId: string; awal: { bahan: string | null; langkah: string[]; worksheet_url: string | null } | null }) {
  const [bahan, setBahan] = useState(awal?.bahan ?? '');
  const [langkah, setLangkah] = useState<string[]>(awal?.langkah?.length ? awal.langkah : ['']);
  const [worksheet, setWorksheet] = useState<string | null>(awal?.worksheet_url ?? null);
  const [naik, setNaik] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function unggahPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setErr(''); setNaik(true);
    try {
      const supabase = createClient();
      const path = `worksheet/${Date.now()}-${Math.floor(performance.now())}.pdf`;
      const { error } = await supabase.storage.from('aset').upload(path, file, { upsert: false });
      if (error) throw error;
      setWorksheet(supabase.storage.from('aset').getPublicUrl(path).data.publicUrl);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setNaik(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function simpan() {
    setErr('');
    try { await simpanPanduan({ temaId, bahan, langkah, worksheetUrl: worksheet }); location.reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Gagal'); }
  }

  return (
    <div className={s.card}>
      <input className={s.inp} placeholder="Bahan (mis. wadah, kapas, kain bertekstur)" value={bahan} onChange={(e) => setBahan(e.target.value)} style={{ width: '100%' }} />
      <div className={s.muted} style={{ margin: '8px 0 4px' }}>Langkah aktivitas:</div>
      {langkah.map((l, i) => (
        <div key={i} className={s.row} style={{ marginTop: 4 }}>
          <span className={s.muted}>{i + 1}.</span>
          <input className={s.inp} value={l} placeholder="langkah..." onChange={(e) => setLangkah(langkah.map((x, j) => j === i ? e.target.value : x))} style={{ flex: 1 }} />
        </div>
      ))}
      <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setLangkah([...langkah, ''])}>+ langkah</button>

      <div className={s.row} style={{ marginTop: 10 }}>
        <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => fileRef.current?.click()} disabled={naik}>{naik ? '...' : '⬆ Worksheet PDF'}</button>
        {worksheet && <a href={worksheet} target="_blank" className={s.muted} style={{ color: 'var(--biru-d)' }}>lihat PDF</a>}
        <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={unggahPdf} />
      </div>
      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 6 }}>{err}</div>}
      <button className={s.btn} style={{ marginTop: 10 }} onClick={simpan}>💾 Simpan panduan</button>
    </div>
  );
}
```

- [ ] **Step 2: Wire ke Kelola Tema** — di `src/app/admin/tema/[id]/page.tsx`:
- Tambah import: `import PanduanForm from './PanduanForm';`
- Ambil panduan: setelah query paket/video, tambah:
```tsx
  const { data: panduan } = await supabase.from('panduan').select('bahan,langkah,worksheet_url').eq('tema_id', id).maybeSingle();
```
- Sebelum penutup, tambah section:
```tsx
      <div className={s.section}>Panduan Ortu 0-2 (dari worksheet)</div>
      <PanduanForm temaId={id} awal={panduan ? { bahan: panduan.bahan, langkah: (panduan.langkah ?? []) as string[], worksheet_url: panduan.worksheet_url } : null} />
```

- [ ] **Step 3: Verifikasi** `npx tsc --noEmit && npm run build`.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat(admin): PanduanForm 0-2 (bahan/langkah/PDF) di Kelola Tema"`

---

## Task 5: Halaman Mode Ortu /ortu/[anakId]

**Files:** Create `src/app/ortu/[anakId]/page.tsx`, `src/app/ortu/[anakId]/ortu.module.css`

- [ ] **Step 1: CSS**

```css
/* src/app/ortu/[anakId]/ortu.module.css */
.wrap { max-width: 440px; margin: 0 auto; padding: 16px; }
.hd { background: var(--biru-d); color: #fff; border-radius: 18px; padding: 16px; margin-bottom: 14px; }
.hd h1 { font-size: 20px; }
.hd small { opacity: .9; }
.card { background: #fff; border-radius: 16px; padding: 14px; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(120,90,180,.08); }
.bahan { background: #fff3d6; color: #8a6d1f; border-radius: 10px; padding: 10px; font-size: 13px; margin-bottom: 8px; }
.step { display: flex; gap: 10px; align-items: flex-start; margin: 6px 0; }
.n { width: 24px; height: 24px; flex-shrink: 0; border-radius: 50%; background: var(--biru-d); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
.dl { display: inline-block; margin-top: 8px; background: var(--biru-d); color: #fff; text-decoration: none; padding: 9px 14px; border-radius: 10px; font-weight: 700; font-size: 14px; }
.sec { font-size: 12px; font-weight: 700; color: var(--abu); text-transform: uppercase; margin: 16px 0 6px; }
.vid { display: flex; gap: 10px; align-items: center; }
.muted { color: var(--abu); font-size: 13px; }
.back { color: var(--abu); font-size: 13px; text-decoration: none; }
```

- [ ] **Step 2: Halaman**

```tsx
// src/app/ortu/[anakId]/page.tsx
import Link from 'next/link';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getModeOrtu } from '@/lib/data/panduan';
import { getVideoByKategori } from '@/lib/data/video';
import s from './ortu.module.css';

export default async function ModeOrtu({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const anak = await getAnakTerjamin(anakId);
  const list = await getModeOrtu();
  const videoBaby = await getVideoByKategori('baby');
  const adaPanduan = list.filter((t) => t.panduan);

  return (
    <div className={s.wrap}>
      <Link href="/pilih-anak" className={s.back}>← ganti anak</Link>
      <div className={s.hd}>
        <h1>👶 Mode Orang Tua</h1>
        <small>Untuk {anak.nama} · aktivitas main bersama (0-2 thn)</small>
      </div>

      {adaPanduan.length === 0 && <p className={s.muted}>Belum ada panduan aktivitas. Admin dapat menambah di Kelola Tema.</p>}

      {adaPanduan.map(({ tema, panduan }) => (
        <div key={tema.id} className={s.card}>
          <b>{tema.sampul ?? '🎈'} {tema.nama}{tema.is_minggu_ini ? ' · Minggu Ini' : ''}</b>
          {panduan?.bahan && <div className={s.bahan} style={{ marginTop: 8 }}>🧺 {panduan.bahan}</div>}
          {(panduan?.langkah ?? []).map((l, i) => (
            <div key={i} className={s.step}><span className={s.n}>{i + 1}</span><span style={{ fontSize: 14 }}>{l}</span></div>
          ))}
          {panduan?.worksheet_url && <a className={s.dl} href={panduan.worksheet_url} target="_blank">📄 Unduh Worksheet</a>}
        </div>
      ))}

      <div className={s.sec}>Video untuk Baby</div>
      {videoBaby.length === 0 && <p className={s.muted}>Belum ada video baby (tambah di Admin → Kelola Video).</p>}
      {videoBaby.map((v) => (
        <div key={v.id} className={s.card}>
          <div className={s.vid}><span style={{ fontSize: 24 }}>▶</span><span style={{ flex: 1 }}><b>{v.judul}</b><br /><span className={s.muted}>{Math.round(v.durasi_detik / 60)} menit</span></span>
            <a className={s.dl} href={`https://www.youtube-nocookie.com/embed/${v.youtube_id}`} target="_blank">Putar</a>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verifikasi** `npx tsc --noEmit && npm run build` → route `/ortu/[anakId]` dinamis.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat(ortu): halaman Mode Ortu 0-2 (panduan+worksheet+video baby)"`

---

## Task 6: Routing pilih-anak per mode

**Files:** Modify `src/app/pilih-anak/page.tsx`

- [ ] **Step 1: Arahkan anak `mode_default='ortu'` ke /ortu**

Di `src/app/pilih-anak/page.tsx`, pada kartu anak ubah `href` link utama agar bercabang per mode. Cari:
```tsx
          <a href={`/main/${a.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
```
Ganti `href` menjadi kondisional:
```tsx
          <a href={a.mode_default === 'ortu' ? `/ortu/${a.id}` : `/main/${a.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
```
(Properti `mode_default` sudah di-select di pilih-anak.)

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit && npm run build`.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(pilih-anak): anak 0-2 (mode ortu) diarahkan ke /ortu"`

---

## Task 7: Verifikasi akhir

- [ ] **Step 1: Unit** `npm test` → tetap 28 (tidak ada test domain baru di M6). Laporkan.
- [ ] **Step 2: Build** `npm run build` → sukses; route `/ortu/[anakId]` dinamis.
- [ ] **Step 3: Smoke manual** (admin + migrasi 0008):
  - /admin → Tema (mis. Hewan) → Kelola → bagian **Panduan Ortu 0-2**: isi bahan, beberapa langkah, unggah **Worksheet PDF** → Simpan.
  - Admin → Kelola Video → tambah 1 video kategori **Baby**.
  - pilih-anak → tambah anak usia **1 tahun** (mode ortu otomatis) → klik anak → masuk **/ortu/<id>** → panduan, tombol Unduh Worksheet, dan video Baby tampil.
  - Anak usia 3 tetap masuk Mode Anak (/main) seperti biasa.
- [ ] **Step 4: Commit penutup** bila ada.

---

## Definition of Done
- Tabel `panduan` (1-1 per tema) + RLS.
- Admin dapat mengisi **panduan 0-2** (bahan, langkah, **unggah worksheet PDF**) per tema di Kelola Tema.
- Halaman **/ortu/[anakId]** menampilkan panduan aktivitas + unduh worksheet + **video Baby**.
- Anak `mode_default='ortu'` (0-2) dari pilih-anak diarahkan ke Mode Ortu; anak 2+ tetap ke Mode Anak.
- Unit test hijau (28), build sukses, smoke manual OK.

## Catatan
- Worksheet & video Baby memakai infra yang sudah ada (bucket `aset`, video kategori).
- PIN/batas-waktu tidak diberlakukan di Mode Ortu (layar memang dipegang ortu).
- Edit/hapus panduan: form ini upsert (menimpa) per tema; hapus eksplisit bisa ditambah nanti.
