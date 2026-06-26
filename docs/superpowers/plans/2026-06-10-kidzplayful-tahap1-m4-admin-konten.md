# KidzPlayful — Tahap 1 / Milestone 4: Admin Konten (CRUD manual, tanpa AI) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: pola subagent-driven (satu subagent per task, review di antara). Langkah memakai checkbox `- [ ]`.

**Goal:** Panel Owner di `/admin` untuk mengelola konten **tanpa SQL & tanpa AI**: buat/edit/hapus **Tema**, atur **Paket Game** (isi soal dari worksheet, per mesin), kelola **Video** (link YouTube), dan tetapkan **"Minggu Ini"** + status draf/disetujui. Akses dibatasi ke akun admin.

**Architecture:** Lanjutan M1–M3. Tambah kolom `is_admin` di `profiles` + RLS tulis konten khusus admin. Halaman admin = Server Components (baca) + Server Actions (tulis). Editor paket = form terstruktur per mesin yang menyusun JSON `butir` (berbasis emoji/teks, selaras engine yang ada). Tanpa AI, tanpa upload file (Storage menyusul di roadmap).

**Tech Stack:** Next.js 16, TypeScript, Supabase, Vitest, Playwright.

**Prasyarat:** M1–M3 selesai (auth, Mode Anak, pustaka, migrasi 0001–0003). Acuan spec: §5.2b (produksi konten manual), §8.3 (alur owner), §12 (layar admin), §15 (ERD).

---

## File Structure (Milestone ini)

| File | Tanggung jawab |
|---|---|
| `supabase/migrations/0004_admin.sql` | `profiles.is_admin` + RLS tulis tema/paket_aset/video utk admin |
| `src/lib/data/admin.ts` | `getAdminTerjamin()` (guard admin) |
| `src/lib/game/butir.ts` (+test) | bangun & validasi JSON `butir` per mesin dari input form |
| `src/lib/data/admin-konten.ts` | server actions CRUD tema/paket/video + setMingguIni |
| `src/app/admin/layout.tsx` | guard + kerangka nav admin |
| `src/app/admin/page.tsx` | dashboard: daftar tema + tombol kelola |
| `src/app/admin/tema-baru/actions.ts` | (dipakai page) — opsional gabung |
| `src/app/admin/tema/[id]/page.tsx` | kelola 1 tema: paket + video + pengaturan |
| `src/app/admin/tema/[id]/PaketForm.tsx` | form tambah/edit paket per mesin |
| `src/app/admin/tema/[id]/VideoForm.tsx` | form tambah video |
| `src/app/admin/admin.module.css` | gaya panel admin |
| `tests/e2e/admin-guard.spec.ts` | e2e: non-admin ditolak dari /admin |

---

## Task 1: Migrasi admin (is_admin + RLS tulis)

**Files:**
- Create: `supabase/migrations/0004_admin.sql`

- [ ] **Step 1: Tulis migrasi**

```sql
-- supabase/migrations/0004_admin.sql
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- helper: apakah user saat ini admin
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- RLS tulis konten: hanya admin (baca tetap dari kebijakan lama 'disetujui')
create policy "admin kelola tema" on public.tema
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin kelola paket" on public.paket_aset
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin kelola video" on public.video
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- admin juga boleh baca draf (kebijakan baca lama hanya 'disetujui')
create policy "admin baca semua tema" on public.tema
  for select to authenticated using (public.is_admin());
create policy "admin baca semua paket" on public.paket_aset
  for select to authenticated using (public.is_admin());
create policy "admin baca semua video" on public.video
  for select to authenticated using (public.is_admin());
```

- [ ] **Step 2: Terapkan migrasi**

Run (CLI/Dashboard SQL Editor):
```bash
cd /d/kidzplayful && supabase db push
```
Expected: kolom `is_admin` ada; fungsi `is_admin()` ada; 6 policy baru.

- [ ] **Step 3: Jadikan akun Anda admin (sekali)**

Di Supabase SQL Editor, jalankan (ganti email dengan email login Anda):
```sql
update public.profiles set is_admin = true where email = 'EMAIL_ANDA';
```
Expected: 1 row updated. Verifikasi: `select email,is_admin from public.profiles where is_admin;`

- [ ] **Step 4: Commit**

```bash
cd /d/kidzplayful && git add -A && git commit -m "feat(db): is_admin + RLS tulis konten utk admin"
```

---

## Task 2: Guard admin

**Files:**
- Create: `src/lib/data/admin.ts`

- [ ] **Step 1: Tulis guard**

```ts
// src/lib/data/admin.ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function getAdminTerjamin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await supabase.from('profiles').select('email,is_admin').single();
  if (!prof?.is_admin) redirect('/pilih-anak');
  return { id: user.id, email: prof.email };
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(admin): guard getAdminTerjamin"
```

---

## Task 3: Bangun & validasi butir per mesin (logika murni)

**Files:**
- Create: `src/lib/game/butir.ts`
- Test: `src/lib/game/__tests__/butir.test.ts`

- [ ] **Step 1: Tulis test gagal**

```ts
// src/lib/game/__tests__/butir.test.ts
import { describe, it, expect } from 'vitest';
import { butirDariForm, validasiButir } from '../butir';

describe('butirDariForm tekan-sesuai', () => {
  it('membentuk struktur soal', () => {
    const b = butirDariForm('tekan-sesuai', {
      soal: [{ tanya: 'kucing', benar: '🐱', salah: ['🐶', '🐮', '🐰'] }],
    });
    expect(b).toEqual({ soal: [{ tanya: 'kucing', benar: '🐱', salah: ['🐶', '🐮', '🐰'] }] });
  });
});

describe('validasiButir', () => {
  it('tekan-sesuai butuh >=1 soal lengkap', () => {
    expect(validasiButir('tekan-sesuai', { soal: [] })).toMatch(/minimal/i);
    expect(validasiButir('tekan-sesuai', { soal: [{ tanya: 'a', benar: '🐱', salah: ['🐶'] }] })).toBe('');
  });
  it('seret-wadah butuh wadah & benda', () => {
    expect(validasiButir('seret-wadah', { wadah: [], benda: [] })).toMatch(/wadah/i);
  });
  it('cari-pasangan butuh >=2 pasangan', () => {
    expect(validasiButir('cari-pasangan', { pasangan: ['🐱'] })).toMatch(/pasangan/i);
    expect(validasiButir('cari-pasangan', { pasangan: ['🐱', '🐶'] })).toBe('');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd /d/kidzplayful && npx vitest run src/lib/game/__tests__/butir.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

```ts
// src/lib/game/butir.ts
import type { Mesin, DataTekan, DataSeret, DataCocok } from './tipe';

export function butirDariForm(mesin: Mesin, form: unknown): DataTekan | DataSeret | DataCocok {
  // form sudah berbentuk objek sesuai mesin; fungsi ini titik normalisasi tunggal
  if (mesin === 'tekan-sesuai') return form as DataTekan;
  if (mesin === 'seret-wadah') return form as DataSeret;
  return form as DataCocok;
}

export function validasiButir(mesin: Mesin, butir: unknown): string {
  if (mesin === 'tekan-sesuai') {
    const b = butir as DataTekan;
    if (!b.soal?.length) return 'Minimal 1 soal.';
    for (const s of b.soal) {
      if (!s.tanya?.trim() || !s.benar?.trim() || !s.salah?.length) return 'Tiap soal butuh pertanyaan, jawaban benar, dan minimal 1 pengecoh.';
    }
    return '';
  }
  if (mesin === 'seret-wadah') {
    const b = butir as DataSeret;
    if (!b.wadah?.length || !b.benda?.length) return 'Butuh minimal 1 wadah dan 1 benda.';
    return '';
  }
  const b = butir as DataCocok;
  if (!b.pasangan || b.pasangan.length < 2) return 'Butuh minimal 2 pasangan.';
  return '';
}
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `cd /d/kidzplayful && npx vitest run src/lib/game/__tests__/butir.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(game): bangun & validasi butir per mesin + tests"
```

---

## Task 4: Server actions CRUD konten

**Files:**
- Create: `src/lib/data/admin-konten.ts`

- [ ] **Step 1: Tulis server actions**

```ts
// src/lib/data/admin-konten.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Mesin } from '@/lib/game/tipe';
import { validasiButir } from '@/lib/game/butir';

async function db() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_admin').single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return supabase;
}

export async function buatTema(nama: string, sampul: string) {
  const supabase = await db();
  if (!nama.trim()) throw new Error('Nama tema wajib diisi.');
  const { error } = await supabase.from('tema').insert({ nama: nama.trim(), sampul: sampul.trim() || '🎈', status: 'draf' });
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function hapusTema(id: string) {
  const supabase = await db();
  const { error } = await supabase.from('tema').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function setStatusTema(id: string, status: 'draf' | 'disetujui') {
  const supabase = await db();
  const { error } = await supabase.from('tema').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin'); revalidatePath(`/admin/tema/${id}`);
}

export async function setMingguIni(id: string) {
  const supabase = await db();
  await supabase.from('tema').update({ is_minggu_ini: false }).neq('id', id); // hanya 1 minggu ini
  const { error } = await supabase.from('tema').update({ is_minggu_ini: true, status: 'disetujui' }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin'); revalidatePath(`/admin/tema/${id}`);
}

export async function buatPaket(input: {
  temaId: string; mesin: Mesin; judul: string; areaSkill: string; usiaMin: number; usiaMax: number; butir: unknown;
}) {
  const supabase = await db();
  const err = validasiButir(input.mesin, input.butir);
  if (err) throw new Error(err);
  const { error } = await supabase.from('paket_aset').insert({
    tema_id: input.temaId, mesin: input.mesin, judul: input.judul.trim() || 'Game',
    area_skill: input.areaSkill, usia_min: input.usiaMin, usia_max: input.usiaMax,
    sumber: 'manual', status: 'disetujui', butir: input.butir,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tema/${input.temaId}`);
}

export async function hapusPaket(id: string, temaId: string) {
  const supabase = await db();
  const { error } = await supabase.from('paket_aset').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tema/${temaId}`);
}

export async function buatVideo(input: { temaId: string; judul: string; youtubeId: string; durasiDetik: number }) {
  const supabase = await db();
  const yid = ekstrakYoutubeId(input.youtubeId);
  if (!yid) throw new Error('Link/ID YouTube tidak valid.');
  const { error } = await supabase.from('video').insert({
    tema_id: input.temaId, judul: input.judul.trim() || 'Video', youtube_id: yid,
    durasi_detik: input.durasiDetik || 0, status: 'disetujui', link_ok: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tema/${input.temaId}`);
}

export async function hapusVideo(id: string, temaId: string) {
  const supabase = await db();
  const { error } = await supabase.from('video').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tema/${input.temaId ?? ''}`); revalidatePath(`/admin/tema/${temaId}`);
}

export function ekstrakYoutubeId(s: string): string | null {
  const t = s.trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const m = t.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}
```

> Catatan: `hapusVideo` cukup `revalidatePath(\`/admin/tema/${temaId}\`)`; baris `input.temaId` adalah sisa — hapus saat menulis (gunakan hanya parameter `temaId`).

- [ ] **Step 2: Perbaiki `hapusVideo`** agar bersih:

```ts
export async function hapusVideo(id: string, temaId: string) {
  const supabase = await db();
  const { error } = await supabase.from('video').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tema/${temaId}`);
}
```

- [ ] **Step 3: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(admin): server actions CRUD tema/paket/video"
```

---

## Task 5: Gaya admin + layout (guard)

**Files:**
- Create: `src/app/admin/admin.module.css`, `src/app/admin/layout.tsx`

- [ ] **Step 1: CSS**

```css
/* src/app/admin/admin.module.css */
.wrap { max-width: 760px; margin: 0 auto; padding: 20px 16px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.head h1 { color: var(--lavender-d); font-size: 22px; }
.card { background: #fff; border: 1px solid #eee; border-radius: 14px; padding: 14px; margin-bottom: 10px; box-shadow: 0 4px 14px rgba(120,90,180,.06); }
.row { display: flex; gap: 10px; align-items: center; }
.inp { background: #f3f3f8; border: none; border-radius: 10px; padding: 10px; font-family: inherit; font-size: 14px; }
.btn { border: none; cursor: pointer; font-family: inherit; font-weight: 700; border-radius: 10px; padding: 9px 14px; color: #fff; background: var(--lavender-d); }
.btnSm { font-size: 12px; padding: 6px 10px; border-radius: 8px; border: none; cursor: pointer; font-family: inherit; }
.tag { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 99px; }
.tagOk { background: #e6f7ee; color: #2e9e63; }
.tagDraf { background: #fff3d6; color: #b88600; }
.tagNow { background: var(--mint-d); color: #fff; }
.danger { background: #fde8e8; color: #d35050; }
.muted { color: var(--abu); font-size: 12px; }
.section { font-size: 12px; font-weight: 700; color: var(--abu); text-transform: uppercase; margin: 16px 0 6px; }
```

- [ ] **Step 2: Layout dengan guard**

```tsx
// src/app/admin/layout.tsx
import { getAdminTerjamin } from '@/lib/data/admin';
import s from './admin.module.css';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminTerjamin();
  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <h1>🛠️ Admin KidzPlayful</h1>
        <span className={s.muted}>{admin.email}</span>
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(admin): layout + guard + css"
```

---

## Task 6: Dashboard admin (daftar tema + buat tema + set minggu ini)

**Files:**
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Tulis halaman**

```tsx
// src/app/admin/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { buatTema, setMingguIni, hapusTema } from '@/lib/data/admin-konten';
import s from './admin.module.css';

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: tema } = await supabase
    .from('tema').select('id,nama,sampul,status,is_minggu_ini').order('created_at', { ascending: false });

  async function aksiBuat(formData: FormData) {
    'use server';
    await buatTema(String(formData.get('nama') ?? ''), String(formData.get('sampul') ?? ''));
  }
  async function aksiMinggu(formData: FormData) {
    'use server';
    await setMingguIni(String(formData.get('id')));
  }
  async function aksiHapus(formData: FormData) {
    'use server';
    await hapusTema(String(formData.get('id')));
  }

  return (
    <div>
      <div className={s.section}>Tambah Tema</div>
      <form action={aksiBuat} className={s.card}>
        <div className={s.row}>
          <input className={s.inp} name="sampul" placeholder="🎈" maxLength={4} style={{ width: 70, textAlign: 'center' }} />
          <input className={s.inp} name="nama" placeholder="Nama tema (mis. Kendaraan)" style={{ flex: 1 }} required />
          <button className={s.btn} type="submit">+ Buat</button>
        </div>
      </form>

      <div className={s.section}>Tema ({tema?.length ?? 0})</div>
      {(tema ?? []).map((t) => (
        <div key={t.id} className={s.card}>
          <div className={s.row}>
            <span style={{ fontSize: 26 }}>{t.sampul}</span>
            <Link href={`/admin/tema/${t.id}`} style={{ flex: 1, fontWeight: 700, color: 'var(--tinta)' }}>{t.nama}</Link>
            <span className={`${s.tag} ${t.status === 'disetujui' ? s.tagOk : s.tagDraf}`}>{t.status}</span>
            {t.is_minggu_ini && <span className={`${s.tag} ${s.tagNow}`}>Minggu Ini</span>}
          </div>
          <div className={s.row} style={{ marginTop: 8 }}>
            <Link href={`/admin/tema/${t.id}`} className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>Kelola</Link>
            {!t.is_minggu_ini && (
              <form action={aksiMinggu}><input type="hidden" name="id" value={t.id} /><button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }}>Jadikan Minggu Ini</button></form>
            )}
            <form action={aksiHapus}><input type="hidden" name="id" value={t.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi tipe & build**

Run: `cd /d/kidzplayful && npx tsc --noEmit && npm run build`
Expected: bersih + build sukses; route `/admin` dinamis.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(admin): dashboard tema (buat/minggu-ini/hapus)"
```

---

## Task 7: Form Paket per mesin (client)

**Files:**
- Create: `src/app/admin/tema/[id]/PaketForm.tsx`

- [ ] **Step 1: Tulis form**

```tsx
// src/app/admin/tema/[id]/PaketForm.tsx
'use client';
import { useState } from 'react';
import type { Mesin } from '@/lib/game/tipe';
import { buatPaket } from '@/lib/data/admin-konten';
import s from '../../admin.module.css';

const AREA: Record<Mesin, string> = { 'tekan-sesuai': 'kognitif', 'seret-wadah': 'motorik-halus', 'cari-pasangan': 'kognitif' };

export default function PaketForm({ temaId }: { temaId: string }) {
  const [mesin, setMesin] = useState<Mesin>('tekan-sesuai');
  const [judul, setJudul] = useState('Mana Ya?');
  const [err, setErr] = useState('');

  // tekan-sesuai
  const [soal, setSoal] = useState([{ tanya: '', benar: '', salah: '' }]);
  // seret-wadah
  const [wadah, setWadah] = useState([{ kategori: '', label: '', emoji: '' }]);
  const [benda, setBenda] = useState([{ emoji: '', kategori: '' }]);
  // cari-pasangan
  const [pasangan, setPasangan] = useState('');

  async function simpan() {
    setErr('');
    let butir: unknown;
    if (mesin === 'tekan-sesuai') {
      butir = { soal: soal.filter((x) => x.tanya && x.benar).map((x) => ({ tanya: x.tanya.trim(), benar: x.benar.trim(), salah: x.salah.split(/\s+/).filter(Boolean) })) };
    } else if (mesin === 'seret-wadah') {
      butir = { wadah: wadah.filter((w) => w.kategori && w.emoji), benda: benda.filter((b) => b.emoji && b.kategori) };
    } else {
      butir = { pasangan: pasangan.split(/\s+/).filter(Boolean) };
    }
    try {
      await buatPaket({ temaId, mesin, judul, areaSkill: AREA[mesin], usiaMin: 2, usiaMax: 5, butir });
      location.reload();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal menyimpan'); }
  }

  return (
    <div className={s.card}>
      <div className={s.row}>
        <select className={s.inp} value={mesin} onChange={(e) => setMesin(e.target.value as Mesin)}>
          <option value="tekan-sesuai">Mana Ya? (tekan)</option>
          <option value="seret-wadah">Beres-Beres (seret)</option>
          <option value="cari-pasangan">Cari Pasangan (cocok)</option>
        </select>
        <input className={s.inp} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul game" style={{ flex: 1 }} />
      </div>

      {mesin === 'tekan-sesuai' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Tiap soal: pertanyaan, emoji benar, lalu emoji pengecoh (pisah spasi).</div>
          {soal.map((x, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6 }}>
              <input className={s.inp} placeholder="kucing" value={x.tanya} onChange={(e) => setSoal(soal.map((y, j) => j === i ? { ...y, tanya: e.target.value } : y))} style={{ flex: 1 }} />
              <input className={s.inp} placeholder="🐱" value={x.benar} onChange={(e) => setSoal(soal.map((y, j) => j === i ? { ...y, benar: e.target.value } : y))} style={{ width: 70 }} />
              <input className={s.inp} placeholder="🐶 🐮 🐰" value={x.salah} onChange={(e) => setSoal(soal.map((y, j) => j === i ? { ...y, salah: e.target.value } : y))} style={{ flex: 1 }} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setSoal([...soal, { tanya: '', benar: '', salah: '' }])}>+ soal</button>
        </div>
      )}

      {mesin === 'seret-wadah' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Wadah (kategori, label, emoji) & Benda (emoji, kategori).</div>
          {wadah.map((w, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6 }}>
              <input className={s.inp} placeholder="buah" value={w.kategori} onChange={(e) => setWadah(wadah.map((y, j) => j === i ? { ...y, kategori: e.target.value } : y))} />
              <input className={s.inp} placeholder="Buah" value={w.label} onChange={(e) => setWadah(wadah.map((y, j) => j === i ? { ...y, label: e.target.value } : y))} />
              <input className={s.inp} placeholder="🧺" value={w.emoji} onChange={(e) => setWadah(wadah.map((y, j) => j === i ? { ...y, emoji: e.target.value } : y))} style={{ width: 70 }} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setWadah([...wadah, { kategori: '', label: '', emoji: '' }])}>+ wadah</button>
          <div style={{ height: 6 }} />
          {benda.map((b, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6 }}>
              <input className={s.inp} placeholder="🍎" value={b.emoji} onChange={(e) => setBenda(benda.map((y, j) => j === i ? { ...y, emoji: e.target.value } : y))} style={{ width: 70 }} />
              <input className={s.inp} placeholder="buah" value={b.kategori} onChange={(e) => setBenda(benda.map((y, j) => j === i ? { ...y, kategori: e.target.value } : y))} style={{ flex: 1 }} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setBenda([...benda, { emoji: '', kategori: '' }])}>+ benda</button>
        </div>
      )}

      {mesin === 'cari-pasangan' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Daftar emoji (pisah spasi). Tiap emoji otomatis jadi sepasang.</div>
          <input className={s.inp} placeholder="🐱 🌸 🐶" value={pasangan} onChange={(e) => setPasangan(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
        </div>
      )}

      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{err}</div>}
      <button className={s.btn} style={{ marginTop: 10 }} onClick={simpan}>💾 Simpan paket</button>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(admin): PaketForm per mesin (tekan/seret/cocok)"
```

---

## Task 8: Form Video (client)

**Files:**
- Create: `src/app/admin/tema/[id]/VideoForm.tsx`

- [ ] **Step 1: Tulis form**

```tsx
// src/app/admin/tema/[id]/VideoForm.tsx
'use client';
import { useState } from 'react';
import { buatVideo } from '@/lib/data/admin-konten';
import s from '../../admin.module.css';

export default function VideoForm({ temaId }: { temaId: string }) {
  const [judul, setJudul] = useState('');
  const [link, setLink] = useState('');
  const [menit, setMenit] = useState('2');
  const [err, setErr] = useState('');

  async function simpan() {
    setErr('');
    try {
      await buatVideo({ temaId, judul, youtubeId: link, durasiDetik: (Number(menit) || 0) * 60 });
      location.reload();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal'); }
  }

  return (
    <div className={s.card}>
      <div className={s.row}>
        <input className={s.inp} placeholder="Judul video" value={judul} onChange={(e) => setJudul(e.target.value)} style={{ flex: 1 }} />
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

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(admin): VideoForm"
```

---

## Task 9: Halaman kelola tema

**Files:**
- Create: `src/app/admin/tema/[id]/page.tsx`

- [ ] **Step 1: Tulis halaman**

```tsx
// src/app/admin/tema/[id]/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { hapusPaket, hapusVideo, setStatusTema, setMingguIni } from '@/lib/data/admin-konten';
import PaketForm from './PaketForm';
import VideoForm from './VideoForm';
import s from '../../admin.module.css';

export default async function KelolaTema({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tema } = await supabase.from('tema').select('id,nama,sampul,status,is_minggu_ini').eq('id', id).single();
  const { data: paket } = await supabase.from('paket_aset').select('id,mesin,judul').eq('tema_id', id).order('urutan');
  const { data: video } = await supabase.from('video').select('id,judul,youtube_id').eq('tema_id', id).order('urutan');

  if (!tema) return <p>Tema tidak ditemukan. <Link href="/admin">kembali</Link></p>;

  async function aksiHapusPaket(fd: FormData) { 'use server'; await hapusPaket(String(fd.get('pid')), id); }
  async function aksiHapusVideo(fd: FormData) { 'use server'; await hapusVideo(String(fd.get('vid')), id); }
  async function aksiStatus(fd: FormData) { 'use server'; await setStatusTema(id, String(fd.get('status')) as 'draf' | 'disetujui'); }
  async function aksiMinggu() { 'use server'; await setMingguIni(id); }

  return (
    <div>
      <Link href="/admin" className={s.muted}>← semua tema</Link>
      <div className={s.head} style={{ marginTop: 8 }}>
        <h1>{tema.sampul} {tema.nama}</h1>
        <div className={s.row}>
          <span className={`${s.tag} ${tema.status === 'disetujui' ? s.tagOk : s.tagDraf}`}>{tema.status}</span>
          {tema.is_minggu_ini && <span className={`${s.tag} ${s.tagNow}`}>Minggu Ini</span>}
        </div>
      </div>

      <div className={s.row}>
        <form action={aksiStatus}><input type="hidden" name="status" value={tema.status === 'disetujui' ? 'draf' : 'disetujui'} /><button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>{tema.status === 'disetujui' ? 'Jadikan Draf' : 'Setujui'}</button></form>
        {!tema.is_minggu_ini && <form action={aksiMinggu}><button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }}>Jadikan Minggu Ini</button></form>}
      </div>

      <div className={s.section}>Game ({paket?.length ?? 0})</div>
      {(paket ?? []).map((p) => (
        <div key={p.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{p.judul}</b> <span className={s.muted}>({p.mesin})</span></span>
            <form action={aksiHapusPaket}><input type="hidden" name="pid" value={p.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
      <div className={s.muted} style={{ margin: '6px 0' }}>Tambah game dari worksheet:</div>
      <PaketForm temaId={id} />

      <div className={s.section}>Video ({video?.length ?? 0})</div>
      {(video ?? []).map((v) => (
        <div key={v.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}><b>{v.judul}</b> <span className={s.muted}>{v.youtube_id}</span></span>
            <form action={aksiHapusVideo}><input type="hidden" name="vid" value={v.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
      <VideoForm temaId={id} />
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi tipe & build**

Run: `cd /d/kidzplayful && npx tsc --noEmit && npm run build`
Expected: bersih + build sukses; route `/admin/tema/[id]` dinamis.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(admin): halaman kelola tema (paket+video+status+minggu ini)"
```

---

## Task 10: Tautan masuk Admin dari pilih-anak

**Files:**
- Modify: `src/app/pilih-anak/page.tsx`

- [ ] **Step 1: Tambah tautan admin (muncul utk semua; non-admin akan di-redirect oleh guard)**

Di `src/app/pilih-anak/page.tsx`, tepat sebelum penutup `</main>`, tambahkan:

```tsx
      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <a href="/admin" style={{ color: 'var(--abu)', fontSize: 12 }}>🛠️ Panel Admin</a>
      </p>
```

- [ ] **Step 2: Verifikasi tipe & build**

Run: `cd /d/kidzplayful && npx tsc --noEmit && npm run build`
Expected: bersih + build sukses.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(admin): tautan Panel Admin dari pilih-anak"
```

---

## Task 11: E2E — guard admin menolak non-admin

**Files:**
- Create: `tests/e2e/admin-guard.spec.ts`

(Uji CRUD admin penuh butuh akun admin → diverifikasi manual; e2e di sini memastikan guard bekerja: user baru non-admin tidak bisa masuk /admin.)

- [ ] **Step 1: Tulis e2e**

```ts
// tests/e2e/admin-guard.spec.ts
import { test, expect } from '@playwright/test';

test('non-admin ditolak dari /admin', async ({ page }) => {
  const email = `uji+m4_${process.env.E2E_STAMP ?? '1'}@kidzplayful.test`;
  await page.goto('/pilih-anak');
  await page.waitForURL('**/login', { timeout: 90000 });
  await page.goto('/daftar');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'rahasia123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/pilih-anak', { timeout: 90000 });

  // user baru bukan admin -> /admin harus redirect ke /pilih-anak
  await page.goto('/admin');
  await page.waitForURL('**/pilih-anak', { timeout: 90000 });
  await expect(page).toHaveURL(/\/pilih-anak/);
});
```

- [ ] **Step 2: Jalankan e2e**

Run:
```bash
cd /d/kidzplayful && E2E_STAMP=$(node -e "process.stdout.write(String(Date.now()))") npx playwright test tests/e2e/admin-guard.spec.ts
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "test(e2e): guard admin menolak non-admin"
```

---

## Task 12: Verifikasi akhir Milestone 4

- [ ] **Step 1: Unit test**

Run: `cd /d/kidzplayful && npm test`
Expected: PASS (sebelumnya 19 + butir 4 = 23).

- [ ] **Step 2: Build**

Run: `cd /d/kidzplayful && npm run build`
Expected: sukses; route `/admin` & `/admin/tema/[id]` dinamis.

- [ ] **Step 3: Smoke manual (WAJIB — verifikasi CRUD nyata, perlu akun admin)**

`npm run dev` → login dengan akun yang sudah di-set `is_admin=true` → buka **/admin** (atau via tautan di pilih-anak) →
1. Buat tema "Kendaraan" 🚗.
2. Kelola → tambah game **Mana Ya?**: soal `mobil 🚗 / 🚌 🚲 ✈️` → Simpan.
3. **Jadikan Minggu Ini**.
4. Buka Mode Anak (pilih anak) → "Main Minggu Ini" → game Kendaraan muncul & bisa dimainkan.
Expected: konten yang dibuat di admin langsung tampil di app — **tanpa SQL**.

- [ ] **Step 4: Commit penutup (bila ada)**

```bash
git add -A && git commit -m "chore: tutup Milestone 4 (admin konten)" || echo "tidak ada perubahan"
```

---

## Definition of Done (Milestone 4)
- Akun admin (`is_admin=true`) bisa membuka **/admin**; non-admin di-redirect (terverifikasi e2e).
- Admin dapat **buat/hapus Tema**, atur **status** & **"Minggu Ini"**.
- Admin dapat **menambah Paket Game** dari worksheet via **form terstruktur per mesin** (Mana Ya?/Beres-Beres/Cari Pasangan) — JSON `butir` tervalidasi, tanpa SQL, tanpa AI.
- Admin dapat **menambah/hapus Video** (paste link YouTube → ID diekstrak).
- Konten yang dibuat langsung muncul di Mode Anak (Minggu Ini / Pustaka).
- Unit test hijau (23), e2e guard hijau, build sukses, smoke manual konten OK.

## Catatan untuk Milestone berikutnya
- **Upload gambar/audio ke Supabase Storage** (worksheet bergambar → engine render `<img>`/audio) — peningkatan editor; sekarang berbasis emoji/teks.
- **Admin Bisnis**: aktivasi langganan manual + **Laporan Member** → milestone terpisah (M4-bisnis / M5).
- Edit paket (sekarang hanya buat & hapus) → tambah "edit" bila perlu.
- AI content pipeline tetap opsional di §17 Roadmap.
