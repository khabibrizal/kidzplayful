# KidzPlayful — M10b: Komunitas Tahap 2 (Lapor + Moderasi Admin) — Implementation Plan

> Pola subagent-driven. Lanjutan M10. Gaya `kp-*`.

**Goal:** Keamanan komunitas: ortu bisa **Lapor** postingan/komentar; **admin** punya panel `/admin/komunitas` untuk melihat yang dilaporkan + **Sembunyikan/Tampilkan/Hapus** postingan & komentar.

**Architecture:** Tabel `laporan` + policy admin-update untuk `komentar`. Aksi user `lapor()`; aksi admin (guard `is_admin`) moderasi. Panel di bawah `/admin` (sudah ada layout guard admin).

**Prasyarat:** M10 (komunitas) selesai & migrasi 0010 terpasang.

---

## Task 1: Migrasi laporan + policy

**Files:** Create `supabase/migrations/0011_komunitas_moderasi.sql`

- [ ] **Step 1:**
```sql
-- supabase/migrations/0011_komunitas_moderasi.sql
create table public.laporan (
  id uuid primary key default gen_random_uuid(),
  postingan_id uuid references public.postingan(id) on delete cascade,
  komentar_id uuid references public.komentar(id) on delete cascade,
  pelapor uuid not null references public.profiles(id) on delete cascade,
  alasan text,
  created_at timestamptz not null default now()
);
create index laporan_created_idx on public.laporan(created_at desc);

alter table public.laporan enable row level security;
create policy "lapor insert sendiri" on public.laporan
  for insert to authenticated with check (pelapor = auth.uid());
create policy "admin baca laporan" on public.laporan
  for select to authenticated using (public.is_admin());
create policy "admin hapus laporan" on public.laporan
  for delete to authenticated using (public.is_admin());

-- admin boleh sembunyikan/tampilkan komentar (update status)
create policy "admin update komentar" on public.komentar
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
```
- [ ] **Step 2:** Terapkan (Dashboard SQL Editor / `supabase db push`).
- [ ] **Step 3:** Commit `git add -A && git commit -m "feat(db): laporan komunitas + admin update komentar"`

---

## Task 2: Aksi lapor (user) + aksi moderasi (admin)

**Files:** Modify `src/lib/data/komunitas-actions.ts`; Create `src/lib/data/admin-komunitas.ts`

- [ ] **Step 1:** Tambah `lapor` di `komunitas-actions.ts`:
```ts
export async function lapor(input: { postinganId?: string; komentarId?: string; alasan: string }) {
  const { supabase, userId } = await sesi();
  const { error } = await supabase.from('laporan').insert({
    postingan_id: input.postinganId ?? null,
    komentar_id: input.komentarId ?? null,
    pelapor: userId,
    alasan: input.alasan?.trim() || null,
  });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2:** Buat `src/lib/data/admin-komunitas.ts`:
```ts
// src/lib/data/admin-komunitas.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_admin').single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return supabase;
}

export async function moderasiPostingan(id: string, status: 'tampil' | 'disembunyikan') {
  const supabase = await adminDb();
  const { error } = await supabase.from('postingan').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/komunitas'); revalidatePath('/komunitas');
}
export async function hapusPostinganAdmin(id: string) {
  const supabase = await adminDb();
  const { error } = await supabase.from('postingan').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/komunitas'); revalidatePath('/komunitas');
}
export async function moderasiKomentar(id: string, status: 'tampil' | 'disembunyikan') {
  const supabase = await adminDb();
  const { error } = await supabase.from('komentar').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/komunitas');
}
export async function hapusKomentarAdmin(id: string) {
  const supabase = await adminDb();
  const { error } = await supabase.from('komentar').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/komunitas');
}
export async function tuntaskanLaporan(id: string) {
  const supabase = await adminDb();
  await supabase.from('laporan').delete().eq('id', id);
  revalidatePath('/admin/komunitas');
}
```
- [ ] **Step 3:** `npx tsc --noEmit`.
- [ ] **Step 4:** Commit `git add -A && git commit -m "feat(komunitas): aksi lapor + aksi moderasi admin"`

---

## Task 3: Tombol Lapor di feed & komentar

**Files:** Create `src/app/komunitas/LaporBtn.tsx`; Modify `src/app/komunitas/page.tsx`, `src/app/komunitas/[postId]/page.tsx`

- [ ] **Step 1: LaporBtn (client)**
```tsx
// src/app/komunitas/LaporBtn.tsx
'use client';
import { useState } from 'react';
import { lapor } from '@/lib/data/komunitas-actions';

export default function LaporBtn({ postinganId, komentarId }: { postinganId?: string; komentarId?: string }) {
  const [done, setDone] = useState(false);
  async function klik() {
    const alasan = window.prompt('Laporkan konten ini? Tulis alasan (opsional):');
    if (alasan === null) return; // batal
    try { await lapor({ postinganId, komentarId, alasan }); setDone(true); }
    catch { /* diam */ }
  }
  if (done) return <span style={{ color: 'var(--abu)', fontSize: 12 }}>dilaporkan ✓</span>;
  return <button onClick={klik} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--abu)', fontSize: 12, fontFamily: 'inherit' }}>Lapor</button>;
}
```

- [ ] **Step 2:** Di `komunitas/page.tsx` (feed), tambahkan `<LaporBtn postinganId={p.id} />` di baris aksi tiap postingan (di samping like & komentar). Import `LaporBtn`.

- [ ] **Step 3:** Di `komunitas/[postId]/page.tsx`, tambahkan `<LaporBtn postinganId={post.id} />` di kartu post, dan `<LaporBtn komentarId={k.id} />` di tiap komentar. Import `LaporBtn`.

- [ ] **Step 4:** `npx tsc --noEmit && npx eslint src/app/komunitas 2>&1 | tail -10 && npm run build`.
- [ ] **Step 5:** Commit `git add -A && git commit -m "feat(komunitas): tombol Lapor di postingan & komentar"`

---

## Task 4: Panel moderasi admin /admin/komunitas

**Files:** Create `src/app/admin/komunitas/page.tsx`; Modify `src/app/admin/page.tsx` (nav)

- [ ] **Step 1: Halaman**
```tsx
// src/app/admin/komunitas/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { moderasiPostingan, hapusPostinganAdmin, moderasiKomentar, hapusKomentarAdmin, tuntaskanLaporan } from '@/lib/data/admin-komunitas';
import s from '../admin.module.css';

export default async function AdminKomunitas() {
  const supabase = await createClient();
  const { data: laporan } = await supabase
    .from('laporan')
    .select('id,alasan,created_at,postingan:postingan_id(id,nama,teks,status),komentar:komentar_id(id,nama,teks,status)')
    .order('created_at', { ascending: false });
  const { data: posts } = await supabase
    .from('postingan').select('id,nama,teks,status,created_at').order('created_at', { ascending: false }).limit(50);

  async function aPostStatus(fd: FormData) { 'use server'; await moderasiPostingan(String(fd.get('id')), fd.get('status') === 'tampil' ? 'tampil' : 'disembunyikan'); }
  async function aPostHapus(fd: FormData) { 'use server'; await hapusPostinganAdmin(String(fd.get('id'))); }
  async function aKomStatus(fd: FormData) { 'use server'; await moderasiKomentar(String(fd.get('id')), fd.get('status') === 'tampil' ? 'tampil' : 'disembunyikan'); }
  async function aKomHapus(fd: FormData) { 'use server'; await hapusKomentarAdmin(String(fd.get('id'))); }
  async function aTuntas(fd: FormData) { 'use server'; await tuntaskanLaporan(String(fd.get('id'))); }

  function pick<T>(v: T | T[] | null): T | null { return Array.isArray(v) ? (v[0] ?? null) : (v ?? null); }

  return (
    <div>
      <Link href="/admin" className={s.muted}>← dashboard</Link>
      <div className={s.section}>Dilaporkan ({laporan?.length ?? 0})</div>
      {(laporan ?? []).map((l) => {
        const post = pick(l.postingan as unknown); const kom = pick(l.komentar as unknown);
        const t = (post ?? kom) as { id: string; nama: string; teks: string; status: string } | null;
        const isPost = !!post;
        return (
          <div key={l.id} className={s.card}>
            <div className={s.muted}>{isPost ? 'Postingan' : 'Komentar'} · oleh {t?.nama} · status: {t?.status}</div>
            <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{t?.teks}</p>
            {l.alasan && <div className={s.muted}>Alasan: {l.alasan}</div>}
            <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap' }}>
              {t && isPost && <form action={aPostStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value={t.status === 'tampil' ? 'sembunyi' : 'tampil'} /><button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>{t.status === 'tampil' ? 'Sembunyikan' : 'Tampilkan'}</button></form>}
              {t && isPost && <form action={aPostHapus}><input type="hidden" name="id" value={t.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>}
              {t && !isPost && <form action={aKomStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value={t.status === 'tampil' ? 'sembunyi' : 'tampil'} /><button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>{t.status === 'tampil' ? 'Sembunyikan' : 'Tampilkan'}</button></form>}
              {t && !isPost && <form action={aKomHapus}><input type="hidden" name="id" value={t.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>}
              <form action={aTuntas}><input type="hidden" name="id" value={l.id} /><button className={s.btnSm} style={{ background: '#e6f7ee', color: '#2e9e63' }}>Selesai (tutup laporan)</button></form>
            </div>
          </div>
        );
      })}
      {(laporan ?? []).length === 0 && <p className={s.muted}>Tidak ada laporan. 🎉</p>}

      <div className={s.section}>Postingan terbaru ({posts?.length ?? 0})</div>
      {(posts ?? []).map((p) => (
        <div key={p.id} className={s.card}>
          <div className={s.muted}>{p.nama} · status: {p.status}</div>
          <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{p.teks}</p>
          <div className={s.row} style={{ marginTop: 6 }}>
            <form action={aPostStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={p.status === 'tampil' ? 'sembunyi' : 'tampil'} /><button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>{p.status === 'tampil' ? 'Sembunyikan' : 'Tampilkan'}</button></form>
            <form action={aPostHapus}><input type="hidden" name="id" value={p.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
```
> Catatan: `aPostStatus`/`aKomStatus` membaca `fd.get('status')` — kirim `'tampil'` untuk menampilkan, selain itu disembunyikan. Di markup, nilai hidden `status` = aksi yang DIINGINKAN: jika sekarang 'tampil' kirim 'sembunyi' (→ disembunyikan), jika tidak kirim 'tampil'.

- [ ] **Step 2: Nav** — di `src/app/admin/page.tsx` tambah tautan "💬 Komunitas" → `/admin/komunitas` (dekat tautan nav admin lain).

- [ ] **Step 3:** `npx tsc --noEmit && npx eslint src/app/admin 2>&1 | tail -15 && npm run build` → route `/admin/komunitas` dinamis.
- [ ] **Step 4:** Commit `git add -A && git commit -m "feat(admin): panel moderasi komunitas (sembunyikan/hapus + laporan)"`

---

## Task 5: Verifikasi + deploy

- [ ] **Step 1:** `npm test` → 30 hijau. `npm run build` → sukses.
- [ ] **Step 2: Smoke** (migrasi 0011): /komunitas → Lapor sebuah postingan → /admin/komunitas → muncul di "Dilaporkan" → Sembunyikan → hilang dari feed publik → Selesai (tutup laporan).
- [ ] **Step 3:** `git push origin master` → auto-deploy.

---

## Definition of Done
- Ortu bisa **Lapor** postingan & komentar (alasan opsional).
- Admin `/admin/komunitas`: lihat **laporan** + postingan terbaru → **Sembunyikan/Tampilkan/Hapus** postingan & komentar, tutup laporan.
- Konten disembunyikan tidak tampil di feed publik (RLS `status='tampil'`).
- Build hijau, test hijau, ter-deploy.

## Catatan
- Notifikasi ke pelapor / auto-hide setelah N laporan = roadmap.
