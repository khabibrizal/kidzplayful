# KidzPlayful — M10: Komunitas "Cerita & Tips" (Tahap 1) — Implementation Plan

> Pola subagent-driven. Disetujui di brainstorming. Gaya `kp-*`.

**Goal:** Feed komunitas antar orang tua: posting **cerita/tips (teks)** terkait materi Kelas Bermain/game, bisa **dikomentari & disukai**. Nama publik pakai **nama tampilan** (bukan email). Tahap 1 = feed+posting+komentar+like+nama tampilan + hapus milik sendiri. **Tahap 2 (terpisah):** tombol Lapor + panel moderasi admin.

**Architecture:** Lanjutan Tahap 1. Tabel `postingan`/`komentar`/`suka` + kolom `profiles.nama_tampilan`. Nama penulis **didenormalisasi** ke baris postingan/komentar (snapshot) agar tak perlu membaca profil orang lain (RLS profil tetap privat). Server actions untuk tulis; Server Components untuk baca. Foto tidak ada (teks saja).

**Prasyarat:** Tahap 1 KidzPlayful + admin (`is_admin`) selesai. Acuan: brainstorming Komunitas.

---

## Task 1: Migrasi komunitas

**Files:** Create `supabase/migrations/0010_komunitas.sql`

- [ ] **Step 1:**
```sql
-- supabase/migrations/0010_komunitas.sql
alter table public.profiles add column if not exists nama_tampilan text;

create table public.postingan (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  nama text not null,                 -- snapshot nama tampilan
  tema_id uuid references public.tema(id) on delete set null,
  teks text not null,
  status text not null default 'tampil' check (status in ('tampil','disembunyikan')),
  created_at timestamptz not null default now()
);
create index postingan_created_idx on public.postingan(created_at desc);

create table public.komentar (
  id uuid primary key default gen_random_uuid(),
  postingan_id uuid not null references public.postingan(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  nama text not null,
  teks text not null,
  status text not null default 'tampil' check (status in ('tampil','disembunyikan')),
  created_at timestamptz not null default now()
);
create index komentar_post_idx on public.komentar(postingan_id);

create table public.suka (
  postingan_id uuid not null references public.postingan(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  primary key (postingan_id, ortu_id)
);

alter table public.postingan enable row level security;
alter table public.komentar enable row level security;
alter table public.suka enable row level security;

create policy "baca postingan tampil" on public.postingan
  for select to authenticated using (status = 'tampil' or public.is_admin());
create policy "tulis postingan sendiri" on public.postingan
  for insert to authenticated with check (ortu_id = auth.uid());
create policy "hapus postingan sendiri/admin" on public.postingan
  for delete to authenticated using (ortu_id = auth.uid() or public.is_admin());
create policy "admin update postingan" on public.postingan
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "baca komentar tampil" on public.komentar
  for select to authenticated using (status = 'tampil' or public.is_admin());
create policy "tulis komentar sendiri" on public.komentar
  for insert to authenticated with check (ortu_id = auth.uid());
create policy "hapus komentar sendiri/admin" on public.komentar
  for delete to authenticated using (ortu_id = auth.uid() or public.is_admin());

create policy "baca suka" on public.suka for select to authenticated using (true);
create policy "suka sendiri" on public.suka for insert to authenticated with check (ortu_id = auth.uid());
create policy "batal suka sendiri" on public.suka for delete to authenticated using (ortu_id = auth.uid());
```
- [ ] **Step 2:** Terapkan (Dashboard SQL Editor / `supabase db push`).
- [ ] **Step 3:** Commit `git add -A && git commit -m "feat(db): komunitas (postingan/komentar/suka) + nama_tampilan + RLS"`

---

## Task 2: Server actions komunitas

**Files:** Create `src/lib/data/komunitas-actions.ts`

- [ ] **Step 1:**
```ts
// src/lib/data/komunitas-actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function sesi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await supabase.from('profiles').select('nama_tampilan').single();
  const nama = prof?.nama_tampilan?.trim() || 'Orang Tua';
  return { supabase, userId: user.id, nama };
}

export async function setNamaTampilan(nama: string) {
  const { supabase, userId } = await sesi();
  const { error } = await supabase.from('profiles').update({ nama_tampilan: nama.trim() || null }).eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/pengaturan'); revalidatePath('/komunitas');
}

export async function buatPostingan(teks: string, temaId: string | null) {
  const { supabase, userId, nama } = await sesi();
  if (!teks.trim()) throw new Error('Cerita tidak boleh kosong.');
  const { error } = await supabase.from('postingan').insert({
    ortu_id: userId, nama, teks: teks.trim(), tema_id: temaId || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/komunitas');
}

export async function hapusPostingan(id: string) {
  const { supabase } = await sesi();
  const { error } = await supabase.from('postingan').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/komunitas');
}

export async function buatKomentar(postId: string, teks: string) {
  const { supabase, userId, nama } = await sesi();
  if (!teks.trim()) throw new Error('Komentar kosong.');
  const { error } = await supabase.from('komentar').insert({
    postingan_id: postId, ortu_id: userId, nama, teks: teks.trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/komunitas/${postId}`); revalidatePath('/komunitas');
}

export async function toggleSuka(postId: string) {
  const { supabase, userId } = await sesi();
  const { data: ada } = await supabase.from('suka').select('postingan_id').eq('postingan_id', postId).eq('ortu_id', userId).maybeSingle();
  if (ada) await supabase.from('suka').delete().eq('postingan_id', postId).eq('ortu_id', userId);
  else await supabase.from('suka').insert({ postingan_id: postId, ortu_id: userId });
  revalidatePath('/komunitas'); revalidatePath(`/komunitas/${postId}`);
}
```
- [ ] **Step 2:** `npx tsc --noEmit`.
- [ ] **Step 3:** Commit `git add -A && git commit -m "feat(komunitas): server actions posting/komentar/suka/nama"`

---

## Task 3: Data layer feed & detail

**Files:** Create `src/lib/data/komunitas.ts`

- [ ] **Step 1:**
```ts
// src/lib/data/komunitas.ts
import { createClient } from '@/lib/supabase/server';

export interface PostFeed {
  id: string; nama: string; teks: string; created_at: string;
  tema: { nama: string; sampul: string | null } | null;
  jmlSuka: number; jmlKomentar: number; sukaSaya: boolean; milikSaya: boolean;
}

export async function getFeed(): Promise<PostFeed[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: posts } = await supabase
    .from('postingan')
    .select('id,nama,teks,created_at,ortu_id,tema:tema_id(nama,sampul),suka(count),komentar(count)')
    .eq('status', 'tampil').order('created_at', { ascending: false }).limit(100);
  const { data: sukaSaya } = user
    ? await supabase.from('suka').select('postingan_id').eq('ortu_id', user.id)
    : { data: [] };
  const setSuka = new Set((sukaSaya ?? []).map((s) => s.postingan_id));
  return (posts ?? []).map((p) => {
    const tema = Array.isArray(p.tema) ? p.tema[0] : p.tema;
    return {
      id: p.id as string, nama: p.nama as string, teks: p.teks as string, created_at: p.created_at as string,
      tema: tema ? { nama: tema.nama as string, sampul: tema.sampul as string | null } : null,
      jmlSuka: (p.suka as { count: number }[])?.[0]?.count ?? 0,
      jmlKomentar: (p.komentar as { count: number }[])?.[0]?.count ?? 0,
      sukaSaya: setSuka.has(p.id as string),
      milikSaya: user ? p.ortu_id === user.id : false,
    };
  });
}

export interface KomentarItem { id: string; nama: string; teks: string; created_at: string; }
export interface PostDetail { id: string; nama: string; teks: string; created_at: string; komentar: KomentarItem[]; }

export async function getPostingan(id: string): Promise<PostDetail | null> {
  const supabase = await createClient();
  const { data: p } = await supabase.from('postingan').select('id,nama,teks,created_at').eq('id', id).eq('status', 'tampil').maybeSingle();
  if (!p) return null;
  const { data: k } = await supabase.from('komentar').select('id,nama,teks,created_at').eq('postingan_id', id).eq('status', 'tampil').order('created_at');
  return { id: p.id, nama: p.nama, teks: p.teks, created_at: p.created_at, komentar: (k ?? []) as KomentarItem[] };
}
```
- [ ] **Step 2:** `npx tsc --noEmit` (perbaiki tipe relational bila perlu, pertahankan maksud).
- [ ] **Step 3:** Commit `git add -A && git commit -m "feat(komunitas): data getFeed & getPostingan"`

---

## Task 4: Halaman feed /komunitas + Compose + tombol Suka

**Files:** Create `src/app/komunitas/page.tsx`, `src/app/komunitas/Compose.tsx`, `src/app/komunitas/SukaBtn.tsx`

- [ ] **Step 1: Compose (client)**
```tsx
// src/app/komunitas/Compose.tsx
'use client';
import { useState } from 'react';
import { buatPostingan } from '@/lib/data/komunitas-actions';

export default function Compose({ tema, temaAwal }: { tema: { id: string; nama: string }[]; temaAwal?: string }) {
  const [teks, setTeks] = useState('');
  const [temaId, setTemaId] = useState(temaAwal ?? '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function kirim() {
    setErr('');
    if (!teks.trim()) { setErr('Tulis ceritamu dulu ya.'); return; }
    setLoading(true);
    try { await buatPostingan(teks, temaId || null); setTeks(''); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Gagal'); }
    finally { setLoading(false); }
  }

  return (
    <div className="kp-card" style={{ marginBottom: 14 }}>
      <textarea className="kp-input" rows={3} placeholder="Bagikan cerita/tips setelah mencoba kelas bermain..." value={teks} onChange={(e) => setTeks(e.target.value)} style={{ resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select className="kp-input" style={{ flex: 1, marginBottom: 0 }} value={temaId} onChange={(e) => setTemaId(e.target.value)}>
          <option value="">(umum)</option>
          {tema.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
        </select>
        <button className="kp-btn mint" onClick={kirim} disabled={loading}>{loading ? '...' : 'Bagikan'}</button>
      </div>
      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 6 }}>{err}</div>}
    </div>
  );
}
```

- [ ] **Step 2: SukaBtn (client)**
```tsx
// src/app/komunitas/SukaBtn.tsx
'use client';
import { useState, useTransition } from 'react';
import { toggleSuka } from '@/lib/data/komunitas-actions';

export default function SukaBtn({ postId, awalSuka, awalJml }: { postId: string; awalSuka: boolean; awalJml: number }) {
  const [suka, setSuka] = useState(awalSuka);
  const [jml, setJml] = useState(awalJml);
  const [pending, start] = useTransition();
  function klik() {
    setSuka(!suka); setJml(jml + (suka ? -1 : 1));
    start(() => { toggleSuka(postId); });
  }
  return (
    <button onClick={klik} disabled={pending} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: suka ? '#e0445b' : 'var(--abu)', fontFamily: 'inherit' }}>
      {suka ? '❤️' : '🤍'} {jml}
    </button>
  );
}
```

- [ ] **Step 3: Halaman feed**
```tsx
// src/app/komunitas/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFeed } from '@/lib/data/komunitas';
import Compose from './Compose';
import SukaBtn from './SukaBtn';

export default async function Komunitas({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema: temaAwal } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: tema } = await supabase.from('tema').select('id,nama').eq('status', 'disetujui').order('nama');
  const feed = await getFeed();

  return (
    <main style={{ maxWidth: 480, margin: '20px auto', padding: 16 }}>
      <Link href="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }}>← kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 4px' }}>💬 Komunitas</h1>
      <p style={{ color: 'var(--abu)', fontSize: 12, marginBottom: 12 }}>Berbagi cerita & tips dengan sesama orang tua. Mohon santun & jaga privasi anak. 🌿</p>

      <Compose tema={tema ?? []} temaAwal={temaAwal} />

      {feed.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada cerita. Jadilah yang pertama berbagi!</p>}
      {feed.map((p) => (
        <div key={p.id} className="kp-card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <b>{p.nama}</b>{p.tema && <span className="kp-chip" style={{ fontSize: 11, padding: '2px 10px', boxShadow: 'none' }}>{p.tema.sampul ?? ''} {p.tema.nama}</span>}
          </div>
          <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{p.teks}</p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 13 }}>
            <SukaBtn postId={p.id} awalSuka={p.sukaSaya} awalJml={p.jmlSuka} />
            <Link href={`/komunitas/${p.id}`} style={{ color: 'var(--abu)' }}>💬 {p.jmlKomentar}</Link>
          </div>
        </div>
      ))}
    </main>
  );
}
```
- [ ] **Step 4:** `npx tsc --noEmit && npx eslint src/app/komunitas src/lib/data 2>&1 | tail -15 && npm run build`.
- [ ] **Step 5:** Commit `git add -A && git commit -m "feat(komunitas): feed + compose + suka"`

---

## Task 5: Detail postingan + komentar

**Files:** Create `src/app/komunitas/[postId]/page.tsx`, `src/app/komunitas/[postId]/KomentarForm.tsx`

- [ ] **Step 1: KomentarForm (client)**
```tsx
// src/app/komunitas/[postId]/KomentarForm.tsx
'use client';
import { useState } from 'react';
import { buatKomentar } from '@/lib/data/komunitas-actions';

export default function KomentarForm({ postId }: { postId: string }) {
  const [teks, setTeks] = useState('');
  const [loading, setLoading] = useState(false);
  async function kirim() {
    if (!teks.trim()) return;
    setLoading(true);
    try { await buatKomentar(postId, teks); setTeks(''); } finally { setLoading(false); }
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <input className="kp-input" style={{ flex: 1, marginBottom: 0 }} placeholder="Tulis komentar..." value={teks} onChange={(e) => setTeks(e.target.value)} />
      <button className="kp-btn mint" onClick={kirim} disabled={loading}>{loading ? '...' : 'Kirim'}</button>
    </div>
  );
}
```

- [ ] **Step 2: Halaman detail**
```tsx
// src/app/komunitas/[postId]/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPostingan } from '@/lib/data/komunitas';
import KomentarForm from './KomentarForm';

export default async function DetailPost({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const post = await getPostingan(postId);
  if (!post) redirect('/komunitas');

  return (
    <main style={{ maxWidth: 480, margin: '20px auto', padding: 16 }}>
      <Link href="/komunitas" style={{ color: 'var(--abu)', fontSize: 13 }}>← komunitas</Link>
      <div className="kp-card" style={{ margin: '10px 0' }}>
        <b>{post.nama}</b>
        <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{post.teks}</p>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>KOMENTAR ({post.komentar.length})</div>
      {post.komentar.map((k) => (
        <div key={k.id} className="kp-card" style={{ marginBottom: 8, padding: 12 }}>
          <b style={{ fontSize: 13 }}>{k.nama}</b>
          <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{k.teks}</p>
        </div>
      ))}
      <KomentarForm postId={postId} />
    </main>
  );
}
```
- [ ] **Step 3:** `npx tsc --noEmit && npm run build` (route `/komunitas/[postId]` dinamis).
- [ ] **Step 4:** Commit `git add -A && git commit -m "feat(komunitas): detail postingan + komentar"`

---

## Task 6: Pintu masuk + nama tampilan

**Files:** Modify `src/app/pilih-anak/page.tsx`, `src/app/main/[anakId]/MenuAnak.tsx`, `src/app/pengaturan/page.tsx`, `src/app/pengaturan/PinForm.tsx` (atau form baru)

- [ ] **Step 1: pilih-anak** — tambah tautan "💬 Komunitas" → `/komunitas` (dekat tautan Pengaturan):
```tsx
      <p style={{ textAlign: 'center', marginTop: 6 }}><a href="/komunitas" style={{ color: 'var(--biru-d)', fontSize: 13 }}>💬 Komunitas</a></p>
```

- [ ] **Step 2: Kelas Bermain (MenuAnak layar 'kelas')** — tambah tombol "💬 Bagikan pengalaman" yang menavigasi ke `/komunitas?tema=<temaId>`:
```tsx
        {mingguIni && <a className="kp-btn putih" style={{ display: 'inline-block', marginTop: 8 }} href={`/komunitas?tema=${mingguIni.tema.id}`}>💬 Bagikan pengalaman</a>}
```
(letakkan di bawah tombol link/worksheet pada layar `kelas`.)

- [ ] **Step 3: Nama tampilan di Pengaturan** — buat komponen kecil client `NamaForm.tsx` di `src/app/pengaturan/` yang memanggil `setNamaTampilan`, dan render di halaman Pengaturan (bagian AKUN), prefilled dari `profiles.nama_tampilan`.
```tsx
// src/app/pengaturan/NamaForm.tsx
'use client';
import { useState } from 'react';
import { setNamaTampilan } from '@/lib/data/komunitas-actions';
export default function NamaForm({ awal }: { awal: string }) {
  const [nama, setNama] = useState(awal);
  const [msg, setMsg] = useState('');
  async function simpan() { setMsg(''); try { await setNamaTampilan(nama); setMsg('Tersimpan ✓'); } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); } }
  return (
    <div className="kp-card" style={{ marginTop: 8 }}>
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Nama tampilan di komunitas</label>
      <input className="kp-input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Bunda Arka" />
      {msg && <div style={{ fontSize: 13, color: msg.includes('✓') ? '#2e9e63' : '#c0392b', marginBottom: 8 }}>{msg}</div>}
      <button className="kp-btn mint" style={{ width: '100%' }} onClick={simpan}>Simpan Nama</button>
    </div>
  );
}
```
Di `pengaturan/page.tsx`: select `nama_tampilan` dari profiles, import & render `<NamaForm awal={prof?.nama_tampilan ?? ''} />` di bagian AKUN.

- [ ] **Step 4:** `npx tsc --noEmit && npm run build`.
- [ ] **Step 5:** Commit `git add -A && git commit -m "feat(komunitas): pintu masuk (pilih-anak, Kelas Bermain) + nama tampilan"`

---

## Task 7: Verifikasi + deploy

- [ ] **Step 1:** `npm test` → 30 hijau (tak ada test domain baru). `npm run build` → sukses; route `/komunitas` & `/komunitas/[postId]` dinamis.
- [ ] **Step 2: Smoke** (perlu migrasi 0010): login → Pengaturan set nama tampilan → /komunitas → tulis cerita (pilih tema) → muncul di feed → like → buka detail → komentar. Dari Mode Anak → Kelas Bermain → "Bagikan pengalaman" → /komunitas dgn tema terpilih.
- [ ] **Step 3:** `git push origin master` → auto-deploy → cek live.

---

## Definition of Done
- Ortu bisa **posting cerita/tips (teks)** (opsional terkait tema), **like**, & **komentar**; nama publik = **nama tampilan** (email tak tampil).
- Pintu masuk: tautan **Komunitas** di pilih-anak + tombol **"Bagikan pengalaman"** di Kelas Bermain.
- Bisa **hapus postingan/komentar sendiri**; RLS rapi.
- Build hijau, test hijau, ter-deploy.

## Catatan — Tahap 2 (spec terpisah)
- Tombol **Lapor** (tabel `laporan`) + **panel moderasi admin** (`/admin/komunitas`: lihat dilaporkan, Sembunyikan/Hapus).
- Sementara Tahap 1: keamanan = hapus milik sendiri + admin dapat hide/hapus via RLS (mis. lewat Supabase dashboard) bila darurat.
- Foto, mention, notifikasi = roadmap.
