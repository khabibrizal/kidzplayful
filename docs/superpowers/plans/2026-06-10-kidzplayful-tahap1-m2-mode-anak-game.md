# KidzPlayful — Tahap 1 / Milestone 2: Mode Anak + 3 Mesin Game — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: gunakan pola subagent-driven (satu subagent per task, review di antara) atau superpowers:executing-plans. Langkah memakai checkbox `- [ ]`.

**Goal:** Membangun Mode Anak yang dapat dimainkan: pemilihan anak → menu anak (Minggu Ini / Game Edukasi / Pojok Video placeholder) dengan Gerbang PIN & batas screen-time, game-runner data-driven, tiga mesin game (Mana Ya / Beres-Beres / Cari Pasangan), perekaman skor ke `hasil_main`, dan koin anak bertambah.

**Architecture:** Lanjutan M1 (Next.js App Router + Supabase). Konten game disimpan di DB (`tema`, `paket_aset` JSON) — mesin game membaca data, bukan hardcode (spec §5.2/§5.3). Logika murni (hitung bintang, akumulasi waktu) di modul teruji-unit; engine & shell adalah komponen React diverifikasi lewat build + e2e. Logika gameplay diadaptasi dari prototipe terbukti `mockups/demo.js`.

**Tech Stack:** Next.js 16, TypeScript, Supabase, Vitest, Playwright. Web Speech API (suara) opsional dengan fallback diam.

**Prasyarat:** Milestone 1 selesai (auth, profil anak, langganan, `.env.local` terisi, migrasi 0001 terpasang). Acuan spec: `docs/specs/2026-06-10-kidzplayful-design.md` §5 (mesin & skor), §5.5 (PIN & batas waktu), §8.2 (alur anak).

---

## File Structure (Milestone ini)

| File | Tanggung jawab |
|---|---|
| `supabase/migrations/0002_konten.sql` | tabel `tema`, `paket_aset`, `hasil_main` + RLS + seed tema "Hewan" |
| `src/lib/domain/skor.ts` (+test) | `hitungBintang(benar,total)` |
| `src/lib/domain/waktu.ts` (+test) | akumulasi & sisa waktu main harian |
| `src/lib/game/tipe.ts` | tipe TS untuk paket_aset tiap mesin |
| `src/lib/data/tema.ts` | ambil tema "Minggu Ini" + paket_aset (server) |
| `src/lib/data/skor.ts` | catat `hasil_main` + tambah koin (server action) |
| `src/lib/data/anak.ts` | ambil 1 anak milik ortu + guard langganan (server) |
| `src/app/main/[anakId]/page.tsx` | Menu Anak (server: guard + data) |
| `src/app/main/[anakId]/MenuAnak.tsx` | UI menu (client) + Gerbang PIN + timer |
| `src/components/game/GameRunner.tsx` | pilih engine sesuai `mesin`, kelola skor & reward |
| `src/components/game/ManaYa.tsx` | engine tekan-sesuai |
| `src/components/game/BeresBeres.tsx` | engine seret-wadah |
| `src/components/game/CariPasangan.tsx` | engine cocokkan |
| `src/components/game/Reward.tsx` | layar bintang+koin |
| `src/components/game/PinGate.tsx` | modal PIN ortu (set/verifikasi) |
| `src/app/main/[anakId]/main.module.css` | gaya Mode Anak (pastel) |
| `src/app/pilih-anak/page.tsx` | (modifikasi) link ke `/main/<id>` |
| `tests/e2e/main-game.spec.ts` | e2e: buka menu → main Mana Ya → reward → koin naik |

---

## Task 1: Migrasi konten + seed tema "Hewan"

**Files:**
- Create: `supabase/migrations/0002_konten.sql`

- [ ] **Step 1: Tulis migrasi**

```sql
-- supabase/migrations/0002_konten.sql
create table public.tema (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  sampul text,                                  -- emoji sampul
  status text not null default 'disetujui' check (status in ('draf','disetujui')),
  is_minggu_ini boolean not null default false,
  jadwal_tayang date,
  created_at timestamptz not null default now()
);

create table public.paket_aset (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid not null references public.tema(id) on delete cascade,
  mesin text not null check (mesin in ('tekan-sesuai','seret-wadah','cari-pasangan','telusuri','pop','tuang','irama')),
  judul text not null,
  area_skill text not null,
  usia_min int not null default 2,
  usia_max int not null default 5,
  sumber text not null default 'manual' check (sumber in ('ai','manual')),
  status text not null default 'disetujui' check (status in ('draf','disetujui')),
  butir jsonb not null,
  urutan int not null default 0
);
create index paket_tema_idx on public.paket_aset(tema_id);

create table public.hasil_main (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references public.anak(id) on delete cascade,
  tema_id uuid references public.tema(id) on delete set null,
  mesin text not null,
  area_skill text not null,
  jumlah_coba int not null default 0,
  selesai boolean not null default false,
  durasi_detik int not null default 0,
  bintang int not null default 0,
  tanggal timestamptz not null default now()
);
create index hasil_anak_idx on public.hasil_main(anak_id);

-- RLS
alter table public.tema enable row level security;
alter table public.paket_aset enable row level security;
alter table public.hasil_main enable row level security;

-- konten publik: semua user terautentikasi boleh baca tema/paket yang disetujui
create policy "baca tema disetujui" on public.tema
  for select to authenticated using (status = 'disetujui');
create policy "baca paket disetujui" on public.paket_aset
  for select to authenticated using (status = 'disetujui');

-- hasil_main milik anak dari ortu yang login
create policy "hasil milik ortu" on public.hasil_main
  for all to authenticated
  using (exists (select 1 from public.anak a where a.id = anak_id and a.ortu_id = auth.uid()))
  with check (exists (select 1 from public.anak a where a.id = anak_id and a.ortu_id = auth.uid()));

-- SEED: tema Hewan jadi "Minggu Ini" dengan 3 paket
with t as (
  insert into public.tema (nama, sampul, is_minggu_ini, status)
  values ('Hewan', '🐰', true, 'disetujui') returning id
)
insert into public.paket_aset (tema_id, mesin, judul, area_skill, usia_min, usia_max, butir, urutan)
select t.id, x.mesin, x.judul, x.area_skill, 2, 5, x.butir, x.urutan from t,
(values
  ('tekan-sesuai','Mana Ya?','kognitif',
   '{"soal":[{"tanya":"kucing","benar":"🐱","salah":["🐶","🐮","🐰"]},{"tanya":"anjing","benar":"🐶","salah":["🐱","🐸","🐷"]},{"tanya":"bebek","benar":"🦆","salah":["🐔","🐢","🐠"]},{"tanya":"gajah","benar":"🐘","salah":["🦒","🐭","🐧"]},{"tanya":"sapi","benar":"🐮","salah":["🐴","🐑","🐤"]}]}'::jsonb, 1),
  ('seret-wadah','Beres-Beres','motorik-halus',
   '{"wadah":[{"kategori":"buah","label":"Buah","emoji":"🧺"},{"kategori":"hewan","label":"Hewan","emoji":"🏠"}],"benda":[{"emoji":"🍎","kategori":"buah"},{"emoji":"🐱","kategori":"hewan"},{"emoji":"🍌","kategori":"buah"},{"emoji":"🐶","kategori":"hewan"}]}'::jsonb, 2),
  ('cari-pasangan','Cari Pasangan','kognitif',
   '{"pasangan":["🐱","🌸","🐶"]}'::jsonb, 3)
) as x(mesin, judul, area_skill, butir, urutan);
```

- [ ] **Step 2: Terapkan migrasi**

Run (CLI atau Dashboard SQL Editor — tempel & Run isi `0002_konten.sql`):
```bash
cd /d/kidzplayful && supabase db push
```
Expected: tabel `tema`/`paket_aset`/`hasil_main` ada; 1 baris tema "Hewan" `is_minggu_ini=true` + 3 baris paket_aset.

- [ ] **Step 3: Verifikasi seed via REST**

Run:
```bash
cd /d/kidzplayful && source .env.local 2>/dev/null; \
curl -s -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
"$NEXT_PUBLIC_SUPABASE_URL/rest/v1/tema?select=nama,is_minggu_ini" | head
```
Expected: `[]` (RLS butuh autentikasi — anon tak melihat; ini normal). Verifikasi sebenarnya lewat e2e Task 11 / Dashboard Table Editor (lihat 1 tema + 3 paket).

- [ ] **Step 4: Commit**

```bash
cd /d/kidzplayful && git add -A && git commit -m "feat(db): migrasi konten tema/paket_aset/hasil_main + seed Hewan"
```

---

## Task 2: Logika murni — hitung bintang

**Files:**
- Create: `src/lib/domain/skor.ts`
- Test: `src/lib/domain/__tests__/skor.test.ts`

- [ ] **Step 1: Tulis test gagal**

```ts
// src/lib/domain/__tests__/skor.test.ts
import { describe, it, expect } from 'vitest';
import { hitungBintang } from '../skor';

describe('hitungBintang', () => {
  it('3 bintang bila semua benar', () => expect(hitungBintang(5, 5)).toBe(3));
  it('2 bintang bila >= 60%', () => expect(hitungBintang(3, 5)).toBe(2));
  it('1 bintang bila < 60%', () => expect(hitungBintang(1, 5)).toBe(1));
  it('minimal 1 bintang walau 0 benar', () => expect(hitungBintang(0, 5)).toBe(1));
  it('aman bila total 0', () => expect(hitungBintang(0, 0)).toBe(1));
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd /d/kidzplayful && npx vitest run src/lib/domain/__tests__/skor.test.ts`
Expected: FAIL — modul belum ada.

- [ ] **Step 3: Implementasi**

```ts
// src/lib/domain/skor.ts
export function hitungBintang(benar: number, total: number): number {
  if (total <= 0) return 1;
  const r = benar / total;
  if (r >= 0.99) return 3;
  if (r >= 0.6) return 2;
  return 1;
}
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `cd /d/kidzplayful && npx vitest run src/lib/domain/__tests__/skor.test.ts`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(domain): hitung bintang + tests"
```

---

## Task 3: Logika murni — batas waktu harian

**Files:**
- Create: `src/lib/domain/waktu.ts`
- Test: `src/lib/domain/__tests__/waktu.test.ts`

- [ ] **Step 1: Tulis test gagal**

```ts
// src/lib/domain/__tests__/waktu.test.ts
import { describe, it, expect } from 'vitest';
import { sisaDetik, waktuHabis, kunciHari } from '../waktu';

describe('waktu', () => {
  it('sisa = batas*60 - terpakai (>=0)', () => {
    expect(sisaDetik(60, 20)).toBe(20 * 60 - 60);
    expect(sisaDetik(9999, 20)).toBe(0);
  });
  it('habis bila terpakai >= batas', () => {
    expect(waktuHabis(20 * 60, 20)).toBe(true);
    expect(waktuHabis(10, 20)).toBe(false);
  });
  it('kunci hari berbeda per tanggal+anak', () => {
    expect(kunciHari('abc', new Date('2026-06-10T05:00:00Z'))).toBe('kp_waktu_abc_2026-06-10');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd /d/kidzplayful && npx vitest run src/lib/domain/__tests__/waktu.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

```ts
// src/lib/domain/waktu.ts
export function sisaDetik(terpakaiDetik: number, batasMenit: number): number {
  return Math.max(0, batasMenit * 60 - terpakaiDetik);
}
export function waktuHabis(terpakaiDetik: number, batasMenit: number): boolean {
  return terpakaiDetik >= batasMenit * 60;
}
export function kunciHari(anakId: string, sekarang: Date): string {
  const ymd = sekarang.toISOString().slice(0, 10);
  return `kp_waktu_${anakId}_${ymd}`;
}
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `cd /d/kidzplayful && npx vitest run src/lib/domain/__tests__/waktu.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(domain): batas waktu harian + tests"
```

---

## Task 4: Tipe data game

**Files:**
- Create: `src/lib/game/tipe.ts`

- [ ] **Step 1: Tulis tipe**

```ts
// src/lib/game/tipe.ts
export type Mesin = 'tekan-sesuai' | 'seret-wadah' | 'cari-pasangan';

export interface ButirTekan { tanya: string; benar: string; salah: string[]; }
export interface DataTekan { soal: ButirTekan[]; }

export interface Wadah { kategori: string; label: string; emoji: string; }
export interface Benda { emoji: string; kategori: string; }
export interface DataSeret { wadah: Wadah[]; benda: Benda[]; }

export interface DataCocok { pasangan: string[]; }

export interface Paket {
  id: string;
  mesin: Mesin;
  judul: string;
  area_skill: string;
  butir: DataTekan | DataSeret | DataCocok;
}

export interface HasilSelesai {
  benar: number;
  total: number;
  durasiDetik: number;
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(game): tipe data paket per mesin"
```

---

## Task 5: Data layer — anak, tema, skor

**Files:**
- Create: `src/lib/data/anak.ts`, `src/lib/data/tema.ts`, `src/lib/data/skor.ts`

- [ ] **Step 1: Ambil anak milik ortu + guard langganan**

```ts
// src/lib/data/anak.ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan, bolehAkses } from '@/lib/domain/trial';

export async function getAnakTerjamin(anakId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: anak } = await supabase
    .from('anak').select('id,nama,mode_default,batas_menit,koin').eq('id', anakId).single();
  if (!anak) redirect('/pilih-anak'); // RLS memastikan hanya anak milik ortu yang terbaca

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
  if (!bolehAkses(status)) redirect('/pilih-anak');

  return anak;
}
```

- [ ] **Step 2: Ambil tema Minggu Ini + paket**

```ts
// src/lib/data/tema.ts
import { createClient } from '@/lib/supabase/server';
import type { Paket } from '@/lib/game/tipe';

export async function getMingguIni() {
  const supabase = await createClient();
  const { data: tema } = await supabase
    .from('tema').select('id,nama,sampul').eq('is_minggu_ini', true).limit(1).single();
  if (!tema) return null;
  const { data: paket } = await supabase
    .from('paket_aset')
    .select('id,mesin,judul,area_skill,butir')
    .eq('tema_id', tema.id).eq('status', 'disetujui').order('urutan');
  return { tema, paket: (paket ?? []) as unknown as Paket[] };
}
```

- [ ] **Step 3: Catat hasil + tambah koin (server action)**

```ts
// src/lib/data/skor.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { hitungBintang } from '@/lib/domain/skor';

export async function catatHasil(input: {
  anakId: string;
  temaId: string;
  mesin: string;
  areaSkill: string;
  benar: number;
  total: number;
  durasiDetik: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');

  const bintang = hitungBintang(input.benar, input.total);

  const { error } = await supabase.from('hasil_main').insert({
    anak_id: input.anakId,
    tema_id: input.temaId,
    mesin: input.mesin,
    area_skill: input.areaSkill,
    jumlah_coba: input.total,
    selesai: true,
    durasi_detik: input.durasiDetik,
    bintang,
  });
  if (error) throw new Error(error.message);

  // tambah koin = jumlah benar (RPC sederhana via update; baca-lalu-tulis cukup utk skala ini)
  const { data: anak } = await supabase.from('anak').select('koin').eq('id', input.anakId).single();
  const koinBaru = (anak?.koin ?? 0) + input.benar;
  await supabase.from('anak').update({ koin: koinBaru }).eq('id', input.anakId);

  return { bintang, koin: koinBaru };
}
```

- [ ] **Step 4: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(data): anak guard, tema minggu ini, catat hasil+koin"
```

---

## Task 6: Gaya Mode Anak (CSS module)

**Files:**
- Create: `src/app/main/[anakId]/main.module.css`

- [ ] **Step 1: Tulis CSS**

```css
/* src/app/main/[anakId]/main.module.css */
.wrap { max-width: 420px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; padding: 16px; }
.top { display: flex; align-items: center; justify-content: space-between; padding: 8px 4px; }
.chip { background: var(--peach); color: #9a5b33; font-weight: 700; padding: 6px 14px; border-radius: 999px; }
.coin { background: #fff; border-radius: 999px; padding: 5px 13px; font-weight: 700; color: #c98a00; box-shadow: 0 3px 0 #efe3c9; }
.lock { width: 40px; height: 40px; border-radius: 50%; background: #fff; border: none; font-size: 18px; box-shadow: 0 3px 0 #e6def5; cursor: pointer; }
.menu { flex: 1; display: flex; flex-direction: column; gap: 14px; justify-content: center; }
.tile { border: none; cursor: pointer; border-radius: 26px; padding: 20px; display: flex; align-items: center; gap: 15px; color: #fff; font-weight: 800; font-size: 20px; font-family: inherit; text-align: left; }
.tile span { font-size: 40px; }
.tMain { background: var(--mint-d); box-shadow: 0 7px 0 #4fae87; }
.tLib { background: var(--lavender-d); box-shadow: 0 7px 0 #7d63b8; }
.tVid { background: var(--biru-d); box-shadow: 0 7px 0 #4f93d8; }
.foot { text-align: center; font-size: 12px; color: var(--abu); padding: 10px; }
.rest { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 10px; }
.rest .emo { font-size: 70px; }
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "style(main): css module mode anak"
```

---

## Task 7: Komponen PinGate

**Files:**
- Create: `src/components/game/PinGate.tsx`

PIN disimpan di `profiles.pin_ortu`. Jika belum ada → mode "set PIN baru". Jika ada → "verifikasi". Sukses → panggil `onSukses()`.

- [ ] **Step 1: Tulis komponen**

```tsx
// src/components/game/PinGate.tsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function PinGate({
  pinTersimpan,
  onSukses,
  onBatal,
}: { pinTersimpan: string | null; onSukses: () => void; onBatal: () => void }) {
  const [buf, setBuf] = useState('');
  const [pesan, setPesan] = useState(pinTersimpan ? 'Masukkan PIN' : 'Buat PIN baru (4 angka)');
  const mode = pinTersimpan ? 'verif' : 'set';

  async function tekan(n: string) {
    if (buf.length >= 4) return;
    const baru = buf + n;
    setBuf(baru);
    if (baru.length === 4) {
      if (mode === 'set') {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('profiles').update({ pin_ortu: baru }).eq('id', user!.id);
        onSukses();
      } else if (baru === pinTersimpan) {
        onSukses();
      } else {
        setPesan('PIN salah, coba lagi');
        setBuf('');
      }
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(60,48,100,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div className="kp-card" style={{ width: 260, textAlign: 'center' }}>
        <div style={{ fontSize: 34 }}>🔒</div>
        <h3 style={{ color: 'var(--tinta)' }}>Khusus Orang Tua</h3>
        <p style={{ color: 'var(--abu)', fontSize: 12, margin: '4px 0 12px' }}>{pesan}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < buf.length ? 'var(--lavender-d)' : '#e6def5' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button key={n} className="kp-btn" style={{ background: '#f3eefb', color: 'var(--tinta)', boxShadow: '0 3px 0 #e2d8f3' }} onClick={() => tekan(n)}>{n}</button>
          ))}
          <button className="kp-btn" style={{ background: '#f3eefb', color: 'var(--tinta)', boxShadow: '0 3px 0 #e2d8f3' }} onClick={onBatal}>✕</button>
          <button className="kp-btn" style={{ background: '#f3eefb', color: 'var(--tinta)', boxShadow: '0 3px 0 #e2d8f3' }} onClick={() => tekan('0')}>0</button>
          <button className="kp-btn" style={{ background: '#f3eefb', color: 'var(--tinta)', boxShadow: '0 3px 0 #e2d8f3' }} onClick={() => setBuf(buf.slice(0, -1))}>⌫</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(game): komponen PinGate (set/verifikasi PIN ortu)"
```

---

## Task 8: Komponen Reward

**Files:**
- Create: `src/components/game/Reward.tsx`

- [ ] **Step 1: Tulis komponen**

```tsx
// src/components/game/Reward.tsx
'use client';
export default function Reward({
  bintang, benar, total, onLagi, onSelesai,
}: { bintang: number; benar: number; total: number; onLagi: () => void; onSelesai: () => void }) {
  const s = '⭐'.repeat(bintang);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8, color: '#fff', background: 'linear-gradient(170deg,#d9c9ff,#bfe6ff)', borderRadius: 24, padding: 24 }}>
      <div style={{ fontSize: 60 }}>🎉</div>
      <h2 style={{ fontSize: 30 }}>Hebat!</h2>
      <div style={{ fontSize: 40, letterSpacing: 8 }}>{s}</div>
      <p style={{ opacity: .95 }}>Benar {benar} dari {total} · +{benar} koin 🪙</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="kp-btn" style={{ background: '#fff', color: 'var(--lavender-d)', boxShadow: '0 5px 0 #c9b6f0' }} onClick={onLagi}>Main lagi</button>
        <button className="kp-btn" style={{ background: '#fff', color: 'var(--lavender-d)', boxShadow: '0 5px 0 #c9b6f0' }} onClick={onSelesai}>Selesai</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(game): komponen Reward"
```

---

## Task 9: Engine Mana Ya (tekan-sesuai)

**Files:**
- Create: `src/components/game/ManaYa.tsx`

Logika diadaptasi dari `mockups/demo.js` (fungsi renderRound/choose). Memanggil `onSelesai({benar,total,durasiDetik})` saat semua soal dijawab.

- [ ] **Step 1: Tulis engine**

```tsx
// src/components/game/ManaYa.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import type { DataTekan, HasilSelesai } from '@/lib/game/tipe';

function speak(t: string) {
  try {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'id-ID'; u.rate = 0.9; u.pitch = 1.15;
      speechSynthesis.speak(u);
    }
  } catch { /* abaikan */ }
}
function mix<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  for (let k = 0; k < seed % 4; k++) a.push(a.shift() as T);
  return a;
}

export default function ManaYa({ data, onSelesai }: { data: DataTekan; onSelesai: (h: HasilSelesai) => void }) {
  const [ronde, setRonde] = useState(0);
  const benarRef = useRef(0);
  const mulaiRef = useRef(Date.now());
  const soal = data.soal[ronde];

  useEffect(() => {
    if (soal) {
      const t = setTimeout(() => speak('Mana ' + soal.tanya + '?'), 350);
      return () => clearTimeout(t);
    }
  }, [ronde, soal]);

  function pilih(e: React.MouseEvent<HTMLButtonElement>, ok: boolean) {
    const btn = e.currentTarget;
    if (ok) {
      btn.style.outline = '4px solid var(--mint-d)';
      benarRef.current++;
      speak('Hebat!');
      setTimeout(() => {
        if (ronde + 1 >= data.soal.length) {
          onSelesai({ benar: benarRef.current, total: data.soal.length, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
        } else setRonde(ronde + 1);
      }, 800);
    } else {
      btn.animate([{ transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }], { duration: 350 });
      speak('Coba lagi ya');
    }
  }

  if (!soal) return null;
  const pilihan = mix([soal.benar, ...soal.salah], ronde + 1);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div onClick={() => speak('Mana ' + soal.tanya + '?')} style={{ background: '#fff', borderRadius: 22, padding: 16, textAlign: 'center', fontWeight: 800, fontSize: 20, boxShadow: '0 4px 0 #e6def5', cursor: 'pointer' }}>
        🔊 Mana <b>{soal.tanya}</b>?
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '14px 0' }}>
        {pilihan.map((emo, i) => (
          <button key={i} onClick={(e) => pilih(e, emo === soal.benar)}
            style={{ background: '#fff', border: 'none', borderRadius: 24, fontSize: 62, boxShadow: '0 6px 0 #e6def5', cursor: 'pointer' }}>
            {emo}
          </button>
        ))}
      </div>
      <div style={{ textAlign: 'center', color: 'var(--abu)', fontSize: 13 }}>{ronde + 1}/{data.soal.length}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(game): engine Mana Ya (tekan-sesuai)"
```

---

## Task 10: Engine Beres-Beres (seret-wadah)

**Files:**
- Create: `src/components/game/BeresBeres.tsx`

Adaptasi drag dari `mockups/demo.js` (startDrag/onDrag/endDrag) memakai pointer events + `elementFromPoint`.

- [ ] **Step 1: Tulis engine**

```tsx
// src/components/game/BeresBeres.tsx
'use client';
import { useRef, useState } from 'react';
import type { DataSeret, HasilSelesai } from '@/lib/game/tipe';

export default function BeresBeres({ data, onSelesai }: { data: DataSeret; onSelesai: (h: HasilSelesai) => void }) {
  const [sisa, setSisa] = useState(data.benda);
  const benarRef = useRef(0);
  const mulaiRef = useRef(Date.now());
  const dragRef = useRef<{ el: HTMLElement; cat: string; sx: number; sy: number } | null>(null);
  const total = data.benda.length;

  function down(e: React.PointerEvent<HTMLDivElement>, cat: string) {
    e.preventDefault();
    const el = e.currentTarget;
    dragRef.current = { el, cat, sx: e.clientX, sy: e.clientY };
    el.style.transition = 'none'; el.style.zIndex = '20';
    el.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current; if (!d) return;
    d.el.style.transform = `translate(${e.clientX - d.sx}px,${e.clientY - d.sy}px) scale(1.12)`;
  }
  function up(e: React.PointerEvent<HTMLDivElement>, emoji: string) {
    const d = dragRef.current; if (!d) return;
    dragRef.current = null;
    d.el.style.pointerEvents = 'none';
    const below = document.elementFromPoint(e.clientX, e.clientY);
    d.el.style.pointerEvents = '';
    const bin = below?.closest('[data-cat]') as HTMLElement | null;
    if (bin && bin.dataset.cat === d.cat) {
      benarRef.current++;
      const baru = sisa.filter((b) => b.emoji !== emoji || b.kategori !== d.cat);
      // hapus satu instance yang cocok
      const idx = sisa.findIndex((b) => b.emoji === emoji);
      const next = sisa.slice(); next.splice(idx, 1);
      setSisa(next);
      if (next.length === 0) {
        onSelesai({ benar: benarRef.current, total, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) });
      }
      void baru;
    } else {
      d.el.style.transition = 'transform .25s'; d.el.style.transform = '';
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 14, textAlign: 'center', fontWeight: 800, boxShadow: '0 4px 0 #e6def5' }}>🧺 Seret ke tempat yang benar</div>
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'center', padding: 14 }}>
        {sisa.map((b, i) => (
          <div key={i} onPointerDown={(e) => down(e, b.kategori)} onPointerMove={move} onPointerUp={(e) => up(e, b.emoji)}
            style={{ width: 84, height: 84, borderRadius: 22, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, boxShadow: '0 6px 0 #e6def5', touchAction: 'none', cursor: 'grab' }}>
            {b.emoji}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', paddingBottom: 8 }}>
        {data.wadah.map((w) => (
          <div key={w.kategori} data-cat={w.kategori}
            style={{ flex: 1, height: 110, borderRadius: 22, background: '#efe7fb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 38, border: '3px dashed #c9b6f0', color: '#7b6aa0' }}>
            {w.emoji}<small style={{ fontSize: 13, fontWeight: 700 }}>{w.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(game): engine Beres-Beres (seret-wadah)"
```

---

## Task 11: Engine Cari Pasangan (cocokkan)

**Files:**
- Create: `src/components/game/CariPasangan.tsx`

- [ ] **Step 1: Tulis engine**

```tsx
// src/components/game/CariPasangan.tsx
'use client';
import { useMemo, useRef, useState } from 'react';
import type { DataCocok, HasilSelesai } from '@/lib/game/tipe';

function mix<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  for (let k = 0; k < seed % a.length; k++) a.push(a.shift() as T);
  return a;
}

export default function CariPasangan({ data, onSelesai }: { data: DataCocok; onSelesai: (h: HasilSelesai) => void }) {
  const kartu = useMemo(() => mix([...data.pasangan, ...data.pasangan], 5), [data.pasangan]);
  const [terkunci, setTerkunci] = useState<number[]>([]);
  const [pilih, setPilih] = useState<number | null>(null);
  const cocokRef = useRef(0);
  const mulaiRef = useRef(Date.now());
  const total = data.pasangan.length;

  function klik(i: number) {
    if (terkunci.includes(i) || pilih === i) return;
    if (pilih === null) { setPilih(i); return; }
    if (kartu[pilih] === kartu[i]) {
      const baru = [...terkunci, pilih, i];
      setTerkunci(baru); setPilih(null); cocokRef.current++;
      if (cocokRef.current >= total) {
        setTimeout(() => onSelesai({ benar: total, total, durasiDetik: Math.round((Date.now() - mulaiRef.current) / 1000) }), 400);
      }
    } else {
      setPilih(null);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: 14, textAlign: 'center', fontWeight: 800, boxShadow: '0 4px 0 #e6def5' }}>🔎 Cari 2 gambar yang sama</div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignContent: 'center', padding: 14 }}>
        {kartu.map((emo, i) => {
          const lock = terkunci.includes(i);
          const sel = pilih === i;
          return (
            <button key={i} onClick={() => klik(i)}
              style={{ aspectRatio: '1', border: 'none', borderRadius: 20, fontSize: 42, cursor: lock ? 'default' : 'pointer',
                background: lock ? '#dff7ec' : '#fff',
                boxShadow: lock ? '0 5px 0 var(--mint-d)' : '0 5px 0 #e6def5',
                outline: sel ? '4px solid var(--biru-d)' : lock ? '3px solid var(--mint-d)' : 'none' }}>
              {emo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(game): engine Cari Pasangan (cocokkan)"
```

---

## Task 12: GameRunner — pilih engine + catat hasil

**Files:**
- Create: `src/components/game/GameRunner.tsx`

- [ ] **Step 1: Tulis runner**

```tsx
// src/components/game/GameRunner.tsx
'use client';
import { useState } from 'react';
import type { Paket, HasilSelesai, DataTekan, DataSeret, DataCocok } from '@/lib/game/tipe';
import ManaYa from './ManaYa';
import BeresBeres from './BeresBeres';
import CariPasangan from './CariPasangan';
import Reward from './Reward';
import { catatHasil } from '@/lib/data/skor';
import { hitungBintang } from '@/lib/domain/skor';

export default function GameRunner({
  paket, anakId, temaId, onKeluar, onKoin,
}: { paket: Paket; anakId: string; temaId: string; onKeluar: () => void; onKoin: (k: number) => void }) {
  const [run, setRun] = useState(0);              // remount engine untuk "main lagi"
  const [hasil, setHasil] = useState<HasilSelesai | null>(null);

  async function selesai(h: HasilSelesai) {
    setHasil(h);
    try {
      const r = await catatHasil({
        anakId, temaId, mesin: paket.mesin, areaSkill: paket.area_skill,
        benar: h.benar, total: h.total, durasiDetik: h.durasiDetik,
      });
      onKoin(r.koin);
    } catch { /* offline/Tahap berikut: antrikan; untuk M2 abaikan diam */ }
  }

  if (hasil) {
    return (
      <Reward
        bintang={hitungBintang(hasil.benar, hasil.total)}
        benar={hasil.benar} total={hasil.total}
        onLagi={() => { setHasil(null); setRun(run + 1); }}
        onSelesai={onKeluar}
      />
    );
  }

  const key = `${paket.id}-${run}`;
  if (paket.mesin === 'tekan-sesuai') return <ManaYa key={key} data={paket.butir as DataTekan} onSelesai={selesai} />;
  if (paket.mesin === 'seret-wadah') return <BeresBeres key={key} data={paket.butir as DataSeret} onSelesai={selesai} />;
  if (paket.mesin === 'cari-pasangan') return <CariPasangan key={key} data={paket.butir as DataCocok} onSelesai={selesai} />;
  return <div>Mesin belum didukung.</div>;
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(game): GameRunner pilih engine + catat hasil + reward"
```

---

## Task 13: MenuAnak (client) — menu + daftar game + PIN + timer

**Files:**
- Create: `src/app/main/[anakId]/MenuAnak.tsx`

State layar: `menu` | `daftar` | `main` | `istirahat`. Timer akumulasi waktu di localStorage harian; saat habis → layar istirahat (perlu PIN untuk lanjut).

- [ ] **Step 1: Tulis komponen**

```tsx
// src/app/main/[anakId]/MenuAnak.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Paket } from '@/lib/game/tipe';
import GameRunner from '@/components/game/GameRunner';
import PinGate from '@/components/game/PinGate';
import { waktuHabis, kunciHari, sisaDetik } from '@/lib/domain/waktu';
import s from './main.module.css';

type Layar = 'menu' | 'daftar' | 'main' | 'istirahat';

export default function MenuAnak({
  anak, temaNama, temaSampul, temaId, paket, pinTersimpan,
}: {
  anak: { id: string; koin: number; batas_menit: number };
  temaNama: string; temaSampul: string; temaId: string; paket: Paket[]; pinTersimpan: string | null;
}) {
  const router = useRouter();
  const [layar, setLayar] = useState<Layar>('menu');
  const [koin, setKoin] = useState(anak.koin);
  const [aktif, setAktif] = useState<Paket | null>(null);
  const [pinUntuk, setPinUntuk] = useState<null | 'keluar' | 'lanjut'>(null);
  const [terpakai, setTerpakai] = useState(0);
  const kunci = kunciHari(anak.id, new Date());

  // muat & jalankan timer harian
  useEffect(() => {
    const awal = Number(localStorage.getItem(kunci) ?? '0');
    setTerpakai(awal);
    const iv = setInterval(() => {
      setTerpakai((t) => {
        const n = t + 1;
        localStorage.setItem(kunci, String(n));
        if (waktuHabis(n, anak.batas_menit)) setLayar('istirahat');
        return n;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [kunci, anak.batas_menit]);

  const sisaMnt = Math.ceil(sisaDetik(terpakai, anak.batas_menit) / 60);

  if (layar === 'istirahat') {
    return (
      <div className={s.wrap}>
        <div className={s.rest}>
          <div className={s.emo}>😴🌙</div>
          <h2>Waktunya istirahat</h2>
          <p style={{ color: 'var(--abu)' }}>Sampai jumpa besok ya!</p>
          <button className="kp-btn" onClick={() => setPinUntuk('lanjut')}>🔒 Lanjut (izin ortu)</button>
        </div>
        {pinUntuk && (
          <PinGate pinTersimpan={pinTersimpan}
            onSukses={() => { localStorage.setItem(kunci, '0'); setTerpakai(0); setPinUntuk(null); setLayar('menu'); }}
            onBatal={() => setPinUntuk(null)} />
        )}
      </div>
    );
  }

  if (layar === 'main' && aktif) {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className={s.lock} onClick={() => setLayar('daftar')}>←</button>
          <div className={s.coin}>🪙 {koin}</div>
        </div>
        <GameRunner paket={aktif} anakId={anak.id} temaId={temaId}
          onKeluar={() => setLayar('daftar')} onKoin={setKoin} />
      </div>
    );
  }

  if (layar === 'daftar') {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className={s.lock} onClick={() => setLayar('menu')}>←</button>
          <div className={s.chip}>{temaSampul} {temaNama}</div>
          <div className={s.coin}>🪙 {koin}</div>
        </div>
        <div className={s.menu}>
          {paket.map((p) => (
            <button key={p.id} className={`${s.tile} ${s.tMain}`} onClick={() => { setAktif(p); setLayar('main'); }}>
              <span>🎯</span><div>{p.judul}</div>
            </button>
          ))}
        </div>
        <div className={s.foot}>Sisa waktu hari ini: {sisaMnt} menit</div>
      </div>
    );
  }

  // menu utama
  return (
    <div className={s.wrap}>
      <div className={s.top}>
        <div className={s.chip}>{temaSampul} {temaNama}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className={s.coin}>🪙 {koin}</div>
          <button className={s.lock} onClick={() => setPinUntuk('keluar')}>🔒</button>
        </div>
      </div>
      <div className={s.menu}>
        <button className={`${s.tile} ${s.tMain}`} onClick={() => setLayar('daftar')}><span>🎯</span><div>Main Minggu Ini<br /><small style={{ fontWeight: 600, fontSize: 12 }}>{paket.length} permainan</small></div></button>
        <button className={`${s.tile} ${s.tLib}`} onClick={() => setLayar('daftar')}><span>📚</span><div>Game Edukasi</div></button>
        <button className={`${s.tile} ${s.tVid}`} onClick={() => setPinUntuk('keluar')}><span>📺</span><div>Pojok Video<br /><small style={{ fontWeight: 600, fontSize: 12 }}>segera</small></div></button>
      </div>
      <div className={s.foot}>Sisa waktu hari ini: {sisaMnt} menit</div>
      {pinUntuk && (
        <PinGate pinTersimpan={pinTersimpan}
          onSukses={() => { setPinUntuk(null); router.push('/pilih-anak'); }}
          onBatal={() => setPinUntuk(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih. (Perbaiki jika ada karakter non-ASCII tak sengaja seperti "Lanjут" → tulis "Lanjut".)

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(main): MenuAnak (menu/daftar/main/istirahat) + PIN + timer harian"
```

---

## Task 14: Halaman /main/[anakId] (server) + ubah link pilih-anak

**Files:**
- Create: `src/app/main/[anakId]/page.tsx`
- Modify: `src/app/pilih-anak/page.tsx` (link `/main` → `/main/<id>`)
- Delete: `src/app/main/page.tsx` (placeholder M1 digantikan rute dinamis)

- [ ] **Step 1: Hapus placeholder lama**

Run: `cd /d/kidzplayful && rm src/app/main/page.tsx`

- [ ] **Step 2: Halaman server menu anak**

```tsx
// src/app/main/[anakId]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getMingguIni } from '@/lib/data/tema';
import MenuAnak from './MenuAnak';

export default async function MainPage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const anak = await getAnakTerjamin(anakId);
  const mi = await getMingguIni();
  if (!mi) redirect('/pilih-anak');

  const supabase = await createClient();
  const { data: prof } = await supabase.from('profiles').select('pin_ortu').single();

  return (
    <MenuAnak
      anak={{ id: anak.id, koin: anak.koin, batas_menit: anak.batas_menit }}
      temaNama={mi.tema.nama} temaSampul={mi.tema.sampul ?? '🎈'} temaId={mi.tema.id}
      paket={mi.paket} pinTersimpan={prof?.pin_ortu ?? null}
    />
  );
}
```

- [ ] **Step 3: Ubah link di pilih-anak**

Di `src/app/pilih-anak/page.tsx`, ubah atribut href kartu anak dari `href="/main"` menjadi `href={`/main/${a.id}`}`.

Cari baris:
```tsx
        <a key={a.id} href="/main" className="kp-card"
```
Ganti menjadi:
```tsx
        <a key={a.id} href={`/main/${a.id}`} className="kp-card"
```

- [ ] **Step 4: Verifikasi tipe & build**

Run: `cd /d/kidzplayful && npx tsc --noEmit && npm run build`
Expected: build sukses; route `/main/[anakId]` muncul sebagai dinamis (`ƒ`).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(main): rute /main/[anakId] + link dari pilih-anak"
```

---

## Task 15: E2E — main game → reward → koin naik

**Files:**
- Create: `tests/e2e/main-game.spec.ts`

- [ ] **Step 1: Tulis e2e**

```ts
// tests/e2e/main-game.spec.ts
import { test, expect } from '@playwright/test';

test('mode anak: main Mana Ya -> reward', async ({ page }) => {
  const email = `uji+m2_${process.env.E2E_STAMP ?? '1'}@kidzplayful.test`;

  // warmup rute lambat
  await page.goto('/pilih-anak');
  await page.waitForURL('**/login', { timeout: 90000 });

  await page.goto('/daftar');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'rahasia123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/pilih-anak', { timeout: 90000 });

  // tambah anak usia 3 (mode anak)
  await page.fill('input[name=nama]', 'Arka');
  await page.fill('input[name=tanggal_lahir]', '2023-01-01');
  await page.click('form button[type=submit]');
  await expect(page.getByText('Arka')).toBeVisible({ timeout: 30000 });

  // masuk mode anak
  await page.getByText('Arka').click();
  await page.waitForURL('**/main/**', { timeout: 90000 });
  await expect(page.getByText('Main Minggu Ini')).toBeVisible({ timeout: 60000 });

  // buka daftar game lalu mulai Mana Ya?
  await page.getByText('Main Minggu Ini').click();
  await page.getByText('Mana Ya?').click();

  // jawab 5 ronde: klik tombol yang berisi emoji benar (kucing/anjing/bebek/gajah/sapi)
  const benar = ['🐱', '🐶', '🦆', '🐘', '🐮'];
  for (const emo of benar) {
    await page.getByRole('button', { name: emo }).click();
    await page.waitForTimeout(1000);
  }

  await expect(page.getByText('Hebat!')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/koin/)).toBeVisible();
});
```

- [ ] **Step 2: Jalankan e2e**

Run:
```bash
cd /d/kidzplayful && E2E_STAMP=$(node -e "process.stdout.write(String(Date.now()))") npx playwright test tests/e2e/main-game.spec.ts
```
Expected: PASS. Jika "Mana Ya?" memunculkan urutan pilihan acak sehingga emoji benar tidak unik di layar, tes tetap valid karena hanya satu tombol bernama emoji benar per ronde. Jika gagal karena suara/timing, naikkan `waitForTimeout`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "test(e2e): mode anak main Mana Ya -> reward"
```

---

## Task 16: Verifikasi akhir Milestone 2

- [ ] **Step 1: Semua unit test**

Run: `cd /d/kidzplayful && npm test`
Expected: seluruh test domain PASS (M1 8 + skor 5 + waktu 3 = 16).

- [ ] **Step 2: Build**

Run: `cd /d/kidzplayful && npm run build`
Expected: sukses.

- [ ] **Step 3: Smoke manual (opsional)**

`npm run dev` → login akun uji → pilih anak → menu anak → main ketiga game (Mana Ya pakai suara; Beres-Beres seret; Cari Pasangan tap) → reward & koin bertambah → tekan 🔒 + PIN → kembali ke pilih-anak.

- [ ] **Step 4: Commit penutup (bila ada)**

```bash
git add -A && git commit -m "chore: tutup Milestone 2" || echo "tidak ada perubahan"
```

---

## Definition of Done (Milestone 2)
- Dari pilih-anak, masuk **Mode Anak** per anak (`/main/<id>`), terjaga RLS + status langganan.
- Menu anak menampilkan **tema Minggu Ini** + daftar game (dari `paket_aset`, data-driven).
- Ketiga mesin (**Mana Ya / Beres-Beres / Cari Pasangan**) dapat dimainkan; selesai → **Reward bintang**.
- Skor tercatat di **`hasil_main`**; **koin anak bertambah**.
- **Gerbang PIN** (set bila belum ada, verifikasi) melindungi keluar Mode Anak & Pojok Video.
- **Batas waktu harian** memicu layar istirahat; lanjut butuh PIN.
- Unit test hijau (16), e2e mode-anak hijau, build sukses.

## Catatan untuk Milestone berikutnya
- **Pojok Video** & **Pilih Game (auto-usia)** & **Game Edukasi/pustaka** penuh → M3.
- **Dashboard Admin** (tema/editor aset + AI, video, langganan, Laporan Member) → M4.
- Koin saat ini baca-lalu-tulis sederhana; bila perlu atomik, ganti ke RPC `increment` di M4/M5.
- Perekaman `hasil_main` belum punya antrean offline; PWA/offline → roadmap.
