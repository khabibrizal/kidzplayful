# KidzPlayful — M4-Bisnis: Admin Langganan + Laporan Member — Implementation Plan

> Pola subagent-driven. Langkah pakai checkbox `- [ ]`.

**Goal:** Panel Owner untuk sisi bisnis: **Kelola Langganan** (lihat semua member + **aktivasi manual** setelah bayar) dan **Laporan Member** (ringkasan langganan, estimasi pendapatan/MRR, keterlibatan, daftar member).

**Architecture:** Lanjutan M4. Tambah RLS agar **admin boleh membaca** `profiles`/`anak`/`langganan`/`hasil_main` semua user + **update `langganan`**. Status langganan efektif dihitung dari tanggal (reuse `statusLangganan` M1). Ringkasan/MRR = fungsi murni teruji-unit. Halaman = Server Components + Server Action aktivasi.

**Prasyarat:** M1–M4 + revisi video selesai; akun admin di-set (`is_admin=true`). Acuan spec: §16 (Laporan Data Member), §8.3 (alur owner), §15 (ERD).

---

## Task 1: Migrasi RLS admin-bisnis

**Files:** Create `supabase/migrations/0006_admin_bisnis.sql`

- [ ] **Step 1: Tulis migrasi**

```sql
-- supabase/migrations/0006_admin_bisnis.sql
-- admin boleh baca data semua member (kebijakan lama tetap: user baca miliknya sendiri)
create policy "admin baca profiles" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "admin baca anak" on public.anak
  for select to authenticated using (public.is_admin());
create policy "admin baca langganan" on public.langganan
  for select to authenticated using (public.is_admin());
create policy "admin baca hasil" on public.hasil_main
  for select to authenticated using (public.is_admin());
-- admin boleh aktivasi/ubah langganan
create policy "admin update langganan" on public.langganan
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
```

- [ ] **Step 2: Terapkan** (Dashboard SQL Editor / `supabase db push`).
Expected: 5 policy baru.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(db): RLS admin baca member + update langganan"`

---

## Task 2: Logika murni — ringkasan langganan & MRR

**Files:** Create `src/lib/domain/laporan.ts`, `src/lib/domain/__tests__/laporan.test.ts`

- [ ] **Step 1: Tulis test gagal**

```ts
// src/lib/domain/__tests__/laporan.test.ts
import { describe, it, expect } from 'vitest';
import { ringkasanLangganan } from '../laporan';

const d = (s: string) => new Date(s + 'T00:00:00Z');
const now = d('2026-06-20');

describe('ringkasanLangganan', () => {
  it('menghitung status efektif + MRR', () => {
    const r = ringkasanLangganan([
      { trial_mulai: '2026-06-18', aktif_sampai: null, nominal: 0 },     // trial
      { trial_mulai: '2026-05-01', aktif_sampai: '2026-12-31', nominal: 35000 }, // aktif
      { trial_mulai: '2026-06-01', aktif_sampai: null, nominal: 0 },     // 2026-06-15 trial end -> +3 tenggang = 18 -> 20 kadaluarsa
    ], now);
    expect(r.aktif).toBe(1);
    expect(r.trial).toBe(1);
    expect(r.kadaluarsa).toBe(1);
    expect(r.mrr).toBe(35000);
    expect(r.total).toBe(3);
  });
});
```

- [ ] **Step 2: Jalankan → gagal** `npx vitest run src/lib/domain/__tests__/laporan.test.ts`

- [ ] **Step 3: Implementasi**

```ts
// src/lib/domain/laporan.ts
import { statusLangganan } from './trial';

export interface BarisLangganan {
  trial_mulai: string;
  aktif_sampai: string | null;
  nominal: number;
}

export interface Ringkasan {
  total: number; aktif: number; trial: number; tenggang: number; kadaluarsa: number; mrr: number;
}

export function ringkasanLangganan(rows: BarisLangganan[], sekarang: Date): Ringkasan {
  const r: Ringkasan = { total: rows.length, aktif: 0, trial: 0, tenggang: 0, kadaluarsa: 0, mrr: 0 };
  for (const row of rows) {
    const st = statusLangganan(
      {
        trialMulai: new Date(row.trial_mulai + 'T00:00:00Z'),
        aktifSampai: row.aktif_sampai ? new Date(row.aktif_sampai + 'T00:00:00Z') : null,
      },
      sekarang,
    );
    r[st] += 1;
    if (st === 'aktif') r.mrr += row.nominal || 0;
  }
  return r;
}
```

- [ ] **Step 4: Jalankan → lulus** `npx vitest run src/lib/domain/__tests__/laporan.test.ts`

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(domain): ringkasanLangganan + MRR + tests"`

---

## Task 3: Data layer admin-bisnis

**Files:** Create `src/lib/data/admin-bisnis.ts`

- [ ] **Step 1: Tulis modul**

```ts
// src/lib/data/admin-bisnis.ts
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await supabase.from('profiles').select('is_admin').single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return { supabase, adminId: user.id };
}

export async function aktifkanLangganan(ortuId: string, nominal: number, dibayarVia: string) {
  const { supabase, adminId } = await adminDb();
  const sampai = new Date();
  sampai.setMonth(sampai.getMonth() + 1);
  const aktifSampai = sampai.toISOString().slice(0, 10);
  const { error } = await supabase.from('langganan').update({
    status: 'aktif', nominal: nominal || 0, dibayar_via: dibayarVia || 'manual',
    aktif_sampai: aktifSampai, diaktifkan_oleh: adminId, updated_at: new Date().toISOString(),
  }).eq('ortu_id', ortuId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/langganan');
}
```

> Catatan: fungsi pembaca (member list, keterlibatan) diletakkan langsung di komponen halaman (Server Component) memakai `createClient()` — bukan di file `'use server'` ini, agar tidak semua jadi server-action.

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit`.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(admin): server action aktifkanLangganan"`

---

## Task 4: Halaman Kelola Langganan (/admin/langganan)

**Files:** Create `src/app/admin/langganan/page.tsx`, `src/app/admin/langganan/AktifkanForm.tsx`

- [ ] **Step 1: Form aktivasi (client)**

```tsx
// src/app/admin/langganan/AktifkanForm.tsx
'use client';
import { useState } from 'react';
import { aktifkanLangganan } from '@/lib/data/admin-bisnis';
import s from '../admin.module.css';

export default function AktifkanForm({ ortuId }: { ortuId: string }) {
  const [nominal, setNominal] = useState('35000');
  const [via, setVia] = useState('transfer');
  const [loading, setLoading] = useState(false);

  async function aktif() {
    setLoading(true);
    try { await aktifkanLangganan(ortuId, Number(nominal) || 0, via); location.reload(); }
    finally { setLoading(false); }
  }

  return (
    <div className={s.row}>
      <input className={s.inp} value={nominal} onChange={(e) => setNominal(e.target.value)} style={{ width: 90 }} title="nominal" />
      <select className={s.inp} value={via} onChange={(e) => setVia(e.target.value)}>
        <option value="transfer">Transfer</option>
        <option value="qris">QRIS</option>
      </select>
      <button className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }} onClick={aktif} disabled={loading}>
        {loading ? '...' : 'Aktifkan'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Halaman**

```tsx
// src/app/admin/langganan/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan } from '@/lib/domain/trial';
import AktifkanForm from './AktifkanForm';
import s from '../admin.module.css';

type Row = {
  id: string; email: string;
  anak: { nama: string }[];
  langganan: { status: string; nominal: number; trial_mulai: string; aktif_sampai: string | null } | null;
};

export default async function Langganan() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id,email,anak(nama),langganan(status,nominal,trial_mulai,aktif_sampai)')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const now = new Date();

  function statusEfektif(l: Row['langganan']) {
    if (!l) return 'kadaluarsa';
    return statusLangganan(
      { trialMulai: new Date(l.trial_mulai + 'T00:00:00Z'), aktifSampai: l.aktif_sampai ? new Date(l.aktif_sampai + 'T00:00:00Z') : null },
      now,
    );
  }
  const warna: Record<string, string> = { aktif: s.tagOk, trial: s.tagDraf, tenggang: s.tagDraf, kadaluarsa: s.danger };

  return (
    <div>
      <Link href="/admin" className={s.muted}>← dashboard</Link>
      <div className={s.head} style={{ marginTop: 8 }}><h1>💳 Kelola Langganan</h1><Link href="/admin/laporan" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>📊 Laporan</Link></div>
      <p className={s.muted}>Setelah member transfer/QRIS, klik Aktifkan (langganan +1 bulan).</p>

      {rows.map((m) => {
        const st = statusEfektif(m.langganan);
        return (
          <div key={m.id} className={s.card}>
            <div className={s.row}>
              <span style={{ flex: 1 }}><b>{m.email}</b><br /><span className={s.muted}>{m.anak.map((a) => a.nama).join(', ') || 'belum ada anak'}</span></span>
              <span className={`${s.tag} ${warna[st] ?? ''}`}>{st}</span>
            </div>
            {st !== 'aktif' && <div style={{ marginTop: 8 }}><AktifkanForm ortuId={m.id} /></div>}
          </div>
        );
      })}
      {rows.length === 0 && <p className={s.muted}>Belum ada member.</p>}
    </div>
  );
}
```

- [ ] **Step 3: Verifikasi** `npx tsc --noEmit && npm run build` → route `/admin/langganan` dinamis.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat(admin): halaman Kelola Langganan + aktivasi manual"`

---

## Task 5: Halaman Laporan Member (/admin/laporan)

**Files:** Create `src/app/admin/laporan/page.tsx`

- [ ] **Step 1: Tulis halaman**

```tsx
// src/app/admin/laporan/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ringkasanLangganan, type BarisLangganan } from '@/lib/domain/laporan';
import s from '../admin.module.css';

function rupiah(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }

export default async function Laporan() {
  const supabase = await createClient();
  const { data: lang } = await supabase.from('langganan').select('trial_mulai,aktif_sampai,nominal');
  const { data: hasil } = await supabase.from('hasil_main').select('mesin,durasi_detik,tema_id');
  const { data: tema } = await supabase.from('tema').select('id,nama');

  const r = ringkasanLangganan((lang ?? []) as unknown as BarisLangganan[], new Date());

  const rows = hasil ?? [];
  const totalSesi = rows.length;
  const rataMenit = totalSesi ? Math.round((rows.reduce((a, x) => a + (x.durasi_detik || 0), 0) / totalSesi / 60) * 10) / 10 : 0;
  const hitung = <T extends string>(arr: (T | null)[]) => {
    const m = new Map<string, number>();
    for (const v of arr) if (v) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
  };
  const mesinPopuler = hitung(rows.map((x) => x.mesin as string));
  const temaMap = new Map((tema ?? []).map((t) => [t.id, t.nama]));
  const temaPopulerId = hitung(rows.map((x) => x.tema_id as string | null));
  const temaPopuler = temaMap.get(temaPopulerId) ?? '-';

  const Stat = ({ b, l }: { b: string; l: string }) => (
    <div className={s.card} style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800 }}>{b}</div><div className={s.muted}>{l}</div></div>
  );

  return (
    <div>
      <Link href="/admin" className={s.muted}>← dashboard</Link>
      <div className={s.head} style={{ marginTop: 8 }}><h1>📊 Laporan Member</h1><Link href="/admin/langganan" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>💳 Kelola</Link></div>

      <div className={s.section}>Ringkasan Langganan & Pendapatan</div>
      <div className={s.row}><Stat b={String(r.aktif)} l="Aktif" /><Stat b={String(r.trial)} l="Trial" /><Stat b={String(r.kadaluarsa)} l="Kadaluarsa" /><Stat b={rupiah(r.mrr)} l="Estimasi MRR" /></div>

      <div className={s.section}>Keterlibatan</div>
      <div className={s.row}><Stat b={`${rataMenit} mnt`} l="Rata main/sesi" /><Stat b={String(totalSesi)} l="Total sesi main" /><Stat b={temaPopuler} l="Tema populer" /><Stat b={mesinPopuler} l="Game populer" /></div>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit && npm run build` → route `/admin/laporan` dinamis.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(admin): halaman Laporan Member (ringkasan+MRR+keterlibatan)"`

---

## Task 6: Nav admin (tautan ke Langganan & Laporan)

**Files:** Modify `src/app/admin/page.tsx`

- [ ] **Step 1: Tambah tautan** di baris nav admin (dekat tautan "📺 Kelola Video"), tambahkan:

```tsx
        <Link href="/admin/langganan" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginLeft: 6 }}>💳 Langganan</Link>
        <Link href="/admin/laporan" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginLeft: 6 }}>📊 Laporan</Link>
```
(Tempatkan di paragraf yang sama dengan tautan Kelola Video.)

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit && npm run build`.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(admin): nav ke Langganan & Laporan"`

---

## Task 7: Verifikasi akhir

- [ ] **Step 1: Unit** `npm test` → 27 test (25 + ringkasanLangganan... hitung: laporan.test 1 file 1 test → 26). Laporkan angka sebenarnya.
- [ ] **Step 2: Build** `npm run build` → sukses; route `/admin/langganan` & `/admin/laporan` dinamis.
- [ ] **Step 3: Smoke manual** (akun admin, perlu migrasi 0006 + RLS):
  - /admin → 💳 Langganan → daftar member tampil; pada member non-aktif klik **Aktifkan** (nominal 35000, transfer) → status jadi **aktif**.
  - /admin → 📊 Laporan → kartu Ringkasan (Aktif/Trial/Kadaluarsa/MRR) & Keterlibatan terisi.
- [ ] **Step 4: Commit penutup** bila ada.

---

## Definition of Done
- Admin dapat melihat **semua member** + status langganan efektif, dan **mengaktifkan langganan manual** (+1 bulan, nominal, via) — tercermin di status.
- **Laporan Member**: ringkasan langganan (aktif/trial/kadaluarsa), **estimasi MRR**, dan keterlibatan (rata main, total sesi, tema & game populer).
- RLS: admin baca data member + update langganan; member biasa tetap hanya data sendiri.
- Unit test hijau (≥26), build sukses, smoke manual OK.

## Catatan
- "Member baru per periode" & churn berbasis tanggal bisa ditambah nanti (filter periode).
- Pembayaran otomatis (Midtrans/Xendit) tetap di roadmap; ini aktivasi manual (Opsi B).
