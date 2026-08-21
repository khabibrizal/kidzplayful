# Langganan Per Anak & Bertingkat — Sub-Proyek A1 (Fondasi) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah langganan dari satu saklar tingkat akun (`status === 'aktif'`) menjadi **paket berjenjang yang dikelola admin dan menempel pada tiap ANAK**, lengkap dengan gerbang worksheet dan diskon per paket — tanpa menyentuh sisi pembayaran.

**Architecture:** Satu tabel master `paket_langganan` (semua hak akses adalah *data*, bukan cabang `if` di kode) + satu tabel `langganan_anak` (periode berbayar per anak). Seluruh keputusan hak akses dipusatkan di satu modul murni `src/lib/domain/entitlement.ts` yang diuji sebagai matriks, lalu dipakai oleh halaman-halaman yang sekarang memanggil `dibatasiTrial()`. Semua kolom baru dibaca **toleran** (default bila `42703`) karena kode tayang sebelum migrasi manual dijalankan.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), Supabase Postgres + RLS, TypeScript, Vitest.

---

## Lingkup rencana ini

PRD memuat **lima sub-proyek**. Rencana ini **hanya A1**, karena hanya A1 yang bisa dirilis sendiri dan menghasilkan perangkat lunak yang bekerja & teruji. Sub-proyek berikut dapat rencananya sendiri **setelah A1 selesai**:

| Sub-proyek | Rencana terpisah |
|---|---|
| **A2** Pilih paket per anak + tagihan + verifikasi admin | `2026-08-2x-langganan-per-anak-a2.md` |
| **B** Konsultasi bayar-per-sesi + kuota gratis | `2026-08-2x-konsultasi-bayar-per-sesi.md` |
| **C** Pencatatan aktivitas mandiri + rapor bulanan | `2026-08-2x-rapor-bulanan.md` |
| **D** Rebranding preschool homeschooling | `2026-08-2x-rebranding-preschool.md` |

**Yang membuat A1 sudah berguna tanpa A2:** admin bisa menetapkan paket & masa aktif per anak langsung dari halaman Langganan (Task 10). Jadi paket sungguh berlaku, worksheet sungguh terkunci, diskon sungguh jalan — pembayaran mandiri oleh orang tua menyusul di A2.

**Catatan nomor migrasi:** migrasi terakhir di repo adalah `0088`. A1 memakai **`0089`**. Rencana konsultasi (B) yang sebelumnya menyebut `0089` menjadi `0090` saat dikerjakan.

---

## Struktur berkas

| Berkas | Tanggung jawab |
|---|---|
| `supabase/migrations/0089_paket_langganan.sql` | **Create.** Master paket + seed, `langganan_anak` + backfill, `worksheet_terbuka`, `diskon_paket`, kolom trial |
| `src/lib/game/tipe.ts` | **Modify.** Tipe `PaketLangganan`, `BarisLanggananAnak` |
| `src/lib/domain/entitlement.ts` | **Create.** SATU tempat keputusan hak akses (murni, diuji) |
| `src/lib/domain/trial.ts` | **Modify.** Lama trial & tenggang jadi parameter, bukan konstanta mati |
| `src/lib/domain/harga.ts` | **Modify.** Persen diskon dibaca dari peta per-paket, cadangan ke kolom lama |
| `src/lib/data/paket.ts` | **Create.** Reader master paket (toleran) |
| `src/lib/data/paket-actions.ts` | **Create.** CRUD paket (guard admin) |
| `src/lib/data/langganan-anak.ts` | **Create.** Reader hak akses per anak & per akun |
| `src/lib/data/langganan-anak-actions.ts` | **Create.** Admin menetapkan paket/periode per anak |
| `src/lib/data/pengaturan-trial.ts` | **Modify.** Tambah `trial_hari`, `trial_paket_id` (toleran) |
| `src/app/admin/paket/` | **Create.** Halaman master paket |
| `src/components/KelasIsi.tsx` | **Modify.** Gerbang tombol Worksheet |
| 7 halaman pemanggil `dibatasiTrial` | **Modify.** Beralih ke hak akses |

---

## Task 1: Migrasi 0089 — skema paket & langganan per anak

**Files:**
- Create: `supabase/migrations/0089_paket_langganan.sql`

- [ ] **Step 1: Tulis berkas migrasi**

```sql
-- 0089_paket_langganan.sql — Paket langganan bertingkat & berbayar PER ANAK.
--
-- Prinsip: semua HAK AKSES adalah DATA di baris paket, bukan cabang if di kode, supaya
-- pemilik bisa mengubah fasilitas/harga tanpa deploy (permintaan eksplisit: "tanpa hardcode").
-- Diskon per item disimpan sebagai PETA per kode paket (jsonb), bukan kolom per paket, supaya
-- menambah paket ketiga tidak butuh migrasi baru.

-- 1) Master paket ------------------------------------------------------------
create table if not exists public.paket_langganan (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,               -- 'basic' | 'preschool' — STABIL, jangan diubah
  nama text not null,
  deskripsi text,
  benefit jsonb not null default '[]',     -- ["Semua ide bermain","Diskon event", ...]
  harga_bulanan int not null default 0,    -- per ANAK per bulan
  diskon_keluarga jsonb not null default '[]', -- [{min_anak:2,persen:10},{min_anak:4,nominal:30000}]
  akses_ide_bermain boolean not null default true,
  akses_game boolean not null default true,
  akses_video boolean not null default true,
  akses_komunitas boolean not null default true,
  worksheet boolean not null default false,
  konsultasi_gratis_jumlah int not null default 0,
  konsultasi_gratis_satuan text not null default 'bulan' check (konsultasi_gratis_satuan in ('bulan','langganan')),
  rapor_bulanan boolean not null default false,
  urutan int not null default 0,           -- juga menentukan "paket tertinggi"
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.paket_langganan (kode, nama, deskripsi, benefit, harga_bulanan, diskon_keluarga,
  worksheet, konsultasi_gratis_jumlah, konsultasi_gratis_satuan, rapor_bulanan, urutan)
values
  ('basic', 'Basic', 'Bermain & belajar mandiri di rumah.',
   '["Semua Ide Bermain","Semua game edukasi","Pojok Video","Diskon event","Diskon produk","Gratis 1x konsultasi psikolog"]',
   0, '[]', false, 1, 'langganan', false, 10),
  ('preschool', 'Preschool', 'Kurikulum homeschooling lengkap dengan pendampingan.',
   '["Semua Ide Bermain","Unduh semua worksheet","Semua game edukasi","Pojok Video","Diskon event","Diskon produk","Konsultasi psikolog tiap bulan","Rapor bulanan yang bisa diunduh"]',
   0, '[{"min_anak":2,"persen":10}]', true, 1, 'bulan', true, 20)
on conflict (kode) do nothing;   -- idempoten: jangan menimpa harga yang sudah diisi admin

alter table public.paket_langganan enable row level security;
drop policy if exists "paket baca semua" on public.paket_langganan;
create policy "paket baca semua" on public.paket_langganan for select to authenticated, anon using (true);
drop policy if exists "paket kelola admin" on public.paket_langganan;
create policy "paket kelola admin" on public.paket_langganan for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2) Langganan PER ANAK ------------------------------------------------------
create table if not exists public.langganan_anak (
  anak_id uuid primary key references public.anak(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  paket_id uuid references public.paket_langganan(id) on delete set null,
  paket_berikutnya_id uuid references public.paket_langganan(id) on delete set null,
  aktif_sampai date,
  updated_at timestamptz not null default now()
);
create index if not exists idx_langganan_anak_ortu on public.langganan_anak(ortu_id);

alter table public.langganan_anak enable row level security;
drop policy if exists "langganan anak baca" on public.langganan_anak;
create policy "langganan anak baca" on public.langganan_anak for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin());
-- Tulis HANYA admin. Orang tua mengubah paket berikutnya lewat server action (A2), bukan langsung.
drop policy if exists "langganan anak kelola admin" on public.langganan_anak;
create policy "langganan anak kelola admin" on public.langganan_anak for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 3) Backfill member yang SEKARANG aktif → semua anaknya Preschool sampai periode habis.
--    (Keputusan pemilik: tidak boleh ada yang kehilangan akses di tengah periode terbayar.)
insert into public.langganan_anak (anak_id, ortu_id, paket_id, aktif_sampai)
select a.id, a.ortu_id,
       (select id from public.paket_langganan where kode = 'preschool'),
       l.aktif_sampai
from public.anak a
join public.langganan l on l.ortu_id = a.ortu_id
where l.aktif_sampai is not null and l.aktif_sampai >= current_date
on conflict (anak_id) do nothing;

-- 4) Worksheet: penanda "contoh terbuka" per materi -------------------------
alter table public.kelas_bermain add column if not exists worksheet_terbuka boolean not null default false;

-- 5) Diskon per paket pada event & produk (peta kode paket → persen) --------
alter table public.event  add column if not exists diskon_paket jsonb not null default '{}';
alter table public.produk add column if not exists diskon_paket jsonb not null default '{}';

-- 6) Trial jadi setelan admin (menggantikan konstanta TRIAL_HARI di kode) ---
alter table public.pengaturan_trial add column if not exists trial_hari int not null default 30;
alter table public.pengaturan_trial add column if not exists trial_paket_id uuid references public.paket_langganan(id) on delete set null;
update public.pengaturan_trial
   set trial_paket_id = (select id from public.paket_langganan where kode = 'basic')
 where id = 1 and trial_paket_id is null;
```

- [ ] **Step 2: Periksa idempotensi**

Baca ulang berkasnya dan pastikan **setiap** pernyataan aman dijalankan dua kali: `create table if not exists`, `add column if not exists`, `drop policy if exists` sebelum `create policy`, `on conflict do nothing` pada kedua `insert`. Migrasi ini akan dijalankan manual di database berisi data — sekali gagal di tengah, sisanya tidak jalan.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0089_paket_langganan.sql
git commit -m "feat(langganan): migrasi 0089 — master paket & langganan per anak"
```

---

## Task 2: Tipe bersama

**Files:**
- Modify: `src/lib/game/tipe.ts`

- [ ] **Step 1: Tambahkan tipe di akhir berkas**

```ts
// ——— Langganan bertingkat (migrasi 0089) ———
export type SatuanKuota = 'bulan' | 'langganan';

export interface AturanKeluarga { min_anak: number; persen?: number; nominal?: number }

export interface PaketLangganan {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
  benefit: string[];
  harga_bulanan: number;
  diskon_keluarga: AturanKeluarga[];
  akses_ide_bermain: boolean;
  akses_game: boolean;
  akses_video: boolean;
  akses_komunitas: boolean;
  worksheet: boolean;
  konsultasi_gratis_jumlah: number;
  konsultasi_gratis_satuan: SatuanKuota;
  rapor_bulanan: boolean;
  urutan: number;
  aktif: boolean;
}

export interface BarisLanggananAnak {
  anak_id: string;
  paket_id: string | null;
  paket_berikutnya_id: string | null;
  aktif_sampai: string | null;   // 'YYYY-MM-DD'
}
```

- [ ] **Step 2: Pastikan masih ter-compile**

Run: `npx tsc --noEmit`
Expected: keluaran kosong (tanpa error).

- [ ] **Step 3: Commit**

```bash
git add src/lib/game/tipe.ts
git commit -m "feat(langganan): tipe PaketLangganan & BarisLanggananAnak"
```

---

## Task 3: Lama trial jadi parameter

Trial 30 hari adalah keputusan produk yang harus bisa diubah admin. Hari ini `TRIAL_HARI = 14` adalah konstanta mati di `src/lib/domain/trial.ts`.

**Files:**
- Modify: `src/lib/domain/trial.ts`
- Test: `src/lib/domain/__tests__/trial.test.ts`

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan di `src/lib/domain/__tests__/trial.test.ts`:

```ts
describe('lama trial bisa diatur', () => {
  const trialMulai = d('2026-06-01');
  it('memakai 30 hari bila diminta', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-25'), { trialHari: 30 })).toBe('trial');
  });
  it('tenggang dihitung setelah trial yang diperpanjang', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-07-02'), { trialHari: 30 })).toBe('tenggang');
  });
  it('kadaluarsa setelah trial 30 hari + tenggang', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-07-10'), { trialHari: 30 })).toBe('kadaluarsa');
  });
  it('computeTrialEnd menghormati jumlah hari', () => {
    expect(computeTrialEnd(d('2026-06-01'), 30).toISOString()).toBe(d('2026-07-01').toISOString());
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan GAGAL**

Run: `npx vitest run src/lib/domain/__tests__/trial.test.ts`
Expected: FAIL — `statusLangganan` hanya menerima 2 argumen, `computeTrialEnd` hanya 1.

- [ ] **Step 3: Ubah `src/lib/domain/trial.ts`**

Ganti isi bagian atas berkas menjadi:

```ts
// src/lib/domain/trial.ts
// Lama trial & tenggang adalah PARAMETER, bukan konstanta mati: pemilik mengaturnya di
// /admin/pengaturan-trial (kolom pengaturan_trial.trial_hari, migrasi 0089). Nilai di bawah
// hanya CADANGAN bila setelannya belum terbaca.
export const TRIAL_HARI = 30;
export const TENGGANG_HARI = 3;

const HARI = 24 * 60 * 60 * 1000;

export interface OpsiTrial { trialHari?: number; tenggangHari?: number }

export function computeTrialEnd(trialMulai: Date, trialHari: number = TRIAL_HARI): Date {
  return new Date(trialMulai.getTime() + trialHari * HARI);
}

export type StatusLangganan = 'aktif' | 'trial' | 'tenggang' | 'kadaluarsa';

export function statusLangganan(
  l: { trialMulai: Date; aktifSampai: Date | null },
  sekarang: Date,
  opsi: OpsiTrial = {},
): StatusLangganan {
  if (l.aktifSampai && sekarang <= l.aktifSampai) return 'aktif';
  const akhirTrial = computeTrialEnd(l.trialMulai, opsi.trialHari ?? TRIAL_HARI);
  if (sekarang <= akhirTrial) return 'trial';
  const akhirTenggang = new Date(akhirTrial.getTime() + (opsi.tenggangHari ?? TENGGANG_HARI) * HARI);
  if (sekarang <= akhirTenggang) return 'tenggang';
  return 'kadaluarsa';
}

export function bolehAkses(s: StatusLangganan): boolean {
  return s === 'aktif' || s === 'trial' || s === 'tenggang';
}
```

- [ ] **Step 4: Perbaiki tes lama yang mengunci angka 14**

Tes lama menuliskan 14 hari secara harfiah. Ganti agar mengikuti konstanta, bukan angka mati:

```ts
import { computeTrialEnd, statusLangganan, TRIAL_HARI } from '../trial';

describe('computeTrialEnd', () => {
  it('menambah TRIAL_HARI dari tanggal daftar', () => {
    const mulai = d('2026-06-01');
    const harap = new Date(mulai.getTime() + TRIAL_HARI * 24 * 60 * 60 * 1000);
    expect(computeTrialEnd(mulai).toISOString()).toBe(harap.toISOString());
  });
});
```

Lalu di blok `describe('statusLangganan')` yang lama, tambahkan `{ trialHari: 14 }` sebagai argumen ketiga pada tiap pemanggilan yang mengasumsikan trial 14 hari, sehingga tesnya tetap menguji perilaku yang sama secara eksplisit.

- [ ] **Step 5: Jalankan tes, pastikan LULUS**

Run: `npx vitest run src/lib/domain/__tests__/trial.test.ts`
Expected: PASS semua.

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/trial.ts src/lib/domain/__tests__/trial.test.ts
git commit -m "feat(langganan): lama trial jadi parameter (bawaan 30 hari)"
```

---

## Task 4: Modul hak akses (inti A1)

**Files:**
- Create: `src/lib/domain/entitlement.ts`
- Test: `src/lib/domain/__tests__/entitlement.test.ts`

- [ ] **Step 1: Tulis tes yang gagal**

```ts
// src/lib/domain/__tests__/entitlement.test.ts
import { describe, it, expect } from 'vitest';
import { hakAksesAnak, hakAksesAkun, HAK_KOSONG } from '../entitlement';
import type { PaketLangganan, BarisLanggananAnak } from '@/lib/game/tipe';

const paket = (kode: string, urutan: number, lebih: Partial<PaketLangganan> = {}): PaketLangganan => ({
  id: `id-${kode}`, kode, nama: kode, deskripsi: null, benefit: [], harga_bulanan: 75000,
  diskon_keluarga: [], akses_ide_bermain: true, akses_game: true, akses_video: true,
  akses_komunitas: true, worksheet: false, konsultasi_gratis_jumlah: 0,
  konsultasi_gratis_satuan: 'bulan', rapor_bulanan: false, urutan, aktif: true, ...lebih,
});

const BASIC = paket('basic', 10);
const PRESCHOOL = paket('preschool', 20, { worksheet: true, rapor_bulanan: true, konsultasi_gratis_jumlah: 1 });
const map = new Map([[BASIC.id, BASIC], [PRESCHOOL.id, PRESCHOOL]]);

const baris = (lebih: Partial<BarisLanggananAnak> = {}): BarisLanggananAnak =>
  ({ anak_id: 'a1', paket_id: null, paket_berikutnya_id: null, aktif_sampai: null, ...lebih });

const trial = { trialMulai: '2026-06-01', trialHari: 30, tenggangHari: 3, trialPaketId: BASIC.id };
const kini = new Date('2026-08-01T00:00:00Z');

describe('hakAksesAnak', () => {
  it('anak berbayar aktif memakai hak paketnya', () => {
    const h = hakAksesAnak(baris({ paket_id: PRESCHOOL.id, aktif_sampai: '2026-09-01' }), map, trial, kini);
    expect(h.status).toBe('aktif');
    expect(h.worksheet).toBe(true);
    expect(h.raporBulanan).toBe(true);
    expect(h.konsultasiGratis.jumlah).toBe(1);
  });

  it('anak tanpa baris langganan tapi akun masih trial memakai paket acuan trial', () => {
    const trialAktif = { ...trial, trialMulai: '2026-07-20' };
    const h = hakAksesAnak(null, map, trialAktif, kini);
    expect(h.status).toBe('trial');
    expect(h.paket?.kode).toBe('basic');
    expect(h.worksheet).toBe(false);   // worksheet BUKAN hak Basic
    expect(h.game).toBe(true);
  });

  it('lewat masa aktif tapi masih tenggang tetap memakai paket terakhir', () => {
    const h = hakAksesAnak(baris({ paket_id: PRESCHOOL.id, aktif_sampai: '2026-07-31' }), map, trial, kini);
    expect(h.status).toBe('tenggang');
    expect(h.worksheet).toBe(true);
  });

  it('kadaluarsa tidak punya hak konten apa pun', () => {
    const h = hakAksesAnak(baris({ paket_id: PRESCHOOL.id, aktif_sampai: '2026-06-01' }), map, trial, kini);
    expect(h.status).toBe('kadaluarsa');
    expect(h).toMatchObject({ ...HAK_KOSONG, status: 'kadaluarsa', paket: null });
  });

  it('paket_id yang tak ada di master jatuh ke hak kosong, bukan melempar', () => {
    const h = hakAksesAnak(baris({ paket_id: 'id-hilang', aktif_sampai: '2026-09-01' }), map, trial, kini);
    expect(h.paket).toBeNull();
    expect(h.worksheet).toBe(false);
  });
});

describe('hakAksesAkun', () => {
  it('memakai paket TERTINGGI di antara anak yang aktif', () => {
    const anak = [
      hakAksesAnak(baris({ anak_id: 'a1', paket_id: BASIC.id, aktif_sampai: '2026-09-01' }), map, trial, kini),
      hakAksesAnak(baris({ anak_id: 'a2', paket_id: PRESCHOOL.id, aktif_sampai: '2026-09-01' }), map, trial, kini),
    ];
    const akun = hakAksesAkun(anak);
    expect(akun.paketTertinggi?.kode).toBe('preschool');
    expect(akun.diskonKode).toBe('preschool');
    expect(akun.komunitas).toBe(true);
  });

  it('akun tanpa anak aktif tidak punya paket tertinggi', () => {
    const akun = hakAksesAkun([]);
    expect(akun.paketTertinggi).toBeNull();
    expect(akun.diskonKode).toBeNull();
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan GAGAL**

Run: `npx vitest run src/lib/domain/__tests__/entitlement.test.ts`
Expected: FAIL — `Cannot find module '../entitlement'`.

- [ ] **Step 3: Tulis `src/lib/domain/entitlement.ts`**

```ts
// src/lib/domain/entitlement.ts — SATU tempat keputusan hak akses.
//
// Kenapa dipusatkan: sebelum ini, akses ditentukan oleh `dibatasiTrial(status)` yang
// bertebaran di 7 halaman dan hanya mengenal dua keadaan (aktif / bukan). Dengan paket
// berjenjang DAN status yang menempel pada tiap anak, cabang boolean seperti itu mustahil
// benar. Semua hak sekarang DATA dari baris paket; berkas ini hanya memilih paket mana yang
// berlaku untuk sebuah anak pada sebuah waktu.
import { statusLangganan, type StatusLangganan } from './trial';
import type { PaketLangganan, BarisLanggananAnak, SatuanKuota } from '@/lib/game/tipe';

export interface KonfigTrial {
  trialMulai: string | null;   // 'YYYY-MM-DD' dari langganan akun
  trialHari: number;
  tenggangHari: number;
  trialPaketId: string | null;
}

export interface HakAksesAnak {
  status: StatusLangganan;
  paket: PaketLangganan | null;
  ideBermain: boolean;
  game: boolean;
  video: boolean;
  worksheet: boolean;
  raporBulanan: boolean;
  konsultasiGratis: { jumlah: number; satuan: SatuanKuota };
}

/** Hak paling dasar: boleh melihat rapor lama, tanpa konten baru. */
export const HAK_KOSONG: Omit<HakAksesAnak, 'status' | 'paket'> = {
  ideBermain: false, game: false, video: false, worksheet: false, raporBulanan: false,
  konsultasiGratis: { jumlah: 0, satuan: 'bulan' },
};

const tgl = (s: string | null): Date | null => (s ? new Date(s + 'T00:00:00Z') : null);

function dariPaket(p: PaketLangganan): Omit<HakAksesAnak, 'status' | 'paket'> {
  return {
    ideBermain: p.akses_ide_bermain,
    game: p.akses_game,
    video: p.akses_video,
    worksheet: p.worksheet,
    raporBulanan: p.rapor_bulanan,
    konsultasiGratis: { jumlah: p.konsultasi_gratis_jumlah, satuan: p.konsultasi_gratis_satuan },
  };
}

/**
 * Hak akses satu anak.
 *
 * Urutan penentuannya: periode berbayar anak (paket_id + aktif_sampai) → bila belum pernah
 * bayar, masa trial AKUN (trial memang milik akun, bukan anak) → tenggang memakai paket
 * terakhir → selebihnya kadaluarsa.
 */
export function hakAksesAnak(
  baris: BarisLanggananAnak | null,
  paketMap: Map<string, PaketLangganan>,
  trial: KonfigTrial,
  sekarang: Date,
): HakAksesAnak {
  const aktifSampai = tgl(baris?.aktif_sampai ?? null);
  const paketAnak = baris?.paket_id ? paketMap.get(baris.paket_id) ?? null : null;

  // Sudah pernah berbayar → statusnya ditentukan periode anak itu sendiri.
  if (aktifSampai) {
    if (sekarang <= aktifSampai) {
      return paketAnak
        ? { status: 'aktif', paket: paketAnak, ...dariPaket(paketAnak) }
        : { status: 'aktif', paket: null, ...HAK_KOSONG };
    }
    const akhirTenggang = new Date(aktifSampai.getTime() + trial.tenggangHari * 24 * 60 * 60 * 1000);
    if (sekarang <= akhirTenggang && paketAnak) {
      return { status: 'tenggang', paket: paketAnak, ...dariPaket(paketAnak) };
    }
    return { status: 'kadaluarsa', paket: null, ...HAK_KOSONG };
  }

  // Belum pernah berbayar → ikut masa trial akun.
  const mulai = tgl(trial.trialMulai);
  if (!mulai) return { status: 'kadaluarsa', paket: null, ...HAK_KOSONG };
  const status = statusLangganan({ trialMulai: mulai, aktifSampai: null }, sekarang,
    { trialHari: trial.trialHari, tenggangHari: trial.tenggangHari });
  if (status === 'trial' || status === 'tenggang') {
    const paketTrial = trial.trialPaketId ? paketMap.get(trial.trialPaketId) ?? null : null;
    return paketTrial
      ? { status, paket: paketTrial, ...dariPaket(paketTrial) }
      : { status, paket: null, ...HAK_KOSONG };
  }
  return { status: 'kadaluarsa', paket: null, ...HAK_KOSONG };
}

export interface HakAksesAkun {
  paketTertinggi: PaketLangganan | null;
  /** kode paket yang dipakai untuk diskon event & produk (null = bukan pelanggan). */
  diskonKode: string | null;
  komunitas: boolean;
}

/**
 * Hak tingkat AKUN untuk fitur yang tidak punya konteks anak — diskon event & produk,
 * Komunitas, detail materi. Aturannya: pakai paket TERTINGGI (`urutan` terbesar) di antara
 * anak yang statusnya aktif/trial/tenggang. Satu keranjang belanja tak bisa memakai dua
 * tarif, dan memilih yang tertinggi adalah satu-satunya aturan yang tak pernah merugikan
 * pelanggan. Aturan ini WAJIB ditulis di UI, jangan disembunyikan.
 */
export function hakAksesAkun(hakAnak: HakAksesAnak[]): HakAksesAkun {
  const berlaku = hakAnak.filter((h) => h.paket && h.status !== 'kadaluarsa');
  const tertinggi = berlaku.reduce<PaketLangganan | null>(
    (t, h) => (h.paket && (!t || h.paket.urutan > t.urutan) ? h.paket : t), null);
  return {
    paketTertinggi: tertinggi,
    diskonKode: tertinggi?.kode ?? null,
    komunitas: tertinggi ? tertinggi.akses_komunitas : false,
  };
}
```

- [ ] **Step 4: Jalankan tes, pastikan LULUS**

Run: `npx vitest run src/lib/domain/__tests__/entitlement.test.ts`
Expected: PASS (7 tes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/entitlement.ts src/lib/domain/__tests__/entitlement.test.ts
git commit -m "feat(langganan): modul hak akses per anak + matriks tes"
```

---

## Task 5: Reader master paket (toleran)

**Files:**
- Create: `src/lib/data/paket.ts`

- [ ] **Step 1: Tulis berkasnya**

```ts
// src/lib/data/paket.ts — baca master paket langganan.
// TOLERAN: tabel `paket_langganan` (migrasi 0089) mungkin belum ada saat kode ini tayang,
// karena migrasi dijalankan MANUAL setelah deploy. Bila belum ada, kembalikan daftar kosong —
// seluruh aplikasi harus tetap hidup, hanya belum mengenal paket apa pun.
import { createClient } from '@/lib/supabase/server';
import type { PaketLangganan } from '@/lib/game/tipe';

const COLS = 'id,kode,nama,deskripsi,benefit,harga_bulanan,diskon_keluarga,akses_ide_bermain,'
  + 'akses_game,akses_video,akses_komunitas,worksheet,konsultasi_gratis_jumlah,'
  + 'konsultasi_gratis_satuan,rapor_bulanan,urutan,aktif';

/** true bila error karena tabel/kolom paket belum ada (migrasi 0089 belum jalan). */
export function paketBelumSiap(err?: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === '42P01' || err.code === '42703' || /paket_langganan/.test(err.message ?? '');
}

export async function getPaketSemua(): Promise<PaketLangganan[]> {
  const s = await createClient();
  const { data, error } = await s.from('paket_langganan').select(COLS).order('urutan');
  if (error) {
    if (!paketBelumSiap(error)) console.error('getPaketSemua:', error.message);
    return [];
  }
  return (data ?? []) as unknown as PaketLangganan[];
}

export async function getPaketAktif(): Promise<PaketLangganan[]> {
  return (await getPaketSemua()).filter((p) => p.aktif);
}

/** Peta id → paket, dipakai modul hak akses. */
export async function getPaketMap(): Promise<Map<string, PaketLangganan>> {
  return new Map((await getPaketSemua()).map((p) => [p.id, p]));
}
```

- [ ] **Step 2: Pastikan ter-compile**

Run: `npx tsc --noEmit`
Expected: keluaran kosong.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/paket.ts
git commit -m "feat(langganan): reader master paket (toleran sebelum migrasi)"
```

---

## Task 6: Setelan trial (hari + paket acuan)

**Files:**
- Modify: `src/lib/data/pengaturan-trial.ts`

- [ ] **Step 1: Tambah dua field secara toleran**

Ubah `PengaturanTrial`, `DEFAULT_TRIAL`, dan query-nya:

```ts
export interface PengaturanTrial {
  trial_kelas: boolean;
  trial_game: boolean;
  trial_video: boolean;
  trial_komunitas: boolean;
  trial_maks_anak: number;
  trial_hari: number;              // 0089
  trial_paket_id: string | null;   // 0089 — paket yang disetarakan saat trial
}

export const DEFAULT_TRIAL: PengaturanTrial = {
  trial_kelas: true, trial_game: true, trial_video: true, trial_komunitas: true,
  trial_maks_anak: 3, trial_hari: 30, trial_paket_id: null,
};
```

Di `getPengaturanTrial`, kolom BARU dibaca lewat query **kedua** yang terpisah, supaya kolom yang belum ada tidak mematikan pembacaan kolom lama:

```ts
  // Kolom 0089 dibaca terpisah: bila migrasi belum jalan, query ini gagal 42703 dan kita
  // cukup memakai nilai bawaan — bagian lain (trial_maks_anak dll) tetap terbaca.
  let trial_hari = DEFAULT_TRIAL.trial_hari;
  let trial_paket_id = DEFAULT_TRIAL.trial_paket_id;
  try {
    const { data: baru } = await supabase
      .from('pengaturan_trial').select('trial_hari,trial_paket_id').eq('id', 1).single();
    if (baru) {
      trial_hari = (baru.trial_hari as number) ?? trial_hari;
      trial_paket_id = (baru.trial_paket_id as string | null) ?? null;
    }
  } catch { /* migrasi 0089 belum jalan — pakai bawaan */ }
```

lalu sertakan keduanya pada objek yang dikembalikan.

- [ ] **Step 2: Pastikan ter-compile**

Run: `npx tsc --noEmit`
Expected: keluaran kosong.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/pengaturan-trial.ts
git commit -m "feat(langganan): setelan lama trial & paket acuan trial"
```

---

## Task 7: Reader hak akses per anak & per akun

**Files:**
- Create: `src/lib/data/langganan-anak.ts`

- [ ] **Step 1: Tulis berkasnya**

```ts
// src/lib/data/langganan-anak.ts — hak akses per anak (dan turunannya per akun).
// Ini pengganti `getStatusLangganan()` untuk keputusan akses. `langganan-status.ts` TETAP ada
// karena masih dipakai halaman admin/investor untuk menampilkan status akun.
import { createClient } from '@/lib/supabase/server';
import { getPaketMap } from './paket';
import { getPengaturanTrial } from './pengaturan-trial';
import { TENGGANG_HARI } from '@/lib/domain/trial';
import { hakAksesAnak, hakAksesAkun, HAK_KOSONG, type HakAksesAnak, type HakAksesAkun, type KonfigTrial } from '@/lib/domain/entitlement';
import type { BarisLanggananAnak } from '@/lib/game/tipe';

const COLS = 'anak_id,paket_id,paket_berikutnya_id,aktif_sampai';

/** Baris langganan semua anak milik satu ortu. Tabel belum ada → peta kosong. */
async function barisPerAnak(ortuId: string): Promise<Map<string, BarisLanggananAnak>> {
  const s = await createClient();
  const { data, error } = await s.from('langganan_anak').select(COLS).eq('ortu_id', ortuId);
  if (error) return new Map();   // migrasi 0089 belum jalan → semua anak jatuh ke jalur trial
  return new Map((data ?? []).map((r) => [r.anak_id as string, r as unknown as BarisLanggananAnak]));
}

async function konfigTrial(ortuId: string): Promise<KonfigTrial> {
  const s = await createClient();
  const [{ data: lang }, cfg] = await Promise.all([
    s.from('langganan').select('trial_mulai').eq('ortu_id', ortuId).maybeSingle(),
    getPengaturanTrial(),
  ]);
  return {
    trialMulai: (lang?.trial_mulai as string | null) ?? null,
    trialHari: cfg.trial_hari,
    tenggangHari: TENGGANG_HARI,
    trialPaketId: cfg.trial_paket_id,
  };
}

/** Hak akses satu anak (dipakai /main, /ortu, /pilih-game, rapor bulanan). */
export async function getHakAnak(anakId: string): Promise<HakAksesAnak> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { status: 'kadaluarsa', paket: null, ...HAK_KOSONG };
  const [baris, trial, paketMap] = await Promise.all([
    barisPerAnak(user.id), konfigTrial(user.id), getPaketMap(),
  ]);
  return hakAksesAnak(baris.get(anakId) ?? null, paketMap, trial, new Date());
}

/** Hak tingkat akun (diskon event/produk, Komunitas, detail materi). */
export async function getHakAkun(): Promise<HakAksesAkun> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { paketTertinggi: null, diskonKode: null, komunitas: false };
  const { data: anak } = await s.from('anak').select('id').eq('ortu_id', user.id);
  const [baris, trial, paketMap] = await Promise.all([
    barisPerAnak(user.id), konfigTrial(user.id), getPaketMap(),
  ]);
  const kini = new Date();
  const hak = (anak ?? []).map((a) => hakAksesAnak(baris.get(a.id as string) ?? null, paketMap, trial, kini));
  return hakAksesAkun(hak);
}
```

- [ ] **Step 2: Pastikan ter-compile**

Run: `npx tsc --noEmit`
Expected: keluaran kosong.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/langganan-anak.ts
git commit -m "feat(langganan): reader hak akses per anak & per akun"
```

---

## Task 8: Diskon event & produk dari peta paket

**Files:**
- Modify: `src/lib/domain/harga.ts`
- Test: `src/lib/domain/__tests__/harga.test.ts` (buat bila belum ada)

- [ ] **Step 1: Tulis tes yang gagal**

```ts
// src/lib/domain/__tests__/harga.test.ts
import { describe, it, expect } from 'vitest';
import { persenUntukPaket, hargaEventUntukPaket } from '../harga';

describe('persenUntukPaket', () => {
  const ev = { diskon_paket: { basic: 5, preschool: 10 }, diskon_langganan_persen: 7 };

  it('memakai persen paket bila ada di peta', () => {
    expect(persenUntukPaket(ev, 'preschool')).toBe(10);
    expect(persenUntukPaket(ev, 'basic')).toBe(5);
  });

  it('jatuh ke kolom lama bila paket tak ada di peta', () => {
    expect(persenUntukPaket(ev, 'paket-baru')).toBe(7);
  });

  it('bukan pelanggan tidak dapat diskon', () => {
    expect(persenUntukPaket(ev, null)).toBe(0);
  });

  it('peta kosong / kolom belum ada → kolom lama, lalu 0', () => {
    expect(persenUntukPaket({ diskon_langganan_persen: 8 }, 'basic')).toBe(8);
    expect(persenUntukPaket({}, 'basic')).toBe(0);
  });

  it('persen dijaga di rentang 0-100', () => {
    expect(persenUntukPaket({ diskon_paket: { basic: 150 } }, 'basic')).toBe(100);
    expect(persenUntukPaket({ diskon_paket: { basic: -5 } }, 'basic')).toBe(0);
  });
});

describe('hargaEventUntukPaket', () => {
  it('memotong harga sesuai persen paket', () => {
    expect(hargaEventUntukPaket({ harga_per_anak: 100000, diskon_paket: { preschool: 10 } }, 'preschool')).toBe(90000);
  });
  it('tanpa paket harga penuh', () => {
    expect(hargaEventUntukPaket({ harga_per_anak: 100000, diskon_paket: { preschool: 10 } }, null)).toBe(100000);
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan GAGAL**

Run: `npx vitest run src/lib/domain/__tests__/harga.test.ts`
Expected: FAIL — `persenUntukPaket` belum diekspor.

- [ ] **Step 3: Tambahkan ke `src/lib/domain/harga.ts`**

```ts
// ——— Diskon per PAKET (migrasi 0089) ———
// Sumber persen: peta `diskon_paket` per item ({kode paket: persen}). Bila paket tidak ada di
// peta — termasuk saat kolomnya belum ada karena migrasi belum jalan — dipakai kolom lama
// `diskon_langganan_persen` sehingga data yang sekarang tetap berlaku. Bukan pelanggan = 0.
type ItemDiskon = { diskon_paket?: Record<string, number> | null; diskon_langganan_persen?: number | null };

export function persenUntukPaket(item: ItemDiskon, paketKode: string | null): number {
  if (!paketKode) return 0;
  const peta = item.diskon_paket ?? null;
  const dariPeta = peta && Object.prototype.hasOwnProperty.call(peta, paketKode) ? peta[paketKode] : null;
  return clampPersen(dariPeta ?? item.diskon_langganan_persen);
}

export function hargaEventUntukPaket(ev: { harga_per_anak: number } & ItemDiskon, paketKode: string | null): number {
  const persen = persenUntukPaket(ev, paketKode);
  return persen > 0 ? Math.round((ev.harga_per_anak * (100 - persen)) / 100) : ev.harga_per_anak;
}

export function hargaProdukUntukPaket(p: { harga: number } & ItemDiskon, paketKode: string | null): number {
  const persen = persenUntukPaket(p, paketKode);
  return persen > 0 ? Math.round((p.harga * (100 - persen)) / 100) : p.harga;
}
```

Fungsi lama (`hargaEventUntuk`, `hargaProdukUntuk`) **tetap ada** — pemanggil dipindahkan satu per satu di Task 9, bukan sekaligus.

- [ ] **Step 4: Jalankan tes, pastikan LULUS**

Run: `npx vitest run src/lib/domain/__tests__/harga.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/harga.ts src/lib/domain/__tests__/harga.test.ts
git commit -m "feat(langganan): diskon event & produk dari peta per paket"
```

---

## Task 9: Alihkan pemakai `dibatasiTrial` ke hak akses

Tujuh berkas memanggil `dibatasiTrial(status)`. Dikerjakan **satu berkas per commit** supaya mudah ditelusuri bila ada regresi.

**Files:**
- Modify: `src/app/main/[anakId]/page.tsx`, `src/app/ortu/[anakId]/page.tsx`, `src/app/pilih-game/[anakId]/page.tsx` (hak per ANAK)
- Modify: `src/app/kelas/[id]/page.tsx`, `src/app/komunitas/page.tsx`, `src/app/komunitas/[postId]/page.tsx` (hak per AKUN)
- Modify: `src/app/api/anak/route.ts`, `src/app/pilih-anak/actions.ts` (batas jumlah anak — **tidak berubah**, tetap `trial_maks_anak`)

- [ ] **Step 1: Halaman ber-konteks anak**

Di `src/app/main/[anakId]/page.tsx`, ganti:

```ts
const status = await getStatusLangganan(supabase, u!.id);
const batasi = dibatasiTrial(status);
```

menjadi:

```ts
// Hak akses kini milik ANAK, bukan akun: satu akun bisa punya anak Preschool dan anak Basic.
const hak = await getHakAnak(anakId);
const batasi = !hak.paket || hak.status === 'kadaluarsa' ? true : !hak.game;
```

`batasi` tetap dikirim ke `MenuAnak` sebagaimana adanya, jadi UI penguncian yang sudah ada tidak perlu diubah. Lakukan hal yang sama di `ortu/[anakId]/page.tsx` (pakai `!hak.ideBermain`) dan `pilih-game/[anakId]/page.tsx` (pakai `!hak.game`).

- [ ] **Step 2: Jalankan build & commit**

Run: `npx tsc --noEmit && npm run build`
Expected: `✓ Compiled successfully`.

```bash
git add "src/app/main/[anakId]/page.tsx" "src/app/ortu/[anakId]/page.tsx" "src/app/pilih-game/[anakId]/page.tsx"
git commit -m "refactor(langganan): halaman anak memakai hak akses per anak"
```

- [ ] **Step 3: Halaman tingkat akun**

Di `src/app/kelas/[id]/page.tsx`, ganti pemeriksaan `dibatasiTrial(status) && kelas.boleh_trial === false` menjadi:

```ts
// Detail materi tak punya konteks anak → pakai paket tertinggi di akun.
const akun = await getHakAkun();
if (!akun.paketTertinggi && kelas.boleh_trial === false) {
  return <main …><Terkunci fitur="Materi Ide Bermain" /></main>;
}
```

Di kedua halaman Komunitas, ganti `dibatasiTrial(status) && !cfg.trial_komunitas` menjadi:

```ts
const akun = await getHakAkun();
if (!akun.komunitas && !cfg.trial_komunitas) { /* …Terkunci seperti sebelumnya… */ }
```

- [ ] **Step 4: Jalankan build & commit**

Run: `npx tsc --noEmit && npm run build`
Expected: `✓ Compiled successfully`.

```bash
git add "src/app/kelas/[id]/page.tsx" src/app/komunitas/page.tsx "src/app/komunitas/[postId]/page.tsx"
git commit -m "refactor(langganan): halaman tingkat akun memakai paket tertinggi"
```

- [ ] **Step 5: Diskon di jalur uang**

Di `src/lib/data/event-actions.ts` (`daftarEvent`) ganti perhitungan harga:

```ts
const { getHakAkun } = await import('./langganan-anak');
const akun = await getHakAkun();
const subtotal = hargaEventUntukPaket(
  { harga_per_anak: ev.harga_per_anak ?? 0, diskon_paket: ev.diskon_paket, diskon_langganan_persen: ev.diskon_langganan_persen },
  akun.diskonKode,
) * baru.length + nPendamping * (ev.harga_pendamping ?? 0);
```

`diskon_paket` **wajib** ditambahkan ke daftar kolom `select` event di fungsi itu **lewat query terpisah** bila kolomnya belum ada — atau paling sederhana: bungkus `select` yang memuat `diskon_paket` dengan cadangan `select` tanpa kolom itu, mengikuti pola `getEventSemua` di [admin-event.ts:13-15](src/lib/data/admin-event.ts#L13-L15) yang sudah melakukan hal yang sama untuk kolom kuota.

Lakukan hal setara di jalur Store (`keranjang-actions.ts`) memakai `hargaProdukUntukPaket`.

- [ ] **Step 6: Jalankan gerbang mutu & commit**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc kosong, semua tes PASS, build sukses.

```bash
git add src/lib/data/event-actions.ts src/lib/data/keranjang-actions.ts
git commit -m "feat(langganan): harga event & produk mengikuti paket tertinggi akun"
```

---

## Task 10: Gerbang worksheet

**Files:**
- Modify: `src/components/KelasIsi.tsx`
- Modify: `src/lib/data/kelas-bermain.ts` (tambah `worksheet_terbuka` ke COLS, toleran)

- [ ] **Step 1: Bawa kolom penandanya**

Di `src/lib/data/kelas-bermain.ts`, tambahkan `worksheet_terbuka` ke `COLS`. Karena kolom itu baru, pembacaannya **wajib bercadangan**: coba `select` dengan kolom baru; bila `error`, ulangi `select` tanpa kolom itu dan anggap `worksheet_terbuka = false`. Pola yang sama sudah dipakai `getEventSemua` di [admin-event.ts:13-15](src/lib/data/admin-event.ts#L13-L15).

- [ ] **Step 2: Kunci tombolnya**

Di `src/components/KelasIsi.tsx`, ganti baris tombol worksheet:

```tsx
{kelas.worksheet_url && (
  bolehWorksheet || kelas.worksheet_terbuka
    ? <a className="kp-btn putih" style={{ display: 'inline-block' }} href={kelas.worksheet_url} target="_blank">📄 Worksheet</a>
    : <span className="kp-btn putih" style={{ display: 'inline-block', opacity: 0.6, cursor: 'not-allowed' }}
        title="Worksheet tersedia di paket Preschool">🔒 Worksheet (Preschool)</span>
)}
```

`bolehWorksheet` adalah prop baru (`bolehWorksheet?: boolean`, bawaan `false`) yang diisi pemanggil dari `hak.worksheet` (halaman ber-anak) atau `akun.paketTertinggi?.worksheet` (detail materi). **Bawaannya `false`** — supaya pemanggil yang belum diperbarui mengunci, bukan membuka; lupa memasang prop tidak boleh berarti kebocoran fasilitas berbayar.

- [ ] **Step 3: Uji manual**

Run: `npm run dev` lalu buka detail sebuah materi ber-worksheet sebagai akun yang anaknya Basic.
Expected: tombolnya tampil sebagai `🔒 Worksheet (Preschool)` dan tidak bisa diklik. Tandai materi itu `worksheet_terbuka = true` lewat SQL Editor → tombolnya kembali normal.

- [ ] **Step 4: Commit**

```bash
git add src/components/KelasIsi.tsx src/lib/data/kelas-bermain.ts
git commit -m "feat(langganan): worksheet hanya untuk paket berhak, dengan penanda contoh terbuka"
```

---

## Task 11: Halaman admin master paket

**Files:**
- Create: `src/app/admin/paket/page.tsx`, `src/app/admin/paket/PaketAdmin.tsx`
- Create: `src/lib/data/paket-actions.ts`
- Modify: `src/lib/menu-admin.ts`

- [ ] **Step 1: Server action CRUD**

```ts
// src/lib/data/paket-actions.ts — CRUD master paket langganan (khusus admin).
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { AturanKeluarga } from '@/lib/game/tipe';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Bukan admin');
  return s;
}

export interface InputPaket {
  kode: string; nama: string; deskripsi: string; benefit: string[];
  hargaBulanan: number; diskonKeluarga: AturanKeluarga[];
  aksesIdeBermain: boolean; aksesGame: boolean; aksesVideo: boolean; aksesKomunitas: boolean;
  worksheet: boolean; konsultasiJumlah: number; konsultasiSatuan: 'bulan' | 'langganan';
  raporBulanan: boolean; urutan: number; aktif: boolean;
}

const baris = (i: InputPaket) => ({
  kode: i.kode.trim().toLowerCase(), nama: i.nama.trim(), deskripsi: i.deskripsi.trim() || null,
  benefit: i.benefit.filter((b) => b.trim()), harga_bulanan: Math.max(0, Math.floor(i.hargaBulanan || 0)),
  diskon_keluarga: i.diskonKeluarga.filter((r) => r.min_anak > 1),
  akses_ide_bermain: i.aksesIdeBermain, akses_game: i.aksesGame, akses_video: i.aksesVideo,
  akses_komunitas: i.aksesKomunitas, worksheet: i.worksheet,
  konsultasi_gratis_jumlah: Math.max(0, Math.floor(i.konsultasiJumlah || 0)),
  konsultasi_gratis_satuan: i.konsultasiSatuan, rapor_bulanan: i.raporBulanan,
  urutan: Math.floor(i.urutan || 0), aktif: i.aktif, updated_at: new Date().toISOString(),
});

export async function buatPaket(i: InputPaket): Promise<{ ok: boolean; error?: string }> {
  const s = await adminDb();
  const { error } = await s.from('paket_langganan').insert(baris(i));
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/paket'); revalidatePath('/langganan');
  return { ok: true };
}

export async function updatePaket(id: string, i: InputPaket): Promise<{ ok: boolean; error?: string }> {
  const s = await adminDb();
  // `kode` sengaja TIDAK ikut diubah: nilainya tersimpan di peta diskon event/produk dan
  // mengubahnya akan membuat semua diskon paket ini sunyi jadi 0.
  const { kode: _kode, ...tanpaKode } = baris(i);
  const { error } = await s.from('paket_langganan').update(tanpaKode).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/paket'); revalidatePath('/langganan');
  return { ok: true };
}

export async function toggleAktifPaket(id: string, aktif: boolean): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('paket_langganan').update({ aktif, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/paket'); revalidatePath('/langganan');
}
```

- [ ] **Step 2: Halaman + form**

`src/app/admin/paket/page.tsx` mengikuti pola halaman master yang sudah ada ([admin/kategori-usia/page.tsx](src/app/admin/kategori-usia/page.tsx)): server component memanggil `getPaketSemua()` lalu merender komponen klien `PaketAdmin`. `PaketAdmin.tsx` menampilkan kartu per paket + form dengan field: kode (hanya saat tambah), nama, deskripsi, harga per anak, daftar benefit (baris yang bisa ditambah), aturan diskon keluarga (baris `min_anak` + persen/nominal), enam sakelar hak akses, kuota konsultasi (jumlah + satuan), urutan, aktif. Gaya & kelas CSS mengikuti `admin.module.css` seperti halaman master lainnya.

- [ ] **Step 3: Daftarkan menunya**

Di `src/lib/menu-admin.ts`, tambahkan pada `MENU_ADMIN` **setelah** `langganan`:

```ts
  { key: 'paket', href: '/admin/paket', label: '🎟️ Paket' },
```

dan tambahkan `'paket'` ke `SENSITIF` di berkas yang sama, sehingga bawaannya **hanya super user** — paket menentukan harga, jadi jangan terbuka untuk semua admin secara diam-diam.

- [ ] **Step 4: Uji manual**

Run: `npm run dev`, buka `/admin/paket` sebagai super user.
Expected: dua paket hasil seed tampil; ubah harga Preschool → tersimpan; buka `/admin/akses-menu` → menu "Paket" tampil di matriks dan belum tercentang untuk admin biasa.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/paket-actions.ts src/app/admin/paket src/lib/menu-admin.ts
git commit -m "feat(langganan): halaman admin master paket + menu (khusus super user)"
```

---

## Task 12: Admin menetapkan paket per anak

Ini yang membuat A1 **berguna tanpa A2**: sebelum halaman pilih-paket mandiri ada, admin sudah bisa memberi paket ke anak setelah pembayaran diterima seperti sekarang.

**Files:**
- Create: `src/lib/data/langganan-anak-actions.ts`
- Modify: `src/app/admin/langganan/page.tsx` (+ komponen klien baru `PaketAnakForm.tsx`)

- [ ] **Step 1: Server action**

```ts
// src/lib/data/langganan-anak-actions.ts — admin menetapkan paket & periode PER ANAK.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin,is_superuser').eq('id', user.id).single();
  if (!prof?.is_admin && !prof?.is_superuser) throw new Error('Bukan admin');
  return s;
}

/**
 * Aktifkan/perpanjang langganan seorang anak selama `bulan` bulan.
 *
 * Perpanjangan dihitung dari `max(hari ini, aktif_sampai)` — BUKAN dari hari ini. Perilaku
 * lama di `aktifkanLangganan` menyetel `hari ini + 1 bulan`, sehingga orang tua yang
 * membayar lebih awal KEHILANGAN sisa harinya; dengan tagihan per anak, itu akan langsung
 * terbaca sebagai kecurangan.
 */
export async function setPaketAnak(
  anakId: string, paketId: string, bulan = 1,
): Promise<{ ok: boolean; error?: string; aktifSampai?: string }> {
  const s = await adminDb();
  const { data: anak } = await s.from('anak').select('id,ortu_id').eq('id', anakId).maybeSingle();
  if (!anak) return { ok: false, error: 'Anak tidak ditemukan.' };

  const { data: lama } = await s.from('langganan_anak').select('aktif_sampai').eq('anak_id', anakId).maybeSingle();
  const hariIni = new Date();
  const dasar = lama?.aktif_sampai ? new Date((lama.aktif_sampai as string) + 'T00:00:00Z') : hariIni;
  const mulai = dasar > hariIni ? dasar : hariIni;
  const sampai = new Date(mulai);
  sampai.setMonth(sampai.getMonth() + Math.max(1, Math.floor(bulan)));
  const aktifSampai = sampai.toISOString().slice(0, 10);

  const { error } = await s.from('langganan_anak').upsert({
    anak_id: anakId, ortu_id: anak.ortu_id as string, paket_id: paketId,
    aktif_sampai: aktifSampai, updated_at: new Date().toISOString(),
  }, { onConflict: 'anak_id' });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/langganan'); revalidatePath('/pilih-anak');
  return { ok: true, aktifSampai };
}
```

- [ ] **Step 2: Panel di halaman Langganan admin**

Pada tiap kartu member di `src/app/admin/langganan/page.tsx`, tampilkan daftar anaknya beserta paket & masa aktif dari `langganan_anak`, dengan dropdown paket + jumlah bulan + tombol **Aktifkan/Perpanjang** yang memanggil `setPaketAnak`. Datanya dibaca lewat query tambahan yang **toleran** (tabel belum ada → daftar kosong, panel menampilkan "jalankan migrasi 0089 dulu").

- [ ] **Step 3: Uji manual end-to-end**

Run: `npm run dev`, buka `/admin/langganan`.
Expected: pilih paket Preschool untuk satu anak → `aktif_sampai` terisi 1 bulan ke depan; tekan Perpanjang lagi → **bertambah** menjadi 2 bulan (bukan direset). Lalu buka Mode Anak untuk anak itu: worksheet terbuka. Buka Mode Anak untuk anak lain yang Basic: worksheet terkunci.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/langganan-anak-actions.ts src/app/admin/langganan
git commit -m "feat(langganan): admin menetapkan paket per anak + perbaikan perpanjangan awal"
```

---

## Task 13: Dokumentasi & gerbang mutu akhir

**Files:**
- Modify: `docs/DEVELOPER-KIDZPLAYFUL.md`, `docs/DOKUMENTASI-KIDZPLAYFUL.md`, `CLAUDE.md`

- [ ] **Step 1: Tulis dokumentasinya**

Di `DEVELOPER-KIDZPLAYFUL.md`: bagian baru "🎟️ Paket Langganan" (tabel master, `langganan_anak`, modul `entitlement.ts`, aturan **paket tertinggi** untuk fitur tingkat akun, gerbang worksheet). Di `DOKUMENTASI-KIDZPLAYFUL.md`: tabel baru di §7 + entri urutan migrasi `0089`. Di `CLAUDE.md`: satu poin bahwa **hak akses adalah data di `paket_langganan`, bukan cabang `if`**, dan bahwa status langganan menempel pada anak.

- [ ] **Step 2: Gerbang mutu penuh**

Run: `npx tsc --noEmit && npx eslint src/ && npm test && npm run build`
Expected: tsc kosong; eslint tanpa error **baru**; tes PASS (97 + tes baru: 4 trial, 7 entitlement, 7 harga = 115); build sukses.

- [ ] **Step 3: Commit & push**

```bash
git add docs CLAUDE.md
git commit -m "docs(langganan): paket bertingkat per anak & aturan paket tertinggi"
git push origin HEAD
```

- [ ] **Step 4: Ingatkan pemilik menjalankan migrasi**

Sampaikan: migrasi `0089_paket_langganan.sql` **harus dijalankan manual** di Supabase SQL Editor, lalu verifikasi via REST — `paket_langganan?select=kode&limit=1`, `langganan_anak?select=anak_id&limit=1`, `kelas_bermain?select=worksheet_terbuka&limit=1`, `event?select=diskon_paket&limit=1` → semuanya **200**, bukan 400. Sebelum migrasi dijalankan, aplikasi tetap hidup dengan semua anak jatuh ke jalur trial.

---

## Self-review

**Cakupan PRD (bagian A1 saja):** master paket admin-managed ✓ (Task 1, 11) · hak akses per anak ✓ (Task 4, 7, 9) · paket campur & aturan paket tertinggi ✓ (Task 4, 9) · trial 30 hari setara Basic & bisa diatur ✓ (Task 1, 3, 6) · worksheet Preschool + contoh terbuka ✓ (Task 1, 10) · diskon per item per paket ✓ (Task 1, 8, 9) · member lama jadi Preschool sampai periode habis ✓ (Task 1, backfill) · perbaikan perpanjangan awal ✓ (Task 12) · tanpa batas jumlah anak per paket ✓ (tak ada kolom itu).
**Sengaja di luar A1** dan sudah punya rencana sendiri: halaman pilih paket & tagihan (A2), diskon keluarga & voucher langganan yang perhitungannya milik A2, kuota konsultasi (B), rapor bulanan & `kegiatan_anak` (C), rebranding (D).

**Placeholder:** tidak ada "TBD"/"nanti"; setiap langkah kode memuat kodenya. Dua langkah UI (Task 11 Step 2, Task 12 Step 2) merujuk berkas pola yang **sudah ada di repo** untuk gaya visual — bukan rujukan ke task lain.

**Konsistensi tipe:** `PaketLangganan`/`BarisLanggananAnak` (Task 2) dipakai persis dengan nama itu di Task 4, 5, 7 · `HakAksesAnak.paket` bertipe `PaketLangganan | null` dan dibaca sebagai `hak.paket?.…` di Task 9 · `HAK_KOSONG` diekspor di Task 4 dan dipakai di Task 7 · `persenUntukPaket`/`hargaEventUntukPaket`/`hargaProdukUntukPaket` (Task 8) dipakai dengan nama sama di Task 9 · `getHakAnak`/`getHakAkun` (Task 7) dipakai dengan nama sama di Task 9 & 10 · `setPaketAnak` (Task 12) satu-satunya penulis `langganan_anak` dari sisi aplikasi.
