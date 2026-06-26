# KidzPlayful — M11: Kelas Bermain Mandiri + Admin CRUD — Implementation Plan

> Pola subagent-driven. Disetujui di brainstorming.

**Goal:** Kelas Bermain jadi **entitas mandiri** (lepas dari tema). Admin kelola di `/admin/kelas-bermain` (kartu seperti sisi user + **Tambah** + **cari judul** + **Edit** + **Aktif/Nonaktif** + **Hapus**, dengan **toast** tiap aksi & **loading** saat proses). Mode Anak (2+) & Mode Ortu (0-2) menampilkan **daftar kelas bermain aktif** (judul) → klik → detail. Mulai bersih (panduan-per-tema lama tak dipakai).

**Architecture:** Tabel baru `kelas_bermain` + RLS. Data layer + server actions (return row utk update state klien). Admin = client component SPA-ish (state list + search + form + toast + loading). Mode Anak/Ortu baca `kelas_bermain` aktif (tanpa tema). Tabel `panduan` ditinggalkan (legacy).

**Prasyarat:** Tahap 1 + admin selesai. Bucket Storage `aset` ada (utk worksheet PDF).

---

## Task 1: Migrasi kelas_bermain
**Files:** Create `supabase/migrations/0014_kelas_bermain.sql`
```sql
-- supabase/migrations/0014_kelas_bermain.sql
create table public.kelas_bermain (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  aktivitas text,
  bahan text,
  cara_membuat text,
  langkah jsonb not null default '[]'::jsonb,
  link_ide text,
  worksheet_url text,
  status text not null default 'aktif' check (status in ('aktif','nonaktif')),
  created_at timestamptz not null default now()
);
create index kelas_bermain_created_idx on public.kelas_bermain(created_at desc);

alter table public.kelas_bermain enable row level security;
create policy "baca kelas aktif" on public.kelas_bermain
  for select to authenticated using (status = 'aktif' or public.is_admin());
create policy "admin kelola kelas" on public.kelas_bermain
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
```
- [ ] Terapkan di SQL Editor. Commit.

---

## Task 2: Tipe + data + server actions
**Files:** Modify `src/lib/game/tipe.ts`; Create `src/lib/data/kelas-bermain.ts`, `src/lib/data/kelas-bermain-actions.ts`

- [ ] **Tipe** (tambah di tipe.ts):
```ts
export interface KelasBermain {
  id: string;
  judul: string;
  aktivitas: string | null;
  bahan: string | null;
  cara_membuat: string | null;
  langkah: string[];
  link_ide: string | null;
  worksheet_url: string | null;
  status: 'aktif' | 'nonaktif';
}
```

- [ ] **Data** `src/lib/data/kelas-bermain.ts`:
```ts
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';
const COLS = 'id,judul,aktivitas,bahan,cara_membuat,langkah,link_ide,worksheet_url,status';

export async function getKelasAktif(): Promise<KelasBermain[]> {
  const s = await createClient();
  const { data } = await s.from('kelas_bermain').select(COLS).eq('status', 'aktif').order('created_at', { ascending: false });
  return (data ?? []) as unknown as KelasBermain[];
}
export async function getKelasSemua(): Promise<KelasBermain[]> {
  const s = await createClient();
  const { data } = await s.from('kelas_bermain').select(COLS).order('created_at', { ascending: false });
  return (data ?? []) as unknown as KelasBermain[];
}
```

- [ ] **Actions** `src/lib/data/kelas-bermain-actions.ts`:
```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';

export interface KelasInput {
  judul: string; aktivitas: string; bahan: string; caraMembuat: string;
  langkah: string[]; linkIde: string; worksheetUrl: string | null;
}
const COLS = 'id,judul,aktivitas,bahan,cara_membuat,langkah,link_ide,worksheet_url,status';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}
function row(i: KelasInput) {
  return {
    judul: i.judul.trim() || 'Tanpa judul',
    aktivitas: i.aktivitas.trim() || null,
    bahan: i.bahan.trim() || null,
    cara_membuat: i.caraMembuat.trim() || null,
    langkah: i.langkah.filter((x) => x.trim()),
    link_ide: i.linkIde.trim() || null,
    worksheet_url: i.worksheetUrl?.trim() || null,
  };
}
export async function buatKelas(i: KelasInput): Promise<KelasBermain> {
  const s = await adminDb();
  if (!i.judul.trim()) throw new Error('Judul wajib diisi.');
  const { data, error } = await s.from('kelas_bermain').insert(row(i)).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as unknown as KelasBermain;
}
export async function updateKelas(id: string, i: KelasInput): Promise<KelasBermain> {
  const s = await adminDb();
  const { data, error } = await s.from('kelas_bermain').update(row(i)).eq('id', id).select(COLS).single();
  if (error) throw new Error(error.message);
  return data as unknown as KelasBermain;
}
export async function toggleStatusKelas(id: string, statusBaru: 'aktif' | 'nonaktif'): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('kelas_bermain').update({ status: statusBaru }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function hapusKelas(id: string): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('kelas_bermain').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
```
- [ ] `npx tsc --noEmit`. Commit `feat(kelas): tabel mandiri - tipe/data/actions`.

---

## Task 3: Admin UI — list + search + add/edit + toggle + hapus (toast & loading)
**Files:** Create `src/app/admin/kelas-bermain/KelasAdmin.tsx`; Replace `src/app/admin/kelas-bermain/page.tsx`; Delete `src/app/admin/kelas-bermain/[temaId]/page.tsx` & `src/app/admin/kelas-bermain/PanduanForm.tsx`

- [ ] **page.tsx (server)**:
```tsx
// src/app/admin/kelas-bermain/page.tsx
import Link from 'next/link';
import { getKelasSemua } from '@/lib/data/kelas-bermain';
import KelasAdmin from './KelasAdmin';
import s from '../admin.module.css';

export default async function AdminKelasBermain() {
  const list = await getKelasSemua();
  return (
    <div>
      <Link href="/admin" className={s.muted}>← dashboard</Link>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🎈 Kelas Bermain</h1></div>
      <KelasAdmin awal={list} />
    </div>
  );
}
```

- [ ] **KelasAdmin.tsx (client)** — list + search + form + toggle + hapus + toast + loading:
```tsx
// src/app/admin/kelas-bermain/KelasAdmin.tsx
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { buatKelas, updateKelas, toggleStatusKelas, hapusKelas, type KelasInput } from '@/lib/data/kelas-bermain-actions';
import type { KelasBermain } from '@/lib/game/tipe';
import s from '../admin.module.css';

const KOSONG: KelasInput = { judul: '', aktivitas: '', bahan: '', caraMembuat: '', langkah: [''], linkIde: '', worksheetUrl: null };

export default function KelasAdmin({ awal }: { awal: KelasBermain[] }) {
  const [list, setList] = useState<KelasBermain[]>(awal);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<KelasInput | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2200); }
  const tampil = list.filter((k) => k.judul.toLowerCase().includes(q.toLowerCase()));

  function bukaTambah() { setEditId(null); setForm({ ...KOSONG, langkah: [''] }); }
  function bukaEdit(k: KelasBermain) {
    setEditId(k.id);
    setForm({ judul: k.judul, aktivitas: k.aktivitas ?? '', bahan: k.bahan ?? '', caraMembuat: k.cara_membuat ?? '', langkah: k.langkah?.length ? k.langkah : [''], linkIde: k.link_ide ?? '', worksheetUrl: k.worksheet_url });
  }

  async function unggahPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !form) return;
    setLoading(true);
    try {
      const sb = createClient();
      const path = `worksheet/${Date.now()}-${Math.floor(performance.now())}.pdf`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false });
      if (error) throw error;
      setForm({ ...form, worksheetUrl: sb.storage.from('aset').getPublicUrl(path).data.publicUrl });
      flash('Worksheet terunggah ✓');
    } catch (e2) { flash(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function simpan() {
    if (!form) return;
    if (!form.judul.trim()) { flash('Judul wajib diisi.'); return; }
    setLoading(true);
    try {
      if (editId) {
        const r = await updateKelas(editId, form);
        setList(list.map((k) => (k.id === editId ? r : k)));
        flash('Tersimpan ✓');
      } else {
        const r = await buatKelas(form);
        setList([r, ...list]);
        flash('Kelas bermain ditambahkan ✓');
      }
      setForm(null); setEditId(null);
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setLoading(false); }
  }

  async function toggle(k: KelasBermain) {
    setBusyId(k.id);
    const baru = k.status === 'aktif' ? 'nonaktif' : 'aktif';
    try { await toggleStatusKelas(k.id, baru); setList(list.map((x) => (x.id === k.id ? { ...x, status: baru } : x))); flash(baru === 'aktif' ? 'Diaktifkan ✓' : 'Dinonaktifkan ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }
  async function hapus(k: KelasBermain) {
    if (!confirm(`Hapus "${k.judul}"?`)) return;
    setBusyId(k.id);
    try { await hapusKelas(k.id); setList(list.filter((x) => x.id !== k.id)); flash('Dihapus ✓'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div className={s.row} style={{ gap: 8, marginBottom: 12 }}>
        <input className={s.inp} placeholder="Cari judul..." value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
        <button className={s.btn} onClick={bukaTambah}>+ Tambah Kelas Bermain</button>
      </div>

      {form && (
        <div className={s.card} style={{ border: '2px solid var(--lavender)' }}>
          <b>{editId ? 'Edit' : 'Tambah'} Kelas Bermain</b>
          <input className={s.inp} placeholder="Judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} style={{ width: '100%', marginTop: 8 }} />
          <textarea className={s.inp} placeholder="Aktivitas kelas bermain" rows={3} value={form.aktivitas} onChange={(e) => setForm({ ...form, aktivitas: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
          <input className={s.inp} placeholder="Bahan" value={form.bahan} onChange={(e) => setForm({ ...form, bahan: e.target.value })} style={{ width: '100%' }} />
          <textarea className={s.inp} placeholder="Cara membuat" rows={3} value={form.caraMembuat} onChange={(e) => setForm({ ...form, caraMembuat: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
          <div className={s.muted} style={{ margin: '4px 0' }}>Langkah aktivitas:</div>
          {form.langkah.map((l, i) => (
            <div key={i} className={s.row} style={{ marginTop: 4 }}>
              <span className={s.muted}>{i + 1}.</span>
              <input className={s.inp} value={l} placeholder="langkah..." onChange={(e) => setForm({ ...form, langkah: form.langkah.map((x, j) => (j === i ? e.target.value : x)) })} style={{ flex: 1, marginBottom: 0 }} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setForm({ ...form, langkah: [...form.langkah, ''] })}>+ langkah</button>
          <input className={s.inp} placeholder="Link/video referensi" value={form.linkIde} onChange={(e) => setForm({ ...form, linkIde: e.target.value })} style={{ width: '100%', marginTop: 10 }} />
          <div className={s.row} style={{ marginTop: 6 }}>
            <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => fileRef.current?.click()} disabled={loading}>{loading ? '...' : '⬆ Worksheet PDF'}</button>
            {form.worksheetUrl && <a className={s.muted} href={form.worksheetUrl} target="_blank" style={{ color: 'var(--biru-d)' }}>lihat PDF</a>}
            <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={unggahPdf} />
          </div>
          <div className={s.row} style={{ marginTop: 10 }}>
            <button className={s.btn} onClick={simpan} disabled={loading}>{loading ? 'Menyimpan...' : '💾 Simpan'}</button>
            <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => { setForm(null); setEditId(null); }} disabled={loading}>Batal</button>
          </div>
        </div>
      )}

      <div className={s.section}>Daftar ({tampil.length})</div>
      {tampil.map((k) => (
        <div key={k.id} className={s.card} style={{ opacity: k.status === 'nonaktif' ? 0.55 : 1 }}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{k.judul}</b> {k.status === 'nonaktif' && <span className={`${s.tag} ${s.tagDraf}`}>nonaktif</span>}</span>
          </div>
          <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => bukaEdit(k)} disabled={busyId === k.id}>Edit</button>
            <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggle(k)} disabled={busyId === k.id}>{busyId === k.id ? '...' : (k.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan')}</button>
            <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(k)} disabled={busyId === k.id}>Hapus</button>
          </div>
        </div>
      ))}
      {tampil.length === 0 && <p className={s.muted}>Belum ada kelas bermain{q ? ' yang cocok' : ''}.</p>}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
```

- [ ] Hapus `src/app/admin/kelas-bermain/[temaId]/page.tsx` & `src/app/admin/kelas-bermain/PanduanForm.tsx`.
- [ ] `npx tsc --noEmit && npx eslint src/app/admin/kelas-bermain 2>&1 | tail -12 && npm run build`. Commit.

---

## Task 4: Mode Anak & Mode Ortu baca kelas_bermain aktif
**Files:** Modify `src/app/main/[anakId]/page.tsx`, `src/app/main/[anakId]/MenuAnak.tsx`, `src/app/ortu/[anakId]/page.tsx`

- [ ] **main/page.tsx**: ganti `getModeOrtu` → `getKelasAktif`; `const kelasList = await getKelasAktif();` kirim prop `kelasList: KelasBermain[]` (hapus filter `.filter(t=>t.panduan)` & impor getModeOrtu).
- [ ] **MenuAnak.tsx**: prop `kelasList: KelasBermain[]` (ganti `TemaPanduan[]`); state `kelasDipilih: KelasBermain | null`. Layar 'kelas' = daftar judul (kp-tile rotasi warna, teks `k.judul`) → klik → setKelasDipilih + 'kelas-detail'. Layar 'kelas-detail' render `kelasDipilih`: Judul (heading) · Aktivitas · Bahan · Cara membuat · Langkah · Lihat ide · Worksheet · "💬 Bagikan pengalaman" → `/komunitas` (tanpa tema). Header chip pakai `🎈 {kelasDipilih.judul}`.
- [ ] **ortu/page.tsx**: ganti sumber dari `getModeOrtu` → `getKelasAktif`; render daftar kelas bermain aktif (judul + aktivitas + bahan + cara_membuat + langkah + link + worksheet) sebagai kartu; pertahankan bagian Video Baby (`getVideoByKategori('baby')`).
- [ ] `npx tsc --noEmit && npm run build`. Commit.

---

## Task 5: Verifikasi + deploy
- [ ] `npm test` → 30 hijau. `npm run build` → sukses.
- [ ] `git push origin master` → auto-deploy.
- [ ] (Saya) uji admin: tambah → tampil → edit → nonaktif (hilang dari Mode Anak) → toast & loading muncul.

## Definition of Done
- Tabel `kelas_bermain` mandiri (tanpa tema). Admin: tambah/cari/edit/aktif-nonaktif/hapus dgn **toast** & **loading**.
- Mode Anak & Mode Ortu menampilkan kelas bermain **aktif** (daftar judul → detail).
- Build & test hijau, ter-deploy.

## Catatan
- `panduan` (per-tema) ditinggalkan (legacy); `getModeOrtu`/`getKelasBermain`/`simpanPanduan` tak dipakai lagi (boleh dibersihkan nanti).
- Tombol "Bagikan pengalaman" kini tanpa pre-isi tema (kelas lepas dari tema).
