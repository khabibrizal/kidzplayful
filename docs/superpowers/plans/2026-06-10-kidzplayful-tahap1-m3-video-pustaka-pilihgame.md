# KidzPlayful — Tahap 1 / Milestone 3: Pojok Video + Game Edukasi (Pustaka) + Pilih Game (auto-usia) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: pola subagent-driven (satu subagent per task, review di antara). Langkah memakai checkbox `- [ ]`.

**Goal:** Melengkapi Mode Anak dengan **Pojok Video** (embed YouTube terkunci & terbatas), **Game Edukasi/Pustaka** (telusur semua tema, bukan hanya Minggu Ini), dan halaman **Pilih Game** sisi orang tua dengan **auto-rekomendasi berdasarkan usia anak**.

**Architecture:** Lanjutan M2. Satu fetch server `getPustaka()` memuat seluruh tema disetujui + paket + video, diteruskan ke Mode Anak (skala konten kecil). Pojok Video memakai `youtube-nocookie` tanpa rekomendasi, dibatasi 2 video. Filter usia memakai logika murni teruji-unit. Komponen game (GameRunner) dari M2 dipakai ulang.

**Tech Stack:** Next.js 16, TypeScript, Supabase, Vitest, Playwright.

**Prasyarat:** M1 & M2 selesai (auth, Mode Anak, 3 mesin game, migrasi 0001 & 0002). Acuan spec: §6 (Pojok Video), §7 (tema/pustaka), §7.1 (penemuan game), §15 (ERD `video`).

---

## File Structure (Milestone ini)

| File | Tanggung jawab |
|---|---|
| `supabase/migrations/0003_video_tema2.sql` | tabel `video` + RLS + seed video Hewan + seed tema kedua "Buah" |
| `src/lib/domain/usia.ts` (+test) | `cocokUsia(umur,min,max)` |
| `src/lib/game/tipe.ts` (modifikasi) | tambah tipe `Video`, `TemaLengkap`, perluas `Paket` (usia) |
| `src/lib/data/pustaka.ts` | `getPustaka()` (semua tema+paket+video), `getGameCocokUsia(umur)` |
| `src/components/game/VideoPojok.tsx` | pemutar video terkunci + daftar (maks 2) |
| `src/app/main/[anakId]/MenuAnak.tsx` (ganti) | tambah layar `pustaka` & `video`; 📚/📺 berfungsi |
| `src/app/main/[anakId]/page.tsx` (modifikasi) | pakai `getPustaka()` |
| `src/app/pilih-game/[anakId]/page.tsx` | halaman Pilih Game (ortu, auto-usia) |
| `src/app/pilih-game/[anakId]/PilihGame.tsx` | UI: "Cocok untuk [nama]" + telusur tema |
| `src/app/pilih-anak/page.tsx` (modifikasi) | tambah link "🎯 Pilih game" per anak |
| `tests/e2e/video-pustaka.spec.ts` | e2e: Pojok Video tampil + Game Edukasi >1 tema |

---

## Task 1: Migrasi video + tema kedua

**Files:**
- Create: `supabase/migrations/0003_video_tema2.sql`

- [ ] **Step 1: Tulis migrasi**

```sql
-- supabase/migrations/0003_video_tema2.sql
create table public.video (
  id uuid primary key default gen_random_uuid(),
  tema_id uuid not null references public.tema(id) on delete cascade,
  judul text not null,
  youtube_id text not null,
  durasi_detik int not null default 0,
  urutan int not null default 0,
  link_ok boolean not null default true,
  status text not null default 'disetujui' check (status in ('draf','disetujui'))
);
create index video_tema_idx on public.video(tema_id);

alter table public.video enable row level security;
create policy "baca video disetujui" on public.video
  for select to authenticated using (status = 'disetujui' and link_ok = true);

-- seed video untuk tema Hewan (youtube_id placeholder; ganti dengan kurasi nyata via Admin di M4)
insert into public.video (tema_id, judul, youtube_id, durasi_detik, urutan)
select id, 'Mengenal Suara Hewan', 'dQw4w9WgXcQ', 120, 1 from public.tema where nama = 'Hewan';
insert into public.video (tema_id, judul, youtube_id, durasi_detik, urutan)
select id, 'Lagu Hewan', 'aqz-KE-bpKQ', 180, 2 from public.tema where nama = 'Hewan';

-- seed tema kedua "Buah" (TIDAK minggu ini) supaya pustaka berisi >1 tema
with t as (
  insert into public.tema (nama, sampul, is_minggu_ini, status)
  values ('Buah', '🍎', false, 'disetujui') returning id
)
insert into public.paket_aset (tema_id, mesin, judul, area_skill, usia_min, usia_max, butir, urutan)
select t.id, x.mesin, x.judul, x.area_skill, x.umin, x.umax, x.butir, x.urutan from t,
(values
  ('tekan-sesuai','Mana Ya?','kognitif',2,5,
   '{"soal":[{"tanya":"apel","benar":"🍎","salah":["🍌","🍇","🍉"]},{"tanya":"pisang","benar":"🍌","salah":["🍎","🍓","🍐"]},{"tanya":"semangka","benar":"🍉","salah":["🍒","🥝","🍍"]}]}'::jsonb, 1),
  ('seret-wadah','Beres-Beres','motorik-halus',3,5,
   '{"wadah":[{"kategori":"merah","label":"Merah","emoji":"🟥"},{"kategori":"kuning","label":"Kuning","emoji":"🟨"}],"benda":[{"emoji":"🍎","kategori":"merah"},{"emoji":"🍌","kategori":"kuning"},{"emoji":"🍓","kategori":"merah"},{"emoji":"🍋","kategori":"kuning"}]}'::jsonb, 2),
  ('cari-pasangan','Cari Pasangan','kognitif',3,5,
   '{"pasangan":["🍎","🍌","🍇"]}'::jsonb, 3)
) as x(mesin, judul, area_skill, umin, umax, butir, urutan);
```

- [ ] **Step 2: Terapkan migrasi**

Run (CLI/Dashboard SQL Editor — tempel & Run isi file):
```bash
cd /d/kidzplayful && supabase db push
```
Expected: tabel `video` ada; 2 baris video Hewan; 1 tema "Buah" + 3 paket.

- [ ] **Step 3: Verifikasi tabel ada**

Run:
```bash
cd /d/kidzplayful && source .env.local 2>/dev/null; \
curl -s -o /dev/null -w "video HTTP %{http_code}\n" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/video?select=id&limit=1"
```
Expected: HTTP 200 (isi `[]` karena RLS butuh auth — normal; seed diverifikasi via e2e).

- [ ] **Step 4: Commit**

```bash
cd /d/kidzplayful && git add -A && git commit -m "feat(db): tabel video + seed video Hewan + tema kedua Buah"
```

---

## Task 2: Logika murni — cocok usia

**Files:**
- Create: `src/lib/domain/usia.ts`
- Test: `src/lib/domain/__tests__/usia.test.ts`

- [ ] **Step 1: Tulis test gagal**

```ts
// src/lib/domain/__tests__/usia.test.ts
import { describe, it, expect } from 'vitest';
import { cocokUsia } from '../usia';

describe('cocokUsia', () => {
  it('true bila umur dalam rentang', () => expect(cocokUsia(3, 2, 4)).toBe(true));
  it('true di batas bawah/atas', () => {
    expect(cocokUsia(2, 2, 4)).toBe(true);
    expect(cocokUsia(4, 2, 4)).toBe(true);
  });
  it('false di luar rentang', () => {
    expect(cocokUsia(1, 2, 4)).toBe(false);
    expect(cocokUsia(5, 2, 4)).toBe(false);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd /d/kidzplayful && npx vitest run src/lib/domain/__tests__/usia.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasi**

```ts
// src/lib/domain/usia.ts
export function cocokUsia(umur: number, min: number, max: number): boolean {
  return umur >= min && umur <= max;
}
```

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `cd /d/kidzplayful && npx vitest run src/lib/domain/__tests__/usia.test.ts`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(domain): cocokUsia + tests"
```

---

## Task 3: Perluas tipe game (Video, TemaLengkap, usia pada Paket)

**Files:**
- Modify: `src/lib/game/tipe.ts`

- [ ] **Step 1: Tambah tipe di akhir file**

Tambahkan ke `src/lib/game/tipe.ts` (jangan hapus yang lama):

```ts
export interface Video {
  id: string;
  judul: string;
  youtube_id: string;
  durasi_detik: number;
}

export interface TemaInfo {
  id: string;
  nama: string;
  sampul: string | null;
  is_minggu_ini: boolean;
}

export interface TemaLengkap {
  tema: TemaInfo;
  paket: Paket[];
  video: Video[];
}
```

Dan pada interface `Paket`, tambahkan dua field usia (ubah definisi `Paket` yang ada):

```ts
export interface Paket {
  id: string;
  mesin: Mesin;
  judul: string;
  area_skill: string;
  usia_min: number;
  usia_max: number;
  butir: DataTekan | DataSeret | DataCocok;
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih. (Jika `getMingguIni`/`GameRunner` mengeluh field `usia_min/usia_max` kurang, akan ditangani di Task 4 saat select menambah kolomnya.)

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(game): tipe Video/TemaLengkap + usia pada Paket"
```

---

## Task 4: Data layer pustaka

**Files:**
- Create: `src/lib/data/pustaka.ts`

- [ ] **Step 1: Tulis modul**

```ts
// src/lib/data/pustaka.ts
import { createClient } from '@/lib/supabase/server';
import type { TemaLengkap, Paket, Video } from '@/lib/game/tipe';

export async function getPustaka(): Promise<TemaLengkap[]> {
  const supabase = await createClient();
  const { data: tema } = await supabase
    .from('tema').select('id,nama,sampul,is_minggu_ini')
    .eq('status', 'disetujui')
    .order('is_minggu_ini', { ascending: false })
    .order('created_at');
  if (!tema) return [];

  const ids = tema.map((t) => t.id);
  const { data: paket } = await supabase
    .from('paket_aset')
    .select('id,tema_id,mesin,judul,area_skill,usia_min,usia_max,butir')
    .in('tema_id', ids).eq('status', 'disetujui').order('urutan');
  const { data: video } = await supabase
    .from('video')
    .select('id,tema_id,judul,youtube_id,durasi_detik')
    .in('tema_id', ids).order('urutan');

  return tema.map((t) => ({
    tema: { id: t.id, nama: t.nama, sampul: t.sampul, is_minggu_ini: t.is_minggu_ini },
    paket: ((paket ?? []).filter((p) => p.tema_id === t.id)) as unknown as Paket[],
    video: ((video ?? []).filter((v) => v.tema_id === t.id)) as unknown as Video[],
  }));
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(data): getPustaka (semua tema+paket+video)"
```

---

## Task 5: Komponen VideoPojok (terkunci, maks 2)

**Files:**
- Create: `src/components/game/VideoPojok.tsx`

- [ ] **Step 1: Tulis komponen**

```tsx
// src/components/game/VideoPojok.tsx
'use client';
import { useState } from 'react';
import type { Video } from '@/lib/game/tipe';

const MAKS_TONTON = 2;

export default function VideoPojok({ video, onKeluar }: { video: Video[]; onKeluar: () => void }) {
  const [aktif, setAktif] = useState<Video | null>(null);
  const [ditonton, setDitonton] = useState(0);

  if (ditonton >= MAKS_TONTON) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10, padding: 24 }}>
        <div style={{ fontSize: 60 }}>😊</div>
        <h2>Cukup dulu ya</h2>
        <p style={{ color: 'var(--abu)' }}>Yuk main game lagi!</p>
        <button className="kp-btn" onClick={onKeluar}>Kembali</button>
      </div>
    );
  }

  if (aktif) {
    const src = `https://www.youtube-nocookie.com/embed/${aktif.youtube_id}?rel=0&modestbranding=1&controls=1&disablekb=1`;
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
          <iframe title={aktif.judul} src={src} allow="encrypted-media" allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        </div>
        <button className="kp-btn" onClick={() => { setAktif(null); setDitonton((d) => d + 1); }}>Selesai nonton</button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
      <div style={{ fontSize: 12, color: 'var(--abu)', textAlign: 'center' }}>Maks. {MAKS_TONTON} video · dipilih KidzPlayful</div>
      {video.length === 0 && <p style={{ color: 'var(--abu)', textAlign: 'center' }}>Belum ada video untuk tema ini.</p>}
      {video.map((v) => (
        <button key={v.id} className="kp-card" onClick={() => setAktif(v)}
          style={{ display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', border: 'none', cursor: 'pointer' }}>
          <span style={{ fontSize: 30 }}>▶</span>
          <span><b>{v.judul}</b><br /><small style={{ color: 'var(--abu)' }}>{Math.round(v.durasi_detik / 60)} menit</small></span>
        </button>
      ))}
      <button className="kp-btn" style={{ marginTop: 8 }} onClick={onKeluar}>Kembali</button>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi tipe**

Run: `cd /d/kidzplayful && npx tsc --noEmit`
Expected: bersih.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(game): VideoPojok terkunci (youtube-nocookie, maks 2)"
```

---

## Task 6: MenuAnak v2 — layar pustaka & video

**Files:**
- Modify (ganti penuh): `src/app/main/[anakId]/MenuAnak.tsx`

Ganti seluruh isi `MenuAnak.tsx` dengan versi berikut. Perubahan dari M2: prop `pustaka: TemaLengkap[]` (bukan paket lepas), Minggu Ini diturunkan dari pustaka, layar baru `pustaka` (telusur tema) & `video`, 📚 → pustaka, 📺 → video.

- [ ] **Step 1: Tulis MenuAnak v2**

```tsx
// src/app/main/[anakId]/MenuAnak.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Paket, TemaLengkap } from '@/lib/game/tipe';
import GameRunner from '@/components/game/GameRunner';
import PinGate from '@/components/game/PinGate';
import VideoPojok from '@/components/game/VideoPojok';
import { waktuHabis, kunciHari, sisaDetik } from '@/lib/domain/waktu';
import s from './main.module.css';

type Layar = 'menu' | 'daftar' | 'pustaka' | 'video' | 'main' | 'istirahat';

export default function MenuAnak({
  anak, pustaka, pinTersimpan,
}: {
  anak: { id: string; koin: number; batas_menit: number };
  pustaka: TemaLengkap[]; pinTersimpan: string | null;
}) {
  const router = useRouter();
  const mingguIni = pustaka.find((t) => t.tema.is_minggu_ini) ?? pustaka[0] ?? null;
  const [layar, setLayar] = useState<Layar>('menu');
  const [koin, setKoin] = useState(anak.koin);
  const [aktif, setAktif] = useState<Paket | null>(null);
  const [temaTerpilih, setTemaTerpilih] = useState<TemaLengkap | null>(mingguIni);
  const [pinUntuk, setPinUntuk] = useState<null | 'keluar'>(null);
  const [terpakai, setTerpakai] = useState(0);
  const [kunci] = useState(() => kunciHari(anak.id, new Date()));

  useEffect(() => {
    const awal = Number(localStorage.getItem(kunci) ?? '0');
    // localStorage hanya di klien; baca awal harus di effect (komponen ikut SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  function mulaiGame(p: Paket, tema: TemaLengkap) {
    setTemaTerpilih(tema); setAktif(p); setLayar('main');
  }

  if (layar === 'istirahat') {
    return (
      <div className={s.wrap}>
        <div className={s.rest}>
          <div className={s.emo}>😴🌙</div>
          <h2>Waktunya istirahat</h2>
          <p style={{ color: 'var(--abu)' }}>Sampai jumpa besok ya!</p>
          <button className="kp-btn" onClick={() => setPinUntuk('keluar')}>🔒 Lanjut (izin ortu)</button>
        </div>
        {pinUntuk && (
          <PinGate pinTersimpan={pinTersimpan}
            onSukses={() => { localStorage.setItem(kunci, '0'); setTerpakai(0); setPinUntuk(null); setLayar('menu'); }}
            onBatal={() => setPinUntuk(null)} />
        )}
      </div>
    );
  }

  if (layar === 'main' && aktif && temaTerpilih) {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className={s.lock} onClick={() => setLayar('daftar')}>←</button>
          <div className={s.coin}>🪙 {koin}</div>
        </div>
        <GameRunner paket={aktif} anakId={anak.id} temaId={temaTerpilih.tema.id}
          onKeluar={() => setLayar('daftar')} onKoin={setKoin} />
      </div>
    );
  }

  if (layar === 'video') {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className={s.lock} onClick={() => setLayar('menu')}>←</button>
          <div className={s.chip}>📺 Pojok Video</div>
          <div className={s.coin}>🪙 {koin}</div>
        </div>
        <VideoPojok video={mingguIni?.video ?? []} onKeluar={() => setLayar('menu')} />
      </div>
    );
  }

  if (layar === 'pustaka') {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className={s.lock} onClick={() => setLayar('menu')}>←</button>
          <div className={s.chip}>📚 Game Edukasi</div>
          <div className={s.coin}>🪙 {koin}</div>
        </div>
        <div className={s.menu}>
          {pustaka.map((t) => (
            <button key={t.tema.id} className={`${s.tile} ${s.tLib}`}
              onClick={() => { setTemaTerpilih(t); setLayar('daftar'); }}>
              <span>{t.tema.sampul ?? '🎈'}</span><div>{t.tema.nama}<br /><small style={{ fontWeight: 600, fontSize: 12 }}>{t.paket.length} permainan</small></div>
            </button>
          ))}
        </div>
        <div className={s.foot}>Sisa waktu hari ini: {sisaMnt} menit</div>
      </div>
    );
  }

  if (layar === 'daftar' && temaTerpilih) {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className={s.lock} onClick={() => setLayar('menu')}>←</button>
          <div className={s.chip}>{temaTerpilih.tema.sampul ?? '🎈'} {temaTerpilih.tema.nama}</div>
          <div className={s.coin}>🪙 {koin}</div>
        </div>
        <div className={s.menu}>
          {temaTerpilih.paket.map((p) => (
            <button key={p.id} className={`${s.tile} ${s.tMain}`} onClick={() => mulaiGame(p, temaTerpilih)}>
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
        <div className={s.chip}>{mingguIni?.tema.sampul ?? '🎈'} {mingguIni?.tema.nama ?? 'KidzPlayful'}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className={s.coin}>🪙 {koin}</div>
          <button className={s.lock} onClick={() => setPinUntuk('keluar')}>🔒</button>
        </div>
      </div>
      <div className={s.menu}>
        <button className={`${s.tile} ${s.tMain}`} onClick={() => { setTemaTerpilih(mingguIni); setLayar('daftar'); }} disabled={!mingguIni}>
          <span>🎯</span><div>Main Minggu Ini<br /><small style={{ fontWeight: 600, fontSize: 12 }}>{mingguIni?.paket.length ?? 0} permainan</small></div>
        </button>
        <button className={`${s.tile} ${s.tLib}`} onClick={() => setLayar('pustaka')}><span>📚</span><div>Game Edukasi<br /><small style={{ fontWeight: 600, fontSize: 12 }}>{pustaka.length} tema</small></div></button>
        <button className={`${s.tile} ${s.tVid}`} onClick={() => setLayar('video')}><span>📺</span><div>Pojok Video</div></button>
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
Expected: bersih (akan error sampai Task 7 mengubah `page.tsx` mengirim prop `pustaka`). Jika error hanya soal prop di `page.tsx`, lanjut Task 7 lalu cek ulang.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(main): MenuAnak v2 + layar pustaka & Pojok Video"
```

---

## Task 7: page.tsx pakai getPustaka

**Files:**
- Modify (ganti penuh): `src/app/main/[anakId]/page.tsx`

- [ ] **Step 1: Tulis page v2**

```tsx
// src/app/main/[anakId]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getPustaka } from '@/lib/data/pustaka';
import MenuAnak from './MenuAnak';

export default async function MainPage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const anak = await getAnakTerjamin(anakId);
  const pustaka = await getPustaka();
  if (pustaka.length === 0) redirect('/pilih-anak');

  const supabase = await createClient();
  const { data: prof } = await supabase.from('profiles').select('pin_ortu').single();

  return (
    <MenuAnak
      anak={{ id: anak.id, koin: anak.koin, batas_menit: anak.batas_menit }}
      pustaka={pustaka}
      pinTersimpan={prof?.pin_ortu ?? null}
    />
  );
}
```

- [ ] **Step 2: Verifikasi tipe & build**

Run: `cd /d/kidzplayful && npx tsc --noEmit && npm run build`
Expected: bersih + build sukses.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(main): page pakai getPustaka"
```

---

## Task 8: Pilih Game (ortu, auto-usia)

**Files:**
- Create: `src/app/pilih-game/[anakId]/page.tsx`
- Create: `src/app/pilih-game/[anakId]/PilihGame.tsx`

Halaman sisi ortu: hitung umur anak, tampilkan "Cocok untuk [nama] ([usia])" (paket yang `cocokUsia`) + telusur semua tema. Tap game → masuk Mode Anak tema itu (arahkan ke `/main/<id>`). Untuk M3, tombol game cukup menavigasi ke `/main/<anakId>` (Mode Anak), sebab peluncuran game spesifik dari luar Mode Anak butuh state — disederhanakan: Pilih Game berfungsi sebagai katalog rekomendasi + pintu masuk.

- [ ] **Step 1: UI PilihGame**

```tsx
// src/app/pilih-game/[anakId]/PilihGame.tsx
'use client';
import { useRouter } from 'next/navigation';
import type { TemaLengkap } from '@/lib/game/tipe';
import { cocokUsia } from '@/lib/domain/usia';

export default function PilihGame({
  anakId, nama, umur, pustaka,
}: { anakId: string; nama: string; umur: number; pustaka: TemaLengkap[] }) {
  const router = useRouter();
  const cocok = pustaka.flatMap((t) =>
    t.paket.filter((p) => cocokUsia(umur, p.usia_min, p.usia_max)).map((p) => ({ p, t })),
  );

  return (
    <main style={{ maxWidth: 440, margin: '20px auto', padding: 16 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22 }}>🎯 Pilih untuk {nama}</h1>
      <p style={{ color: 'var(--abu)', marginBottom: 14 }}>🧒 {umur} tahun · disaring otomatis dari usia</p>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>COCOK UNTUK {nama.toUpperCase()}</div>
      {cocok.map(({ p, t }) => (
        <div key={p.id} className="kp-card" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 26 }}>{t.tema.sampul ?? '🎈'}</span>
          <span style={{ flex: 1 }}><b>{p.judul}</b><br /><small style={{ color: 'var(--abu)' }}>{t.tema.nama} · {p.usia_min}-{p.usia_max} thn</small></span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#3a9e72', background: '#eafaf2', padding: '4px 9px', borderRadius: 99 }}>cocok</span>
        </div>
      ))}
      {cocok.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada game yang cocok untuk usia ini.</p>}

      <button className="kp-btn" style={{ width: '100%', marginTop: 14 }} onClick={() => router.push(`/main/${anakId}`)}>
        ▶ Masuk Mode Anak
      </button>
      <p style={{ textAlign: 'center', marginTop: 10 }}>
        <a href="/pilih-anak" style={{ color: 'var(--biru-d)', fontSize: 13 }}>← kembali</a>
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Halaman server**

```tsx
// src/app/pilih-game/[anakId]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getPustaka } from '@/lib/data/pustaka';
import { umurTahun } from '@/lib/domain/anak';
import PilihGame from './PilihGame';

export default async function PilihGamePage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  await getAnakTerjamin(anakId); // guard
  const supabase = await createClient();
  const { data: anak } = await supabase.from('anak').select('nama,tanggal_lahir').eq('id', anakId).single();
  const pustaka = await getPustaka();
  const umur = anak ? umurTahun(new Date(anak.tanggal_lahir + 'T00:00:00Z'), new Date()) : 0;

  return <PilihGame anakId={anakId} nama={anak?.nama ?? 'Anak'} umur={umur} pustaka={pustaka} />;
}
```

- [ ] **Step 3: Verifikasi tipe & build**

Run: `cd /d/kidzplayful && npx tsc --noEmit && npm run build`
Expected: bersih + build sukses; route `/pilih-game/[anakId]` dinamis.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(pilih-game): halaman ortu auto-rekomendasi usia"
```

---

## Task 9: Link "Pilih game" dari pilih-anak

**Files:**
- Modify: `src/app/pilih-anak/page.tsx`

- [ ] **Step 1: Tambah tautan per anak**

Di dalam `.map` kartu anak di `src/app/pilih-anak/page.tsx`, tambahkan link kecil ke Pilih Game. Ubah blok kartu anak menjadi (bungkus dengan wadah + 2 tautan):

Cari:
```tsx
        <a key={a.id} href={`/main/${a.id}`} className="kp-card"
           style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, textDecoration: 'none', color: 'inherit' }}>
          <span style={{ fontSize: 30 }}>🧒</span>
          <span><b>{a.nama}</b><br /><small style={{ color: 'var(--abu)' }}>mode {a.mode_default}</small></span>
        </a>
```
Ganti dengan:
```tsx
        <div key={a.id} className="kp-card" style={{ marginBottom: 10 }}>
          <a href={`/main/${a.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 30 }}>🧒</span>
            <span><b>{a.nama}</b><br /><small style={{ color: 'var(--abu)' }}>mode {a.mode_default}</small></span>
          </a>
          <a href={`/pilih-game/${a.id}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: 'var(--biru-d)' }}>🎯 Pilih game (orang tua)</a>
        </div>
```

- [ ] **Step 2: Verifikasi tipe & build**

Run: `cd /d/kidzplayful && npx tsc --noEmit && npm run build`
Expected: bersih + build sukses.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(pilih-anak): tautan Pilih Game per anak"
```

---

## Task 10: E2E — Pojok Video + Game Edukasi

**Files:**
- Create: `tests/e2e/video-pustaka.spec.ts`

- [ ] **Step 1: Tulis e2e**

```ts
// tests/e2e/video-pustaka.spec.ts
import { test, expect } from '@playwright/test';

test('pojok video tampil + game edukasi >1 tema', async ({ page }) => {
  const email = `uji+m3_${process.env.E2E_STAMP ?? '1'}@kidzplayful.test`;

  await page.goto('/pilih-anak');
  await page.waitForURL('**/login', { timeout: 90000 });
  await page.goto('/daftar');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'rahasia123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/pilih-anak', { timeout: 90000 });
  await page.fill('input[name=nama]', 'Arka');
  await page.fill('input[name=tanggal_lahir]', '2023-01-01');
  await page.click('form button[type=submit]');
  await expect(page.getByText('Arka')).toBeVisible({ timeout: 30000 });

  await page.getByText('Arka').first().click();
  await page.waitForURL('**/main/**', { timeout: 90000 });
  await expect(page.getByText('Pojok Video')).toBeVisible({ timeout: 60000 });

  // Pojok Video: buka, lihat daftar video, putar 1
  await page.getByText('Pojok Video').click();
  await expect(page.getByText('Mengenal Suara Hewan')).toBeVisible();
  await page.getByText('Mengenal Suara Hewan').click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /youtube-nocookie\.com/);

  // kembali ke menu lalu buka Game Edukasi -> harus >1 tema (Hewan + Buah)
  await page.getByText('Selesai nonton').click();
  await page.getByText('Kembali').click();
  await page.getByText('Game Edukasi').click();
  await expect(page.getByText('Hewan')).toBeVisible();
  await expect(page.getByText('Buah')).toBeVisible();
});
```

- [ ] **Step 2: Jalankan e2e**

Run:
```bash
cd /d/kidzplayful && E2E_STAMP=$(node -e "process.stdout.write(String(Date.now()))") npx playwright test tests/e2e/video-pustaka.spec.ts
```
Expected: PASS. Jika gagal karena navigasi lambat, naikkan timeout/`waitForTimeout`. Jika iframe butuh waktu muat, gunakan `toHaveAttribute` (sudah, tidak perlu video benar-benar play).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "test(e2e): pojok video + game edukasi multi-tema"
```

---

## Task 11: Verifikasi akhir Milestone 3

- [ ] **Step 1: Semua unit test**

Run: `cd /d/kidzplayful && npm test`
Expected: PASS (M1 8 + M2 8 + usia 3 = 19).

- [ ] **Step 2: Build**

Run: `cd /d/kidzplayful && npm run build`
Expected: sukses; route `/main/[anakId]` & `/pilih-game/[anakId]` dinamis.

- [ ] **Step 3: Smoke manual (opsional)**

`npm run dev` → login → pilih anak → Mode Anak → 📺 Pojok Video (putar, batas 2) → 📚 Game Edukasi (pilih tema Buah → main) → kembali pilih-anak → "🎯 Pilih game" → lihat rekomendasi sesuai usia.

- [ ] **Step 4: Commit penutup (bila ada)**

```bash
git add -A && git commit -m "chore: tutup Milestone 3" || echo "tidak ada perubahan"
```

---

## Definition of Done (Milestone 3)
- **Pojok Video** dapat dibuka di Mode Anak: daftar video terkurasi, pemutar **terkunci** (`youtube-nocookie`, tanpa rekomendasi), dibatasi **2 video**.
- **Game Edukasi/Pustaka** menampilkan **semua tema disetujui** (Hewan + Buah), pilih tema → main game-nya (reuse GameRunner).
- **Pilih Game** sisi ortu menampilkan **"Cocok untuk [nama] ([usia])"** otomatis sesuai usia + pintu masuk Mode Anak.
- Unit test hijau (19), e2e M3 hijau, build sukses.

## Catatan untuk Milestone berikutnya
- **Dashboard Admin** (kelola tema, editor aset + pipeline AI draf→approve, kelola video/kurasi nyata, kelola langganan aktivasi manual, Laporan Member) → M4.
- youtube_id seed saat ini placeholder — diganti kurasi nyata lewat Admin di M4.
- Polish, aksesibilitas, rename `middleware`→`proxy`, deploy → M5.
