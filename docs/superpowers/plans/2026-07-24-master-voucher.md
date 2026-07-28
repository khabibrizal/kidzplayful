# Master Voucher & Redeem Transaksi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin membuat master voucher; user redeem voucher saat pendaftaran event / beli produk (aturan jenis transaksi, kuota total & per-user, potongan nominal/persen, masa berlaku); transaksi ber-voucher tercatat net di laporan.

**Architecture:** Tabel `voucher` + `voucher_redeem` + kolom `voucher_id`/`potongan_voucher` di `pendaftaran_event`/`pesanan` (migrasi 0084). Util murni `domain/voucher.ts` (hitungPotongan, validasiVoucher, teruji). Reader/helper `data/voucher.ts` (nilaiVoucherByKode/ById). Server action `cekVoucher`. Redeem diterapkan di `daftarEvent` & `checkout` (potongan mengurangi total/subtotal → ledger net otomatis). Kuota dilepas saat tolak/batal. Master admin pola kategori-usia.

**Tech Stack:** Next.js 16 (server actions), Supabase (RLS), Vitest.

Spec: `docs/superpowers/specs/2026-07-24-master-voucher-design.md`.

Konvensi: commit `git -c commit.gpgsign=false ... -m "…"` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Gerbang: `npx tsc --noEmit` + `npm run build`.

## File Structure
- Create `supabase/migrations/0084_voucher.sql`.
- Create `src/lib/domain/voucher.ts` (murni) + `src/lib/domain/__tests__/voucher.test.ts`.
- Create `src/lib/data/voucher.ts` (reader + helper nilai voucher; BUKAN 'use server').
- Create `src/lib/data/voucher-actions.ts` ('use server': CRUD + cekVoucher).
- Create `src/app/admin/voucher/page.tsx` + `VoucherAdmin.tsx`; modify `src/lib/menu-admin.ts`.
- Modify `src/app/event/[id]/daftar/DaftarForm.tsx` + `src/lib/data/event-actions.ts` + `src/lib/data/admin-event-actions.ts`.
- Modify `src/app/keranjang/KeranjangView.tsx` + `src/lib/data/keranjang-actions.ts` + `src/lib/data/admin-store-actions.ts`.
- Modify `src/lib/data/keuangan.ts` (detail voucher).

---

### Task 1: Migrasi 0084

**Files:**
- Create: `supabase/migrations/0084_voucher.sql`

- [ ] **Step 1: Write migration** (isi PERSIS blok SQL di spec §"Skema data", termasuk kedua tabel, semua policy termasuk `redeem insert sendiri`, dan 4 `alter table … add column`).

```sql
-- 0084_voucher.sql — master voucher + redeem + kolom voucher pada transaksi.
create table if not exists public.voucher (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  tipe text not null check (tipe in ('nominal','persen')),
  nilai int not null check (nilai >= 0),
  berlaku_event boolean not null default false,
  berlaku_produk boolean not null default false,
  kuota_total int,
  kuota_per_user int,
  berlaku_dari date,
  berlaku_sampai date,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.voucher enable row level security;
drop policy if exists "voucher baca auth" on public.voucher;
create policy "voucher baca auth" on public.voucher for select to authenticated using (true);
drop policy if exists "voucher kelola admin" on public.voucher;
create policy "voucher kelola admin" on public.voucher for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.voucher_redeem (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.voucher(id) on delete cascade,
  ortu_id uuid not null references auth.users(id) on delete cascade,
  ref_tipe text not null check (ref_tipe in ('pendaftaran','pesanan')),
  ref_id uuid not null,
  potongan int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_voucher_redeem_ref on public.voucher_redeem(ref_tipe, ref_id);
create index if not exists voucher_redeem_voucher_idx on public.voucher_redeem(voucher_id);
alter table public.voucher_redeem enable row level security;
drop policy if exists "redeem baca sendiri/admin" on public.voucher_redeem;
create policy "redeem baca sendiri/admin" on public.voucher_redeem for select to authenticated using (ortu_id = auth.uid() or public.is_admin());
drop policy if exists "redeem insert sendiri" on public.voucher_redeem;
create policy "redeem insert sendiri" on public.voucher_redeem for insert to authenticated with check (ortu_id = auth.uid());
drop policy if exists "redeem kelola admin" on public.voucher_redeem;
create policy "redeem kelola admin" on public.voucher_redeem for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.pendaftaran_event add column if not exists voucher_id uuid references public.voucher(id) on delete set null;
alter table public.pendaftaran_event add column if not exists potongan_voucher int not null default 0;
alter table public.pesanan add column if not exists voucher_id uuid references public.voucher(id) on delete set null;
alter table public.pesanan add column if not exists potongan_voucher int not null default 0;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0084_voucher.sql
git -c commit.gpgsign=false commit -m "feat(db): tabel voucher + voucher_redeem + kolom transaksi (0084)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Util murni `domain/voucher.ts` + test

**Files:**
- Create: `src/lib/domain/voucher.ts`
- Test: `src/lib/domain/__tests__/voucher.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/domain/__tests__/voucher.test.ts
import { describe, it, expect } from 'vitest';
import { hitungPotongan, validasiVoucher } from '../voucher';

describe('hitungPotongan', () => {
  it('nominal di-clamp <= subtotal', () => {
    expect(hitungPotongan({ tipe: 'nominal', nilai: 20000 }, 50000)).toBe(20000);
    expect(hitungPotongan({ tipe: 'nominal', nilai: 90000 }, 50000)).toBe(50000);
  });
  it('persen floor & clamp 0-100', () => {
    expect(hitungPotongan({ tipe: 'persen', nilai: 15 }, 50000)).toBe(7500);
    expect(hitungPotongan({ tipe: 'persen', nilai: 150 }, 50000)).toBe(50000);
  });
  it('subtotal 0 → 0', () => {
    expect(hitungPotongan({ tipe: 'persen', nilai: 15 }, 0)).toBe(0);
  });
});

describe('validasiVoucher', () => {
  const base = { aktif: true, berlaku_dari: null, berlaku_sampai: null, berlaku_event: true, berlaku_produk: false };
  const ctx = { jenis: 'event' as const, hariIni: '2026-07-24' };
  it('valid → null', () => { expect(validasiVoucher(base, ctx)).toBeNull(); });
  it('nonaktif', () => { expect(validasiVoucher({ ...base, aktif: false }, ctx)).toMatch(/tidak aktif/i); });
  it('kadaluarsa', () => { expect(validasiVoucher({ ...base, berlaku_sampai: '2026-07-23' }, ctx)).toMatch(/kadaluarsa/i); });
  it('belum berlaku', () => { expect(validasiVoucher({ ...base, berlaku_dari: '2026-07-25' }, ctx)).toMatch(/belum berlaku/i); });
  it('jenis tak cocok (produk pada voucher event-only)', () => {
    expect(validasiVoucher(base, { jenis: 'produk', hariIni: '2026-07-24' })).toMatch(/tidak berlaku/i);
  });
});
```

- [ ] **Step 2: Run test → gagal**

Run: `npx vitest run src/lib/domain/__tests__/voucher.test.ts`
Expected: FAIL — module `../voucher` belum ada.

- [ ] **Step 3: Write `src/lib/domain/voucher.ts`**

```ts
// src/lib/domain/voucher.ts — logika voucher murni (tanpa DB), teruji.
export interface VoucherPotongan { tipe: 'nominal' | 'persen'; nilai: number }
export interface VoucherValidasi { aktif: boolean; berlaku_dari: string | null; berlaku_sampai: string | null; berlaku_event: boolean; berlaku_produk: boolean }

/** Potongan dari subtotal (di-clamp 0..subtotal). nominal=rupiah, persen=% (0-100). */
export function hitungPotongan(v: VoucherPotongan, subtotal: number): number {
  const sub = Math.max(0, Math.floor(subtotal || 0));
  if (v.tipe === 'nominal') return Math.min(Math.max(0, Math.floor(v.nilai || 0)), sub);
  const pct = Math.max(0, Math.min(100, Math.floor(v.nilai || 0)));
  return Math.min(Math.floor((sub * pct) / 100), sub);
}

/** Validasi non-kuota (kuota dicek di server karena butuh DB). Return pesan error atau null. */
export function validasiVoucher(v: VoucherValidasi, ctx: { jenis: 'event' | 'produk'; hariIni: string }): string | null {
  if (!v.aktif) return 'Voucher tidak aktif.';
  if (v.berlaku_dari && ctx.hariIni < v.berlaku_dari) return 'Voucher belum berlaku.';
  if (v.berlaku_sampai && ctx.hariIni > v.berlaku_sampai) return 'Voucher sudah kadaluarsa.';
  const cocok = ctx.jenis === 'event' ? v.berlaku_event : v.berlaku_produk;
  if (!cocok) return 'Voucher tidak berlaku untuk transaksi ini.';
  return null;
}
```

- [ ] **Step 4: Run test → lulus**

Run: `npx vitest run src/lib/domain/__tests__/voucher.test.ts`
Expected: PASS (8 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/voucher.ts src/lib/domain/__tests__/voucher.test.ts
git -c commit.gpgsign=false commit -m "feat(voucher): util hitungPotongan + validasiVoucher (teruji)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Reader + helper `data/voucher.ts`

**Files:**
- Create: `src/lib/data/voucher.ts`

- [ ] **Step 1: Write `src/lib/data/voucher.ts`** (BUKAN 'use server' — modul biasa; helper menerima client `s` agar reuse session pemanggil)

```ts
// src/lib/data/voucher.ts — reader master voucher + helper nilai/redeem (dipakai server actions).
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { hitungPotongan, validasiVoucher } from '@/lib/domain/voucher';

export interface Voucher {
  id: string; kode: string; tipe: 'nominal' | 'persen'; nilai: number;
  berlaku_event: boolean; berlaku_produk: boolean;
  kuota_total: number | null; kuota_per_user: number | null;
  berlaku_dari: string | null; berlaku_sampai: string | null; aktif: boolean; created_at: string;
}
const COLS = 'id,kode,tipe,nilai,berlaku_event,berlaku_produk,kuota_total,kuota_per_user,berlaku_dari,berlaku_sampai,aktif,created_at';

export async function getVoucherSemua(): Promise<Voucher[]> {
  const s = await createClient();
  const { data } = await s.from('voucher').select(COLS).order('created_at', { ascending: false });
  return (data ?? []) as unknown as Voucher[];
}

export interface HasilNilai { ok: boolean; voucher_id?: string; kode?: string; potongan?: number; error?: string }

// Hitung potongan + validasi lengkap (termasuk kuota) untuk sebuah baris voucher.
async function nilai(s: SupabaseClient, v: Voucher | null, jenis: 'event' | 'produk', subtotal: number, userId: string): Promise<HasilNilai> {
  if (!v) return { ok: false, error: 'Kode voucher tidak valid.' };
  const err = validasiVoucher(v, { jenis, hariIni: new Date().toISOString().slice(0, 10) });
  if (err) return { ok: false, error: err };
  if (v.kuota_total != null) {
    const { count } = await s.from('voucher_redeem').select('id', { count: 'exact', head: true }).eq('voucher_id', v.id);
    if ((count ?? 0) >= v.kuota_total) return { ok: false, error: 'Kuota voucher habis.' };
  }
  if (v.kuota_per_user != null) {
    const { count } = await s.from('voucher_redeem').select('id', { count: 'exact', head: true }).eq('voucher_id', v.id).eq('ortu_id', userId);
    if ((count ?? 0) >= v.kuota_per_user) return { ok: false, error: 'Kamu sudah memakai voucher ini.' };
  }
  return { ok: true, voucher_id: v.id, kode: v.kode, potongan: hitungPotongan(v, subtotal) };
}

export async function nilaiVoucherByKode(s: SupabaseClient, kode: string, jenis: 'event' | 'produk', subtotal: number, userId: string): Promise<HasilNilai> {
  const k = (kode ?? '').trim().toUpperCase();
  if (!k) return { ok: false, error: 'Masukkan kode voucher.' };
  const { data } = await s.from('voucher').select(COLS).eq('kode', k).maybeSingle();
  return nilai(s, (data ?? null) as Voucher | null, jenis, subtotal, userId);
}

export async function nilaiVoucherById(s: SupabaseClient, voucherId: string, jenis: 'event' | 'produk', subtotal: number, userId: string): Promise<HasilNilai> {
  const { data } = await s.from('voucher').select(COLS).eq('id', voucherId).maybeSingle();
  return nilai(s, (data ?? null) as Voucher | null, jenis, subtotal, userId);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/voucher.ts
git -c commit.gpgsign=false commit -m "feat(voucher): reader + helper nilaiVoucher (by kode/id, cek kuota)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Actions CRUD + `cekVoucher`

**Files:**
- Create: `src/lib/data/voucher-actions.ts`

- [ ] **Step 1: Write `src/lib/data/voucher-actions.ts`**

```ts
// src/lib/data/voucher-actions.ts — CRUD master voucher (admin) + cekVoucher (redeem).
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { nilaiVoucherByKode, type HasilNilai } from './voucher';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}
const segarkan = () => revalidatePath('/admin/voucher');

export interface VoucherInput {
  kode: string; tipe: 'nominal' | 'persen'; nilai: number;
  berlakuEvent: boolean; berlakuProduk: boolean;
  kuotaTotal: number | null; kuotaPerUser: number | null;
  berlakuDari: string | null; berlakuSampai: string | null; aktif: boolean;
}

function baris(i: VoucherInput) {
  const nilai = i.tipe === 'persen' ? Math.max(0, Math.min(100, Math.floor(i.nilai || 0))) : Math.max(0, Math.floor(i.nilai || 0));
  const posInt = (n: number | null) => (n == null || n === 0 ? null : Math.max(1, Math.floor(n)));
  return {
    kode: i.kode.trim().toUpperCase(), tipe: i.tipe, nilai,
    berlaku_event: !!i.berlakuEvent, berlaku_produk: !!i.berlakuProduk,
    kuota_total: posInt(i.kuotaTotal), kuota_per_user: posInt(i.kuotaPerUser),
    berlaku_dari: i.berlakuDari || null, berlaku_sampai: i.berlakuSampai || null, aktif: !!i.aktif,
  };
}

function validasiInput(i: VoucherInput): string | null {
  if (!i.kode.trim()) return 'Kode voucher wajib diisi.';
  if (i.tipe !== 'nominal' && i.tipe !== 'persen') return 'Tipe potongan tidak valid.';
  if (!(i.nilai > 0)) return 'Nilai potongan harus > 0.';
  if (!i.berlakuEvent && !i.berlakuProduk) return 'Pilih minimal satu jenis transaksi (Event/Produk).';
  return null;
}

export async function buatVoucher(i: VoucherInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const err = validasiInput(i); if (err) return { ok: false, error: err };
    const { error } = await s.from('voucher').insert(baris(i));
    if (error) return { ok: false, error: error.code === '23505' ? 'Kode voucher sudah dipakai.' : error.message };
    segarkan(); return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' }; }
}

export async function updateVoucher(id: string, i: VoucherInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const s = await adminDb();
    const err = validasiInput(i); if (err) return { ok: false, error: err };
    const { error } = await s.from('voucher').update(baris(i)).eq('id', id);
    if (error) return { ok: false, error: error.code === '23505' ? 'Kode voucher sudah dipakai.' : error.message };
    segarkan(); return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' }; }
}

export async function setAktifVoucher(id: string, aktif: boolean): Promise<{ ok: boolean; error?: string }> {
  try { const s = await adminDb(); const { error } = await s.from('voucher').update({ aktif }).eq('id', id); if (error) return { ok: false, error: error.message }; segarkan(); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' }; }
}

export async function hapusVoucher(id: string): Promise<{ ok: boolean; error?: string }> {
  try { const s = await adminDb(); const { error } = await s.from('voucher').delete().eq('id', id); if (error) return { ok: false, error: error.message }; segarkan(); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Gagal.' }; }
}

/** Cek voucher saat user mengetik kode di form transaksi. */
export async function cekVoucher(kode: string, jenis: 'event' | 'produk', subtotal: number): Promise<HasilNilai> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { ok: false, error: 'Harus login.' };
  return nilaiVoucherByKode(s, kode, jenis, subtotal, user.id);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/voucher-actions.ts
git -c commit.gpgsign=false commit -m "feat(voucher): actions CRUD + cekVoucher

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Master admin `/admin/voucher` + menu

**Files:**
- Create: `src/app/admin/voucher/page.tsx`
- Create: `src/app/admin/voucher/VoucherAdmin.tsx`
- Modify: `src/lib/menu-admin.ts`

- [ ] **Step 1: `page.tsx`**

```tsx
// src/app/admin/voucher/page.tsx
import { getVoucherSemua } from '@/lib/data/voucher';
import VoucherAdmin from './VoucherAdmin';
import s from '../admin.module.css';

export default async function AdminVoucherPage() {
  const list = await getVoucherSemua();
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🎟️ Voucher</h1></div>
      <p className={s.muted} style={{ fontSize: 13, marginBottom: 10 }}>Kode voucher untuk potongan saat pendaftaran event / beli produk. Kuota total & per user, masa berlaku.</p>
      <VoucherAdmin awal={list} />
    </div>
  );
}
```

- [ ] **Step 2: `VoucherAdmin.tsx`** (client; form tambah/edit + tabel; pola KategoriUsiaAdmin)

```tsx
// src/app/admin/voucher/VoucherAdmin.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buatVoucher, updateVoucher, setAktifVoucher, hapusVoucher, type VoucherInput } from '@/lib/data/voucher-actions';
import type { Voucher } from '@/lib/data/voucher';
import s from '../admin.module.css';

const KOSONG: VoucherInput = { kode: '', tipe: 'nominal', nilai: 0, berlakuEvent: true, berlakuProduk: false, kuotaTotal: null, kuotaPerUser: 1, berlakuDari: null, berlakuSampai: null, aktif: true };

export default function VoucherAdmin({ awal }: { awal: Voucher[] }) {
  const router = useRouter();
  const [form, setForm] = useState<VoucherInput | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2400); }

  function bukaTambah() { setEditId(null); setForm({ ...KOSONG }); }
  function bukaEdit(v: Voucher) {
    setEditId(v.id);
    setForm({ kode: v.kode, tipe: v.tipe, nilai: v.nilai, berlakuEvent: v.berlaku_event, berlakuProduk: v.berlaku_produk, kuotaTotal: v.kuota_total, kuotaPerUser: v.kuota_per_user, berlakuDari: v.berlaku_dari, berlakuSampai: v.berlaku_sampai, aktif: v.aktif });
  }
  async function simpan() {
    if (!form) return; setBusy(true);
    const r = editId ? await updateVoucher(editId, form) : await buatVoucher(form);
    setBusy(false);
    if (r.ok) { setForm(null); setEditId(null); flash('Tersimpan ✓'); router.refresh(); } else flash(r.error ?? 'Gagal');
  }
  async function toggle(v: Voucher) { setBusy(true); const r = await setAktifVoucher(v.id, !v.aktif); setBusy(false); if (r.ok) { flash('✓'); router.refresh(); } else flash(r.error ?? 'Gagal'); }
  async function hapus(v: Voucher) { if (!confirm(`Hapus voucher ${v.kode}?`)) return; setBusy(true); const r = await hapusVoucher(v.id); setBusy(false); if (r.ok) { flash('Dihapus ✓'); router.refresh(); } else flash(r.error ?? 'Gagal'); }

  const set = (patch: Partial<VoucherInput>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div>
      {!form && <button className={s.btn} onClick={bukaTambah}>+ Tambah Voucher</button>}
      {form && (
        <div className={s.card} style={{ border: '2px solid var(--lavender)' }}>
          <b>{editId ? 'Edit' : 'Tambah'} Voucher</b>
          <input className={s.inp} placeholder="KODE (mis. HEMAT20)" value={form.kode} onChange={(e) => set({ kode: e.target.value.toUpperCase() })} style={{ width: '100%', marginTop: 8 }} />
          <div className={s.row} style={{ gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <select className={s.inp} value={form.tipe} onChange={(e) => set({ tipe: e.target.value as 'nominal' | 'persen' })} style={{ marginBottom: 0 }}>
              <option value="nominal">Nominal (Rp)</option>
              <option value="persen">Persen (%)</option>
            </select>
            <input className={s.inp} type="number" min={0} placeholder={form.tipe === 'persen' ? '%' : 'Rp'} value={form.nilai} onChange={(e) => set({ nilai: Number(e.target.value) })} style={{ width: 120, marginBottom: 0 }} />
            <span className={s.muted} style={{ fontSize: 12 }}>{form.tipe === 'persen' ? '% dari transaksi' : 'rupiah'}</span>
          </div>
          <div className={s.row} style={{ gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={form.berlakuEvent} onChange={(e) => set({ berlakuEvent: e.target.checked })} /> Pendaftaran Event</label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={form.berlakuProduk} onChange={(e) => set({ berlakuProduk: e.target.checked })} /> Beli Produk</label>
          </div>
          <div className={s.row} style={{ gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span className={s.muted} style={{ fontSize: 12 }}>Kuota total</span>
            <input className={s.inp} type="number" min={0} placeholder="∞" value={form.kuotaTotal ?? ''} onChange={(e) => set({ kuotaTotal: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: 90, marginBottom: 0 }} />
            <span className={s.muted} style={{ fontSize: 12 }}>per user</span>
            <input className={s.inp} type="number" min={0} placeholder="∞" value={form.kuotaPerUser ?? ''} onChange={(e) => set({ kuotaPerUser: e.target.value === '' ? null : Number(e.target.value) })} style={{ width: 90, marginBottom: 0 }} />
            <span className={s.muted} style={{ fontSize: 11 }}>(kosong = tak terbatas)</span>
          </div>
          <div className={s.row} style={{ gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span className={s.muted} style={{ fontSize: 12 }}>Berlaku</span>
            <input className={s.inp} type="date" value={form.berlakuDari ?? ''} onChange={(e) => set({ berlakuDari: e.target.value || null })} style={{ marginBottom: 0 }} />
            <span className={s.muted}>–</span>
            <input className={s.inp} type="date" value={form.berlakuSampai ?? ''} onChange={(e) => set({ berlakuSampai: e.target.value || null })} style={{ marginBottom: 0 }} />
          </div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}><input type="checkbox" checked={form.aktif} onChange={(e) => set({ aktif: e.target.checked })} /> Aktif</label>
          <div className={s.row} style={{ marginTop: 10, gap: 6 }}>
            <button className={s.btn} onClick={simpan} disabled={busy}>{busy ? '...' : '💾 Simpan'}</button>
            <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => { setForm(null); setEditId(null); }}>Batal</button>
          </div>
        </div>
      )}

      <div className={s.section}>Daftar ({awal.length})</div>
      {awal.map((v) => (
        <div key={v.id} className={s.card} style={{ opacity: v.aktif ? 1 : 0.55 }}>
          <div className={s.row}>
            <span style={{ flex: 1 }}>
              <b>{v.kode}</b> <span className={s.muted}>· {v.tipe === 'persen' ? `${v.nilai}%` : `Rp${v.nilai.toLocaleString('id-ID')}`}</span> {!v.aktif && <span className={`${s.tag} ${s.tagDraf}`}>nonaktif</span>}
              <br /><small className={s.muted}>{[v.berlaku_event && 'Event', v.berlaku_produk && 'Produk'].filter(Boolean).join(' + ') || '—'} · kuota {v.kuota_total ?? '∞'}/total, {v.kuota_per_user ?? '∞'}/user{v.berlaku_sampai ? ` · s/d ${v.berlaku_sampai}` : ''}</small>
            </span>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => bukaEdit(v)} disabled={busy}>Edit</button>
              <button className={s.btnSm} style={{ background: '#fff3d6', color: '#b88600' }} onClick={() => toggle(v)} disabled={busy}>{v.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
              <button className={`${s.btnSm} ${s.danger}`} onClick={() => hapus(v)} disabled={busy}>Hapus</button>
            </span>
          </div>
        </div>
      ))}
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Menu** (`src/lib/menu-admin.ts`) — setelah entri `pesanan` tambahkan:

```ts
  { key: 'voucher', href: '/admin/voucher', label: '🎟️ Voucher' },
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/voucher/page.tsx src/app/admin/voucher/VoucherAdmin.tsx src/lib/menu-admin.ts
git -c commit.gpgsign=false commit -m "feat(voucher): halaman master /admin/voucher + menu

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Redeem di pendaftaran event

**Files:**
- Modify: `src/lib/data/event-actions.ts`
- Modify: `src/app/event/[id]/daftar/DaftarForm.tsx`
- Modify: `src/lib/data/admin-event-actions.ts`

- [ ] **Step 1: `event-actions.ts` — param voucherId + potongan + insert redeem**

Tambah import: `import { nilaiVoucherById } from './voucher';`

Ubah signature `daftarEvent`:
```ts
export async function daftarEvent(eventId: string, anakIds: string[], buktiUrl: string | null, kelas: string | null = null, jumlahPendamping: number = 0, voucherId: string | null = null): Promise<{ ok: boolean; error?: string }> {
```

Ganti blok perhitungan `total` + insert (baris ~56-70) menjadi:
```ts
  const status = await getStatusLangganan(s, user.id);
  const nPendamping = Math.max(0, Math.floor(jumlahPendamping || 0));
  const subtotal = hargaEventUntuk({ harga_per_anak: ev.harga_per_anak ?? 0, diskon_langganan_persen: ev.diskon_langganan_persen ?? null }, status) * baru.length
    + nPendamping * (ev.harga_pendamping ?? 0);
  let potonganVoucher = 0; let vId: string | null = null;
  if (voucherId) {
    const rv = await nilaiVoucherById(s, voucherId, 'event', subtotal, user.id);
    if (!rv.ok) return { ok: false, error: rv.error };
    potonganVoucher = rv.potongan ?? 0; vId = voucherId;
  }
  const total = Math.max(0, subtotal - potonganVoucher);
  const { data: baruRow, error } = await s.from('pendaftaran_event').insert({
    event_id: eventId,
    ortu_id: user.id,
    anak_ids: baru.map((a) => a.id),
    anak_nama: baru.map((a) => a.nama),
    jumlah_anak: baru.length,
    jumlah_pendamping: nPendamping,
    total,
    voucher_id: vId,
    potongan_voucher: potonganVoucher,
    bukti_url: buktiUrl,
    kelas: kelasFinal,
    kelas_jadwal: kelasJadwal,
  }).select('id').single();
  if (error) return { ok: false, error: error.message };
  if (vId && baruRow) {
    await s.from('voucher_redeem').insert({ voucher_id: vId, ortu_id: user.id, ref_tipe: 'pendaftaran', ref_id: baruRow.id, potongan: potonganVoucher });
  }
  revalidatePath('/event');
  revalidatePath('/pilih-anak');
```
(Pastikan `return { ok: true };` tetap ada di akhir fungsi setelah revalidatePath.)

- [ ] **Step 2: `DaftarForm.tsx` — field voucher + kirim voucherId**

Tambah import: `import { cekVoucher } from '@/lib/data/voucher-actions';`

Tambah state (dekat state lain):
```tsx
  const [kodeVoucher, setKodeVoucher] = useState('');
  const [voucher, setVoucher] = useState<{ id: string; kode: string; potongan: number } | null>(null);
  const [vMsg, setVMsg] = useState('');
```

Tambah handler:
```tsx
  async function terapkanVoucher() {
    setVMsg('');
    if (!kodeVoucher.trim()) { setVMsg('Masukkan kode voucher.'); return; }
    const sub = hargaAnak * pilih.size + totalPendamping;
    const r = await cekVoucher(kodeVoucher, 'event', sub);
    if (!r.ok || !r.voucher_id) { setVoucher(null); setVMsg(r.error ?? 'Voucher tidak valid.'); return; }
    setVoucher({ id: r.voucher_id, kode: r.kode ?? kodeVoucher.toUpperCase(), potongan: r.potongan ?? 0 });
    setVMsg(`Voucher ${r.kode} diterapkan −${formatRupiah(r.potongan ?? 0)}`);
  }
```

Ubah `const total = hargaAnak * pilih.size + totalPendamping;` menjadi memperhitungkan voucher:
```tsx
  const totalSblmVoucher = hargaAnak * pilih.size + totalPendamping;
  const total = Math.max(0, totalSblmVoucher - (voucher?.potongan ?? 0));
```

Di UI (tempatkan blok voucher SEBELUM tombol/aksi kirim, mis. di dekat ringkasan/total; baca file untuk anchor — mis. sebelum tombol "Daftar Sekarang" / setelah bagian bukti bayar):
```tsx
      <div style={{ marginTop: 12 }}>
        <div className={s?.muted ? '' : ''} style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🎟️ Punya kode voucher?</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="kp-input" placeholder="Kode voucher" value={kodeVoucher} onChange={(e) => { setKodeVoucher(e.target.value.toUpperCase()); setVoucher(null); }} style={{ flex: 1 }} />
          <button type="button" className="kp-btn putih" onClick={terapkanVoucher}>Terapkan</button>
        </div>
        {vMsg && <div style={{ fontSize: 12, color: voucher ? 'var(--mint-d)' : '#c0392b', marginTop: 4 }}>{vMsg}</div>}
        {voucher && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 6 }}><span>🎟️ {voucher.kode}</span><span>−{formatRupiah(voucher.potongan)}</span></div>}
      </div>
```
(Catatan: `kp-input`/`kp-btn` adalah kelas global yang dipakai form ini; hapus referensi `s?.muted` di atas — gunakan style inline biasa. Sesuaikan dengan kelas yang sudah dipakai file.)

Ubah pemanggilan `daftarEvent(...)` di `kirim()` untuk mengirim voucher id:
```tsx
      const r = await daftarEvent(ev.id, [...pilih], buktiUrl, kelasOpsi.length > 0 ? kelas : null, pendamping, voucher?.id ?? null);
```

- [ ] **Step 3: `admin-event-actions.ts` — lepas kuota saat ditolak**

Di `setStatusPendaftaran`, pada cabang `else` setelah `if (statusBaru === 'ditolak') await hapusLedgerRef(s, 'pendaftaran', id);`, tambahkan di baris berikutnya:
```ts
    if (statusBaru === 'ditolak') await s.from('voucher_redeem').delete().eq('ref_tipe', 'pendaftaran').eq('ref_id', id);
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/event-actions.ts src/app/event/[id]/daftar/DaftarForm.tsx src/lib/data/admin-event-actions.ts
git -c commit.gpgsign=false commit -m "feat(voucher): redeem di pendaftaran event + lepas kuota saat ditolak

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Redeem di beli produk

**Files:**
- Modify: `src/lib/data/keranjang-actions.ts`
- Modify: `src/app/keranjang/KeranjangView.tsx`
- Modify: `src/lib/data/admin-store-actions.ts`

- [ ] **Step 1: `keranjang-actions.ts` — param voucherId + potongan + insert redeem**

Tambah import: `import { nilaiVoucherById } from './voucher';`

Ubah signature `checkout`:
```ts
export async function checkout(input: { penerima: string; noHp: string; alamat: string; catatan?: string; voucherId?: string | null }): Promise<string> {
```

Setelah baris `const subtotal = list.reduce(...)`, tambahkan:
```ts
  let potonganVoucher = 0; let vId: string | null = null;
  if (input.voucherId) {
    const rv = await nilaiVoucherById(s, input.voucherId, 'produk', subtotal, user.id);
    if (!rv.ok) throw new Error(rv.error ?? 'Voucher tidak valid.');
    potonganVoucher = rv.potongan ?? 0; vId = input.voucherId;
  }
```

Ubah insert `pesanan` (tambah voucher + total net):
```ts
  const { data: pesanan, error: e1 } = await s.from('pesanan').insert({
    ortu_id: user.id, status: 'menunggu_ongkir',
    subtotal, ongkir: 0, total: Math.max(0, subtotal - potonganVoucher),
    voucher_id: vId, potongan_voucher: potonganVoucher,
    penerima: input.penerima.trim(), no_hp: input.noHp.trim(), alamat: input.alamat.trim(),
    catatan: input.catatan?.trim() || null,
  }).select('id').single();
  if (e1 || !pesanan) throw new Error(e1?.message ?? 'Gagal membuat pesanan.');
```

Setelah insert `item_pesanan` sukses (sebelum `await s.from('keranjang_item').delete(...)`), tambahkan:
```ts
  if (vId) await s.from('voucher_redeem').insert({ voucher_id: vId, ortu_id: user.id, ref_tipe: 'pesanan', ref_id: pesanan.id, potongan: potonganVoucher });
```

- [ ] **Step 2: `KeranjangView.tsx` — field voucher + kirim voucherId**

Baca file; tambah import `import { cekVoucher } from '@/lib/data/voucher-actions';`. Tambah state `kodeVoucher`, `voucher` ({id,kode,potongan}), `vMsg` (pola sama Task 6 Step 2). Sebelum tombol Checkout, tambah blok input voucher + tombol Terapkan yang memanggil `cekVoucher(kode, 'produk', subtotal)` (subtotal = nilai keranjang yang sudah ada di komponen). Tampilkan baris potongan & total setelah potongan. Saat memanggil `checkout(...)`, sertakan `voucherId: voucher?.id ?? null` pada objek input.

- [ ] **Step 3: `admin-store-actions.ts` — net revenue + lepas kuota**

Di `verifikasiPesanan`, ubah select + catatLedger agar net:
```ts
  const { data: pes } = await s.from('pesanan').select('subtotal,potongan_voucher').eq('id', pesananId).single();
  ...
  await catatLedger(s, { arah: 'masuk', kategori: 'store', jumlah: Math.max(0, (pes?.subtotal ?? 0) - (pes?.potongan_voucher ?? 0)), ref_tipe: 'pesanan', ref_id: pesananId, keterangan: `Pesanan #${pesananId.slice(0, 8)}`, metode: 'transfer' });
```

Di `ubahStatusPesanan`, pada cabang `if (status === 'batal')` setelah `hapusLedgerRef`, tambahkan:
```ts
    await s.from('voucher_redeem').delete().eq('ref_tipe', 'pesanan').eq('ref_id', pesananId);
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/keranjang-actions.ts src/app/keranjang/KeranjangView.tsx src/lib/data/admin-store-actions.ts
git -c commit.gpgsign=false commit -m "feat(voucher): redeem di beli produk + ledger net + lepas kuota saat batal

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Detail voucher di laporan

**Files:**
- Modify: `src/lib/data/keuangan.ts`

- [ ] **Step 1: Tambah `potongan_voucher` + kode voucher di `getTransaksiDetail`**

Pada cabang `ref_tipe === 'pesanan'`, ubah select menambah `potongan_voucher,voucher:voucher_id(kode)`; pada cabang `ref_tipe === 'pendaftaran'`, ubah select menambah `potongan_voucher,voucher:voucher_id(kode)`. Sertakan `potongan_voucher` (dan `voucher_kode`) ke objek `out.pesanan`/`out.event` (perluas tipe `TransaksiDetail` bila perlu dengan field opsional `potongan_voucher?: number; voucher_kode?: string | null`).

Contoh untuk pendaftaran:
```ts
      const { data: p } = await s.from('pendaftaran_event')
        .select('ortu_id,anak_nama,jumlah_anak,total,potongan_voucher,status,bukti_url,created_at,event:event_id(judul,tanggal,lokasi),voucher:voucher_id(kode)')
        .eq('id', t.ref_id).maybeSingle();
```
lalu tambahkan `potongan_voucher` & `voucher_kode` ke `out.event`. (Analog untuk pesanan pada `out.pesanan`.) Bila render detail transaksi menampilkan rincian, tambahkan baris "🎟️ Voucher <kode> −Rp <potongan_voucher>" saat `potongan_voucher > 0` di halaman detail `src/app/admin/keuangan/...` (baca file detail untuk anchor render).

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/keuangan.ts
git -c commit.gpgsign=false commit -m "feat(voucher): tampilkan voucher & potongan di detail transaksi laporan

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Gerbang mutu + dokumentasi + push

**Files:**
- Modify: `docs/DEVELOPER-KIDZPLAYFUL.md` (+ regen HTML/PDF)

- [ ] **Step 1: Gerbang mutu penuh**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc 0; semua test PASS (termasuk voucher.test.ts); build 0.

- [ ] **Step 2: Update DEVELOPER doc**

Tambahkan seksi "🎟️ Voucher — `/admin/voucher`" (master `voucher` + `voucher_redeem`, kolom `voucher_id`/`potongan_voucher` di `pendaftaran_event`/`pesanan`, migrasi 0084; util `domain/voucher.ts`; `cekVoucher`; redeem di event & produk; kuota total+per-user, dilepas saat tolak/batal; ledger net; laporan detail). Set rentang migrasi `0001..0084`; tambah baris kamus `voucher`/`voucher_redeem`. Regen HTML+PDF.

- [ ] **Step 3: Commit & push**

```bash
git add docs/DEVELOPER-KIDZPLAYFUL.md docs/DEVELOPER-KIDZPLAYFUL.html docs/DEVELOPER-KIDZPLAYFUL.pdf
git -c commit.gpgsign=false commit -m "docs: master voucher & redeem transaksi (0084)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin master
```

---

## Verifikasi end-to-end (manual, setelah deploy + migrasi 0084)
1. Jalankan `0084_voucher.sql` di Supabase SQL Editor.
2. `/admin/voucher` → buat voucher event (persen 20, kuota total 2, per user 1, berlaku s/d besok, aktif).
3. Pendaftaran event → masukkan kode → Terapkan → potongan tampil, total berkurang → daftar → tersimpan (`pendaftaran_event.voucher_id/potongan_voucher`, `voucher_redeem` bertambah).
4. User sama pakai kode SAMA lagi → "Kamu sudah memakai voucher ini". Kode di beli produk → "tidak berlaku untuk transaksi ini".
5. Lewati tanggal → "kadaluarsa"; kuota total habis → "Kuota voucher habis".
6. Admin Tolak pendaftaran → `voucher_redeem` terhapus (kuota kembali).
7. Admin Terima → `/admin/keuangan` pendapatan = total net; detail transaksi tampil "🎟️ Voucher".

## Catatan
- 1 voucher per transaksi (unique index `voucher_redeem(ref_tipe,ref_id)`).
- Kuota terpakai saat redeem; dilepas saat ditolak (event) / batal (pesanan).
- Diskon langganan tetap diterapkan lebih dulu; voucher menumpuk di atasnya.
