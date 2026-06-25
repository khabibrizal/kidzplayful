# KidzPlayful — Tahap 1 / Milestone 1: Fondasi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fondasi web app KidzPlayful: scaffold Next.js+TypeScript, koneksi Supabase, skema database inti (profil ortu, anak, langganan) dengan RLS, registrasi/login ortu, trial 14 hari otomatis, CRUD profil anak, dan halaman pilih-anak.

**Architecture:** Next.js (App Router) + TypeScript sebagai FE+server actions; Supabase (Postgres + Auth + Storage) sebagai backend. Logika domain murni (hitung trial, umur→mode) dipisah ke modul teruji-unit (Vitest); integrasi auth/DB diverifikasi lewat Playwright e2e. Styling: CSS global + design tokens pastel (selaras mockup).

**Tech Stack:** Next.js 15 (App Router), TypeScript, `@supabase/supabase-js`, `@supabase/ssr`, Vitest, Playwright, Supabase CLI.

**Acuan spec:** `docs/specs/2026-06-10-kidzplayful-design.md` (§4 arsitektur, §5.5 PIN/batas, §8.1 alur ortu, §15 ERD). Cakupan M1 = tabel `profiles`(orang_tua), `anak`, `langganan` + auth + trial + profil anak.

---

## File Structure (dibuat di Milestone ini)

| File | Tanggung jawab |
|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts` | konfigurasi proyek |
| `vitest.config.ts`, `playwright.config.ts` | konfigurasi tes |
| `.env.local.example` | template variabel lingkungan |
| `src/lib/domain/trial.ts` | logika murni: hitung tanggal trial & status langganan |
| `src/lib/domain/anak.ts` | logika murni: umur dari tgl lahir, mode default dari umur |
| `src/lib/domain/__tests__/trial.test.ts` | unit test trial |
| `src/lib/domain/__tests__/anak.test.ts` | unit test anak |
| `src/lib/supabase/client.ts` | Supabase client (browser) |
| `src/lib/supabase/server.ts` | Supabase client (server, cookie-based) |
| `supabase/migrations/0001_init.sql` | skema `profiles`, `anak`, `langganan` + RLS + trigger trial |
| `src/app/globals.css` | design tokens pastel + reset |
| `src/app/daftar/page.tsx` | form registrasi ortu |
| `src/app/login/page.tsx` | form login |
| `src/app/pilih-anak/page.tsx` | daftar profil anak + tombol tambah |
| `src/app/pilih-anak/actions.ts` | server action: tambah anak |
| `src/app/main/page.tsx` | placeholder Mode Anak (diisi M2) |
| `tests/e2e/auth-trial.spec.ts` | e2e: daftar → trial aktif → tambah anak |

---

## Task 1: Scaffold Next.js + TypeScript

**Files:**
- Create: seluruh struktur Next.js di root `d:\kidzplayful`

- [ ] **Step 1: Jalankan create-next-app ke direktori sementara lalu pindahkan**

Karena repo sudah berisi `docs/`, `mockups/`, `tools/`, scaffold di subfolder lalu salin.

Run:
```bash
cd /d/kidzplayful
npx create-next-app@latest .app-scaffold --ts --app --src-dir --eslint --no-tailwind --import-alias "@/*" --use-npm
```
Expected: terbentuk `.app-scaffold/` berisi proyek Next.js.

- [ ] **Step 2: Pindahkan berkas inti ke root (gabung dengan repo)**

Run:
```bash
cd /d/kidzplayful/.app-scaffold
cp -r src ../ && cp -r public ../ && cp next.config.ts tsconfig.json next-env.d.ts eslint.config.mjs ../
node -e "const a=require('./package.json'),b=require('../package.json');b.dependencies={...b.dependencies,...a.dependencies};b.devDependencies={...(b.devDependencies||{}),...a.devDependencies};b.scripts={...a.scripts,...b.scripts};require('fs').writeFileSync('../package.json',JSON.stringify(b,null,2))"
cd /d/kidzplayful && rm -rf .app-scaffold && npm install
```
Expected: `src/app/page.tsx` ada di root; `npm install` sukses.

- [ ] **Step 3: Verifikasi dev server jalan**

Run: `cd /d/kidzplayful && npm run dev`
Expected: server hidup di `http://localhost:3000` menampilkan halaman default Next.js. Hentikan dengan Ctrl+C.

- [ ] **Step 4: Commit**

```bash
cd /d/kidzplayful
git add -A
git commit -m "chore: scaffold Next.js + TypeScript app"
```

---

## Task 2: Konfigurasi Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Pasang dependensi tes**

Run:
```bash
cd /d/kidzplayful
npm install -D vitest @vitest/coverage-v8
```
Expected: terpasang tanpa error.

- [ ] **Step 2: Buat `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
});
```

- [ ] **Step 3: Tambah script test ke `package.json`**

Ubah blok `"scripts"` agar memuat:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verifikasi vitest mengenali 0 test**

Run: `cd /d/kidzplayful && npm test`
Expected: keluar pesan "No test files found" (exit 0 atau pesan informatif). Lanjut.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: setup vitest"
```

---

## Task 3: Logika domain — perhitungan trial & status langganan

**Files:**
- Create: `src/lib/domain/trial.ts`
- Test: `src/lib/domain/__tests__/trial.test.ts`

Aturan (spec §8.1): trial 14 hari sejak daftar; setelah trial habis ada masa tenggang 3 hari sebelum terkunci; status efektif = `aktif` jika langganan berbayar belum lewat, `trial` jika dalam 14 hari, `tenggang` jika 0–3 hari setelah trial/aktif habis, `kadaluarsa` jika lewat.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// src/lib/domain/__tests__/trial.test.ts
import { describe, it, expect } from 'vitest';
import { computeTrialEnd, statusLangganan } from '../trial';

const d = (s: string) => new Date(s + 'T00:00:00Z');

describe('computeTrialEnd', () => {
  it('menambah 14 hari dari tanggal daftar', () => {
    expect(computeTrialEnd(d('2026-06-01')).toISOString()).toBe(d('2026-06-15').toISOString());
  });
});

describe('statusLangganan', () => {
  const trialMulai = d('2026-06-01');
  it('trial saat masih dalam 14 hari', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-10'))).toBe('trial');
  });
  it('tenggang 0-3 hari setelah trial habis', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-17'))).toBe('tenggang');
  });
  it('kadaluarsa setelah tenggang', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: null }, d('2026-06-25'))).toBe('kadaluarsa');
  });
  it('aktif bila aktifSampai di masa depan', () => {
    expect(statusLangganan({ trialMulai, aktifSampai: d('2026-12-31') }, d('2026-08-01'))).toBe('aktif');
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd /d/kidzplayful && npx vitest run src/lib/domain/__tests__/trial.test.ts`
Expected: FAIL — modul `../trial` belum ada.

- [ ] **Step 3: Implementasi minimal**

```ts
// src/lib/domain/trial.ts
export const TRIAL_HARI = 14;
export const TENGGANG_HARI = 3;

const HARI = 24 * 60 * 60 * 1000;

export function computeTrialEnd(trialMulai: Date): Date {
  return new Date(trialMulai.getTime() + TRIAL_HARI * HARI);
}

export type StatusLangganan = 'aktif' | 'trial' | 'tenggang' | 'kadaluarsa';

export function statusLangganan(
  l: { trialMulai: Date; aktifSampai: Date | null },
  sekarang: Date,
): StatusLangganan {
  if (l.aktifSampai && sekarang <= l.aktifSampai) return 'aktif';
  const akhirTrial = computeTrialEnd(l.trialMulai);
  if (sekarang <= akhirTrial) return 'trial';
  const akhirTenggang = new Date(akhirTrial.getTime() + TENGGANG_HARI * HARI);
  if (sekarang <= akhirTenggang) return 'tenggang';
  return 'kadaluarsa';
}

export function bolehAkses(s: StatusLangganan): boolean {
  return s === 'aktif' || s === 'trial' || s === 'tenggang';
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd /d/kidzplayful && npx vitest run src/lib/domain/__tests__/trial.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(domain): trial & status langganan + tests"
```

---

## Task 4: Logika domain — umur anak & mode default

**Files:**
- Create: `src/lib/domain/anak.ts`
- Test: `src/lib/domain/__tests__/anak.test.ts`

Aturan (spec §1, §8.1): umur 0–2 thn → mode `ortu`; ≥2 thn → mode `anak`.

- [ ] **Step 1: Tulis test yang gagal**

```ts
// src/lib/domain/__tests__/anak.test.ts
import { describe, it, expect } from 'vitest';
import { umurTahun, modeDefault } from '../anak';

const d = (s: string) => new Date(s + 'T00:00:00Z');

describe('umurTahun', () => {
  it('menghitung umur penuh dalam tahun', () => {
    expect(umurTahun(d('2023-06-10'), d('2026-06-10'))).toBe(3);
    expect(umurTahun(d('2024-07-01'), d('2026-06-10'))).toBe(1);
  });
});

describe('modeDefault', () => {
  it('umur < 2 -> ortu', () => expect(modeDefault(1)).toBe('ortu'));
  it('umur >= 2 -> anak', () => expect(modeDefault(2)).toBe('anak'));
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd /d/kidzplayful && npx vitest run src/lib/domain/__tests__/anak.test.ts`
Expected: FAIL — modul `../anak` belum ada.

- [ ] **Step 3: Implementasi minimal**

```ts
// src/lib/domain/anak.ts
export type Mode = 'ortu' | 'anak';

export function umurTahun(tanggalLahir: Date, sekarang: Date): number {
  let umur = sekarang.getUTCFullYear() - tanggalLahir.getUTCFullYear();
  const belumUlangTahun =
    sekarang.getUTCMonth() < tanggalLahir.getUTCMonth() ||
    (sekarang.getUTCMonth() === tanggalLahir.getUTCMonth() &&
      sekarang.getUTCDate() < tanggalLahir.getUTCDate());
  if (belumUlangTahun) umur--;
  return umur;
}

export function modeDefault(umur: number): Mode {
  return umur < 2 ? 'ortu' : 'anak';
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `cd /d/kidzplayful && npx vitest run src/lib/domain/__tests__/anak.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(domain): umur anak & mode default + tests"
```

---

## Task 5: Skema database + RLS + trigger trial (Supabase)

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `.env.local.example`

Prasyarat: Supabase CLI terpasang (`npm i -g supabase`) dan sudah `supabase login`, atau gunakan dashboard SQL editor untuk menempel isi migrasi.

- [ ] **Step 1: Tulis migrasi skema**

```sql
-- supabase/migrations/0001_init.sql

-- profil orang tua (1-1 dengan auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  pin_ortu text,                       -- 4 digit, di-set belakangan
  terakhir_aktif timestamptz,
  created_at timestamptz not null default now()
);

create table public.anak (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  nama text not null,
  tanggal_lahir date not null,
  mode_default text not null default 'anak' check (mode_default in ('ortu','anak')),
  batas_menit int not null default 20,
  koin int not null default 0,
  created_at timestamptz not null default now()
);
create index anak_ortu_idx on public.anak(ortu_id);

create table public.langganan (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial','aktif','menunggu','tenggang','kadaluarsa')),
  nominal int not null default 0,
  trial_mulai date not null default current_date,
  trial_selesai date not null default (current_date + 14),
  aktif_sampai date,
  dibayar_via text,
  diaktifkan_oleh uuid,
  updated_at timestamptz not null default now()
);

-- trigger: saat user baru daftar -> buat profile + langganan trial
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.langganan (ortu_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.anak enable row level security;
alter table public.langganan enable row level security;

create policy "profil milik sendiri" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "anak milik ortu" on public.anak
  for all using (auth.uid() = ortu_id) with check (auth.uid() = ortu_id);

create policy "langganan milik ortu (baca)" on public.langganan
  for select using (auth.uid() = ortu_id);
```

- [ ] **Step 2: Buat template env**

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Terapkan migrasi ke Supabase**

Run (pilih salah satu):
```bash
# A) via CLI (proyek sudah di-link):
cd /d/kidzplayful && supabase db push
# B) atau: buka Supabase Dashboard > SQL Editor > tempel isi 0001_init.sql > Run
```
Expected: tabel `profiles`, `anak`, `langganan` terbentuk; trigger `on_auth_user_created` ada.

- [ ] **Step 4: Salin env nyata**

Run:
```bash
cd /d/kidzplayful && cp .env.local.example .env.local
# lalu isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY dari Dashboard > Project Settings > API
```
Expected: `.env.local` terisi (file ini sudah ter-gitignore oleh Next.js default).

- [ ] **Step 5: Verifikasi trigger via Dashboard**

Buat user uji di Dashboard > Authentication > Add user. Cek tabel `profiles` & `langganan` otomatis terisi 1 baris untuk user itu. Hapus user uji setelahnya.
Expected: 1 baris profiles + 1 baris langganan (status `trial`).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(db): skema profiles/anak/langganan + RLS + trigger trial"
```

---

## Task 6: Supabase client (browser & server)

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

- [ ] **Step 1: Pasang dependensi Supabase**

Run:
```bash
cd /d/kidzplayful && npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Client browser**

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Client server (cookie-based)**

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* dipanggil dari Server Component — abaikan, middleware yang menyetel */
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4: Verifikasi build mengenali modul**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: tidak ada error tipe.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(supabase): client browser & server"
```

---

## Task 7: Design tokens pastel (globals.css)

**Files:**
- Modify: `src/app/globals.css` (timpa isi default)

- [ ] **Step 1: Tulis tokens + reset**

```css
/* src/app/globals.css */
:root{
  --lavender:#C9B6F0; --mint:#A8E6CF; --peach:#FFD3B6; --biru:#A0D2FF;
  --lavender-d:#9B7FD4; --mint-d:#6FC9A3; --biru-d:#6FB0F0;
  --tinta:#5b5170; --abu:#9a93ad; --bg:#F3EEFB; --kartu:#fff;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100%}
body{
  font-family:'Baloo 2','Quicksand','Segoe UI',system-ui,sans-serif;
  color:var(--tinta);
  background:radial-gradient(circle at 30% 15%,#efe6ff,#e7f6ff 70%);
}
.kp-card{background:var(--kartu);border-radius:20px;box-shadow:0 8px 24px rgba(120,90,180,.12);padding:22px}
.kp-input{width:100%;background:#f3f3f8;border:none;border-radius:12px;padding:13px;font-size:14px;margin-bottom:11px;font-family:inherit}
.kp-btn{border:none;cursor:pointer;font-family:inherit;font-weight:800;border-radius:99px;padding:13px 24px;font-size:16px;color:#fff;background:var(--lavender-d);box-shadow:0 5px 0 #7d63b8}
.kp-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #7d63b8}
.kp-error{color:#c0392b;font-size:13px;margin:6px 0}
```

- [ ] **Step 2: Verifikasi dev server merender tanpa error**

Run: `cd /d/kidzplayful && npm run dev` lalu buka `http://localhost:3000`.
Expected: latar pastel tampil. Hentikan server.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "style: design tokens pastel"
```

---

## Task 8: Halaman registrasi ortu (/daftar)

**Files:**
- Create: `src/app/daftar/page.tsx`

Alur: input email + kata sandi + (nama anak, tanggal lahir opsional di langkah ini) → `supabase.auth.signUp` → trigger membuat profile+trial → arahkan ke `/pilih-anak`.

- [ ] **Step 1: Tulis halaman daftar (client component)**

```tsx
// src/app/daftar/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DaftarPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password: sandi });
    setLoading(false);
    if (error) return setErr(error.message);
    router.push('/pilih-anak');
  }

  return (
    <main style={{ maxWidth: 380, margin: '40px auto', padding: 16 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 26, marginBottom: 4 }}>KidzPlayful</h1>
      <p style={{ color: 'var(--abu)', marginBottom: 18 }}>Daftar — gratis 14 hari, tanpa kartu.</p>
      <form className="kp-card" onSubmit={submit}>
        <input className="kp-input" type="email" placeholder="Email orang tua"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="kp-input" type="password" placeholder="Kata sandi (min 6)"
          value={sandi} onChange={(e) => setSandi(e.target.value)} minLength={6} required />
        {err && <div className="kp-error">{err}</div>}
        <button className="kp-btn" type="submit" disabled={loading}>
          {loading ? 'Memproses…' : 'Mulai Gratis ▶'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
        Sudah punya akun? <a href="/login" style={{ color: 'var(--biru-d)' }}>Masuk</a>
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Verifikasi tipe & render**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: tidak ada error tipe.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(auth): halaman daftar ortu"
```

---

## Task 9: Halaman login (/login)

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Tulis halaman login**

```tsx
// src/app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: sandi });
    setLoading(false);
    if (error) return setErr('Email atau kata sandi salah.');
    router.push('/pilih-anak');
  }

  return (
    <main style={{ maxWidth: 380, margin: '40px auto', padding: 16 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 26, marginBottom: 18 }}>Masuk</h1>
      <form className="kp-card" onSubmit={submit}>
        <input className="kp-input" type="email" placeholder="Email orang tua"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="kp-input" type="password" placeholder="Kata sandi"
          value={sandi} onChange={(e) => setSandi(e.target.value)} required />
        {err && <div className="kp-error">{err}</div>}
        <button className="kp-btn" type="submit" disabled={loading}>
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
        Belum punya akun? <a href="/daftar" style={{ color: 'var(--biru-d)' }}>Daftar</a>
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: tidak ada error tipe.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(auth): halaman login"
```

---

## Task 10: Middleware sesi (refresh cookie auth)

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Tulis middleware penyegar sesi**

```ts
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: tidak ada error.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(auth): middleware penyegar sesi"
```

---

## Task 11: Server action tambah anak

**Files:**
- Create: `src/app/pilih-anak/actions.ts`

- [ ] **Step 1: Tulis server action**

```ts
// src/app/pilih-anak/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { umurTahun, modeDefault } from '@/lib/domain/anak';

export async function tambahAnak(formData: FormData) {
  const nama = String(formData.get('nama') ?? '').trim();
  const tgl = String(formData.get('tanggal_lahir') ?? '');
  if (!nama || !tgl) throw new Error('Nama dan tanggal lahir wajib diisi.');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const umur = umurTahun(new Date(tgl + 'T00:00:00Z'), new Date());
  const mode = modeDefault(umur);

  const { error } = await supabase.from('anak').insert({
    ortu_id: user.id,
    nama,
    tanggal_lahir: tgl,
    mode_default: mode,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak');
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: tidak ada error.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(anak): server action tambah anak"
```

---

## Task 12: Halaman pilih-anak (daftar + tambah + status langganan)

**Files:**
- Create: `src/app/pilih-anak/page.tsx`
- Create: `src/app/main/page.tsx` (placeholder)

- [ ] **Step 1: Placeholder Mode Anak**

```tsx
// src/app/main/page.tsx
export default function MainPage() {
  return (
    <main style={{ padding: 40, textAlign: 'center' }}>
      <h1 style={{ color: 'var(--lavender-d)' }}>Mode Anak</h1>
      <p style={{ color: 'var(--abu)' }}>Menu & game dibangun di Milestone 2.</p>
    </main>
  );
}
```

- [ ] **Step 2: Halaman pilih-anak (server component)**

```tsx
// src/app/pilih-anak/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan, bolehAkses } from '@/lib/domain/trial';
import { tambahAnak } from './actions';

export default async function PilihAnakPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: anakList } = await supabase
    .from('anak').select('id,nama,tanggal_lahir,mode_default').order('created_at');
  const { data: lang } = await supabase
    .from('langganan').select('trial_mulai,aktif_sampai').single();

  const status = lang
    ? statusLangganan(
        {
          trialMulai: new Date(lang.trial_mulai + 'T00:00:00Z'),
          aktifSampai: lang.aktif_sampai ? new Date(lang.aktif_sampai + 'T00:00:00Z') : null,
        },
        new Date(),
      )
    : 'kadaluarsa';

  return (
    <main style={{ maxWidth: 420, margin: '30px auto', padding: 16 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24 }}>Halo, Bunda 👋</h1>
      <p style={{ color: 'var(--abu)', marginBottom: 16 }}>
        Status langganan: <b>{status}</b>
        {!bolehAkses(status) && ' — silakan perpanjang untuk lanjut.'}
      </p>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '10px 0' }}>PROFIL ANAK</div>
      {(anakList ?? []).map((a) => (
        <a key={a.id} href="/main" className="kp-card"
           style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontSize: 30 }}>🧒</span>
          <span><b>{a.nama}</b><br /><small style={{ color: 'var(--abu)' }}>mode {a.mode_default}</small></span>
        </a>
      ))}
      {(anakList ?? []).length === 0 && (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada profil anak. Tambahkan di bawah.</p>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '16px 0 6px' }}>TAMBAH ANAK</div>
      <form action={tambahAnak} className="kp-card">
        <input className="kp-input" name="nama" placeholder="Nama anak" required />
        <input className="kp-input" name="tanggal_lahir" type="date" required />
        <button className="kp-btn" type="submit">Tambah anak</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Verifikasi tipe & build**

Run: `cd /d/kidzplayful && npx tsc --noEmit && npm run build`
Expected: build sukses tanpa error.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(anak): halaman pilih-anak + status langganan + placeholder main"
```

---

## Task 13: E2E — daftar → trial aktif → tambah anak

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/auth-trial.spec.ts`

Catatan: e2e butuh `.env.local` terisi & Supabase aktif. Gunakan email unik per run (indeks dari variabel waktu yang di-pass, bukan random).

- [ ] **Step 1: Pasang Playwright**

Run:
```bash
cd /d/kidzplayful && npm install -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Konfigurasi Playwright (jalankan dev server otomatis)**

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
```

- [ ] **Step 3: Tulis e2e**

```ts
// tests/e2e/auth-trial.spec.ts
import { test, expect } from '@playwright/test';

test('daftar -> trial aktif -> tambah anak', async ({ page }) => {
  const email = `uji+${process.env.E2E_STAMP ?? '1'}@kidzplayful.test`;
  await page.goto('/daftar');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'rahasia123');
  await page.click('button[type=submit]');

  await page.waitForURL('**/pilih-anak');
  await expect(page.getByText(/Status langganan/)).toContainText(/trial/);

  await page.fill('input[name=nama]', 'Arka');
  await page.fill('input[name=tanggal_lahir]', '2023-01-01');
  await page.click('form button[type=submit]');

  await expect(page.getByText('Arka')).toBeVisible();
});
```

- [ ] **Step 4: Tambah script e2e ke `package.json`**

Tambahkan ke `"scripts"`:
```json
"e2e": "playwright test"
```

- [ ] **Step 5: Jalankan e2e**

Run:
```bash
cd /d/kidzplayful && E2E_STAMP=$(node -e "process.stdout.write(String(Date.now()))") npm run e2e
```
Expected: 1 test PASS. (Jika gagal karena konfirmasi email aktif di Supabase, matikan "Confirm email" di Dashboard > Authentication > Providers untuk lingkungan dev.)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "test(e2e): daftar -> trial -> tambah anak"
```

---

## Task 14: Verifikasi akhir Milestone

- [ ] **Step 1: Jalankan semua unit test**

Run: `cd /d/kidzplayful && npm test`
Expected: seluruh test domain PASS (9 test).

- [ ] **Step 2: Build produksi**

Run: `cd /d/kidzplayful && npm run build`
Expected: build sukses.

- [ ] **Step 3: Smoke manual**

Run `npm run dev`, lalu di browser: `/daftar` → daftar akun baru → diarahkan ke `/pilih-anak` → status "trial" → tambah anak → muncul di daftar → klik anak → halaman `/main` placeholder.
Expected: semua langkah berfungsi.

- [ ] **Step 4: Commit penutup (jika ada perubahan)**

```bash
git add -A && git commit -m "chore: tutup Milestone 1 (fondasi)" || echo "tidak ada perubahan"
```

---

## Definition of Done (Milestone 1)
- Ortu bisa **daftar & login**; sesi tersimpan via cookie.
- Saat daftar, **profil + langganan trial 14 hari** otomatis terbuat (trigger DB).
- Ortu bisa **menambah & melihat profil anak**; mode default dihitung dari umur.
- Halaman **pilih-anak** menampilkan status langganan (trial/aktif/tenggang/kadaluarsa).
- **RLS** memastikan ortu hanya melihat data anaknya sendiri.
- Unit test domain hijau; satu e2e alur utama hijau; build produksi sukses.

## Catatan untuk Milestone berikutnya
- **PIN ortu** (`profiles.pin_ortu`) baru dipakai di M2 (Gerbang PIN). Kolomnya sudah ada.
- Tabel konten (`tema`, `paket_aset`, `video`, `hasil_main`, `panduan`, `admin`) dibuat di M2/M4 saat dipakai — bukan di M1.
- Aktivasi langganan manual (ubah `status`/`aktif_sampai`) ditangani Dashboard Admin di **M4**; M1 hanya membaca status.
