# KidzPlayful — M12: Registrasi (nama/WA), Sapaan, Logout Admin, Favorit — Implementation Plan

> Pola subagent-driven.

**Goal (6 item):**
1. Form registrasi: tambah **Nama** & **No WhatsApp**.
2. Setelah login tampilkan **"Hai Kak {nama}"** di dashboard.
3. Tombol **Logout** di halaman admin.
4. **Hapus** tautan "Panel Admin" di dashboard user.
5. **Ikon favorit** (❤️) di list Kelas Bermain (Mode Anak) — toggle.
6. **Bagian Favorit** di **atas** dashboard user (daftar kelas bermain favorit).

**Architecture:** Tambah kolom `profiles.no_wa` + tabel `favorit(ortu_id,kelas_id)`. Favorit per **ortu** (akun). Toggle via Server Action. Mode Anak list & dashboard membaca favorit. Halaman detail kelas mandiri `/kelas/[id]` agar favorit di dashboard bisa dibuka.

**Prasyarat:** M11 (kelas_bermain) selesai.

---

## Task 1: Migrasi
**Files:** Create `supabase/migrations/0015_favorit.sql`
```sql
-- supabase/migrations/0015_favorit.sql
alter table public.profiles add column if not exists no_wa text;

create table public.favorit (
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  kelas_id uuid not null references public.kelas_bermain(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ortu_id, kelas_id)
);
alter table public.favorit enable row level security;
create policy "favorit milik sendiri" on public.favorit
  for all to authenticated using (ortu_id = auth.uid()) with check (ortu_id = auth.uid());
```
- [ ] Terapkan di SQL Editor. Commit.

---

## Task 2: Data + Server Action favorit
**Files:** Create `src/lib/data/favorit.ts`, `src/lib/data/favorit-actions.ts`
```ts
// src/lib/data/favorit.ts
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';
const COLS = 'id,judul,aktivitas,bahan,cara_membuat,langkah,link_ide,worksheet_url,status';

export async function getFavoritIds(): Promise<string[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s.from('favorit').select('kelas_id').eq('ortu_id', user.id);
  return (data ?? []).map((x) => x.kelas_id as string);
}
export async function getFavoritKelas(): Promise<KelasBermain[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data } = await s.from('favorit').select(`kelas:kelas_id(${COLS})`).eq('ortu_id', user.id);
  return (data ?? []).map((r) => (Array.isArray(r.kelas) ? r.kelas[0] : r.kelas)).filter((k) => k && k.status === 'aktif') as unknown as KelasBermain[];
}
```
```ts
// src/lib/data/favorit-actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function toggleFavorit(kelasId: string): Promise<boolean> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: ada } = await s.from('favorit').select('kelas_id').eq('ortu_id', user.id).eq('kelas_id', kelasId).maybeSingle();
  if (ada) await s.from('favorit').delete().eq('ortu_id', user.id).eq('kelas_id', kelasId);
  else await s.from('favorit').insert({ ortu_id: user.id, kelas_id: kelasId });
  revalidatePath('/pilih-anak');
  return !ada; // true = sekarang favorit
}
```
- [ ] `npx tsc --noEmit`. Commit.

---

## Task 3: Registrasi — Nama & No WA
**Files:** Modify `src/app/daftar/page.tsx`
- [ ] Tambah state `nama`, `noWa`; dua input baru (Nama, No WhatsApp) sebelum tombol. Setelah `signUp` sukses (sebelum redirect), simpan ke profil:
```tsx
const { data: { user } } = await supabase.auth.getUser();
if (user) await supabase.from('profiles').update({ nama_tampilan: nama.trim() || null, no_wa: noWa.trim() || null }).eq('id', user.id);
```
- [ ] `npx tsc --noEmit && npm run build`. Commit.

---

## Task 4: Sapaan "Hai Kak {nama}" + hapus tautan Panel Admin
**Files:** Modify `src/app/pilih-anak/page.tsx`
- [ ] Baca nama: `const { data: prof } = await supabase.from('profiles').select('nama_tampilan').eq('id', user.id).single();` lalu ganti judul `Halo, Bunda 👋` menjadi `Hai Kak {prof?.nama_tampilan || 'Kakak'} 👋`.
- [ ] **Hapus** baris tautan "🛠️ Panel Admin".
- [ ] `npx tsc --noEmit && npm run build`. Commit.

---

## Task 5: Logout di Admin
**Files:** Create `src/app/admin/LogoutBtn.tsx`; Modify `src/app/admin/layout.tsx`
```tsx
// src/app/admin/LogoutBtn.tsx
'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
export default function LogoutBtn() {
  const router = useRouter();
  async function keluar() { const s = createClient(); await s.auth.signOut(); router.push('/login'); router.refresh(); }
  return <button onClick={keluar} className={'kp-btn'} style={{ padding: '7px 14px', fontSize: 13, background: '#f3f3f8', color: 'var(--tinta)', boxShadow: '0 3px 0 #e2d8f3' }}>Keluar</button>;
}
```
- [ ] Di `admin/layout.tsx` header, tambah `<LogoutBtn />` di samping email. `npx tsc --noEmit`. Commit.

---

## Task 6: Halaman detail kelas mandiri `/kelas/[id]`
**Files:** Create `src/app/kelas/[id]/page.tsx`
- [ ] Server Component (guard login): ambil kelas (`from('kelas_bermain').select(...).eq('id',id).eq('status','aktif').maybeSingle()`); render Judul/Aktivitas/Bahan/Cara/Langkah/Link/Worksheet (kp-card). Tautan ← kembali ke /pilih-anak. Bila tak ada → redirect /pilih-anak.
- [ ] `npx tsc --noEmit && npm run build`. Commit.

---

## Task 7: Ikon favorit di Mode Anak + Bagian Favorit di dashboard
**Files:** Create `src/components/FavoritBtn.tsx`; Modify `src/app/main/[anakId]/page.tsx`, `src/app/main/[anakId]/MenuAnak.tsx`, `src/app/pilih-anak/page.tsx`
```tsx
// src/components/FavoritBtn.tsx
'use client';
import { useState, useTransition } from 'react';
import { toggleFavorit } from '@/lib/data/favorit-actions';
export default function FavoritBtn({ kelasId, awal }: { kelasId: string; awal: boolean }) {
  const [fav, setFav] = useState(awal);
  const [pending, start] = useTransition();
  function klik(e: React.MouseEvent) {
    e.stopPropagation();
    setFav(!fav);
    start(() => { toggleFavorit(kelasId).catch(() => setFav(fav)); });
  }
  return <button onClick={klik} disabled={pending} aria-label="Favorit" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>{fav ? '❤️' : '🤍'}</button>;
}
```
- [ ] **main/[anakId]/page.tsx**: import `getFavoritIds`; `const favIds = await getFavoritIds();` kirim prop `favIds={favIds}` ke MenuAnak.
- [ ] **MenuAnak.tsx**: prop `favIds: string[]`. Di layar 'kelas' (daftar), tiap item: ubah dari `<button kp-tile>` menjadi `<div className="kp-tile ...">` (agar boleh berisi tombol favorit) dengan `onClick` membuka detail; di ujung kanan taruh `<FavoritBtn kelasId={k.id} awal={favIds.includes(k.id)} />`. (Tombol favorit pakai `e.stopPropagation` agar tak ikut membuka detail.)
- [ ] **pilih-anak/page.tsx**: import `getFavoritKelas`; `const favorit = await getFavoritKelas();` tampilkan **di ATAS** (sebelum profil anak) bagian "❤️ Kelas Bermain Favorit" — daftar kartu judul, tiap kartu `<a href={`/kelas/${k.id}`}>`. Bila kosong, sembunyikan bagian.
- [ ] `npx tsc --noEmit && npm run build`. Commit.

---

## Task 8: Verifikasi + deploy
- [ ] `npm test` → 30 hijau. `npm run build` → sukses.
- [ ] `git push origin master` → auto-deploy.

## Definition of Done
- Registrasi simpan Nama & No WA; dashboard sapa "Hai Kak {nama}"; admin punya tombol Logout; tautan Panel Admin di dashboard user dihapus; favorit (❤️) bisa di-toggle di list Kelas Bermain & muncul di atas dashboard; detail kelas bisa dibuka via `/kelas/[id]`.
- Build & test hijau, ter-deploy.

## Catatan
- Favorit = per akun ortu (bukan per anak).
- `no_wa` berguna juga untuk konfirmasi pembayaran/komunikasi.
