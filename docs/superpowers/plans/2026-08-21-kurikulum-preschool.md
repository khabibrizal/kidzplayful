# Kurikulum Preschool Homeschooling — Implementation Plan

> **Untuk pekerja agen:** ikuti tugas-per-tugas, jangan melompat. Langkah memakai checkbox (`- [ ]`).
> **Spec:** [docs/superpowers/specs/2026-08-21-kurikulum-preschool-design.md](../specs/2026-08-21-kurikulum-preschool-design.md)

**Goal:** Ide Bermain berubah dari kumpulan materi lepas menjadi **kurikulum per anak**: 4 tema per bulan langganan, checklist evaluasi per aktivitas yang masuk rapor, dan tautan aktivitas → game edukasi yang bisa kembali ke asalnya.

**Architecture:** Aturan kurikulum ditaruh di modul **murni** `domain/kurikulum.ts` (diuji vitest), datanya di `kelas_bermain` (kolom bulan/urutan + dua field opsional di `aktivitas jsonb`) dan tabel baru `evaluasi_kurikulum`. Jam kohort adalah **penghitung tersimpan** `langganan_anak.bulan_kurikulum` yang hanya naik di `setPaketAnak`. Semua pembacaan kolom baru memakai pola **toleran** karena migrasi dijalankan manual **setelah** deploy.

**Tech Stack:** Next.js 16 App Router (Server Component untuk baca, Server Action untuk tulis), Supabase Postgres + RLS, vitest, canvas tanpa dependensi (rapor JPEG).

**Aturan repo yang wajib dipatuhi** (dari `CLAUDE.md`): hak akses = DATA; kolom baru dibaca toleran; berkas `'use server'` **hanya boleh mengekspor fungsi async**; uang/nilai dihitung server; perubahan tata letak kanvas **wajib diperiksa visual**; komit bahasa Indonesia + trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

**Gerbang mutu sebelum SETIAP commit:** `npx tsc --noEmit` → `npx eslint <berkas>` → `npm test` → `npm run build`.

---

## Struktur berkas

| Berkas | Tanggung jawab |
|---|---|
| `supabase/migrations/0098_kurikulum.sql` | **baru** — kolom tema, penghitung bulan + backfill, tabel `evaluasi_kurikulum` + RLS |
| `src/lib/domain/kurikulum.ts` | **baru** — aturan bulan & status tema, ringkasan evaluasi (murni) |
| `src/lib/domain/__tests__/kurikulum.test.ts` | **baru** — tes aturan di atas |
| `src/lib/game/tipe.ts` | `AktivitasItem.evaluasi?`/`game_paket_id?`, `KelasBermain.bulan_kurikulum?`/`urutan?`, tipe `HasilEvaluasi` |
| `src/lib/data/publik.ts` | `getKelasAktifCached` membaca kolom baru (toleran) + urut `bulan_kurikulum, urutan` |
| `src/lib/data/kurikulum.ts` | **baru** — `getBulanKurikulumAnak`, `getEvaluasiAnak`, `getEvaluasiTema` |
| `src/lib/data/kurikulum-actions.ts` | **baru** — `simpanEvaluasi` (snapshot dari materi, guard peran) |
| `src/lib/data/game-pilihan.ts` | **baru** — daftar `paket_aset` untuk dropdown admin |
| `src/lib/data/langganan-anak-actions.ts` | `setPaketAnak` menaikkan `bulan_kurikulum` |
| `src/app/admin/kelas-bermain/KelasAdmin.tsx` | field evaluasi per aktivitas, pemilih game opsional, bulan & urutan, peringatan ≠4 |
| `src/components/KelasIsi.tsx` | blok evaluasi + tombol simpan + tombol game |
| `src/components/PemilihAnak.tsx` | **baru** — pemilih anak untuk halaman tanpa `anakId` |
| `src/app/kelas/[id]/page.tsx`, `src/app/kelas-saya/page.tsx` | `?anak=`, gerbang `statusTema` per anak |
| `src/app/ortu/[anakId]/page.tsx`, `src/app/main/[anakId]/*` | pengelompokan per bulan, `?kembali=` |
| `src/lib/nav.ts` | **baru** — `pathInternal()` (murni) untuk memvalidasi `kembali` |
| `src/components/LaporanAnakView.tsx`, `src/lib/domain/laporan-bulanan.ts`, `src/lib/rapor-jpeg.ts` | blok "Evaluasi Kurikulum" di layar & JPEG |

---

## Task 1: Aturan kurikulum (murni, TDD)

**Files:**
- Create: `src/lib/domain/kurikulum.ts`
- Test: `src/lib/domain/__tests__/kurikulum.test.ts`

- [ ] **Step 1: Tulis tes yang gagal**

```ts
// src/lib/domain/__tests__/kurikulum.test.ts
import { describe, it, expect } from 'vitest';
import { bulanKurikulumAnak, statusTema, kelompokTema, ringkasEvaluasi } from '../kurikulum';

const tema = (bulan: number, judul = `T${bulan}`) => ({ id: judul, judul, bulan_kurikulum: bulan, urutan: 0 });

describe('bulanKurikulumAnak', () => {
  it('anak tanpa langganan tetap dapat bulan ke-1 (trial & Basic ikut kurikulum)', () => {
    expect(bulanKurikulumAnak(0)).toBe(1);
    expect(bulanKurikulumAnak(undefined)).toBe(1);
    expect(bulanKurikulumAnak(null)).toBe(1);
  });
  it('memakai penghitung tersimpan apa adanya', () => {
    expect(bulanKurikulumAnak(3)).toBe(3);
  });
  it('angka aneh tidak melempar', () => {
    expect(bulanKurikulumAnak(-5)).toBe(1);
    expect(bulanKurikulumAnak(2.7)).toBe(2);
  });
});

describe('statusTema', () => {
  it('bulan yang sudah dilewati & bulan ini terbuka penuh', () => {
    expect(statusTema(tema(1), 3)).toBe('terbuka');
    expect(statusTema(tema(3), 3)).toBe('terbuka');
  });
  it('bulan depan hanya judulnya', () => {
    expect(statusTema(tema(4), 3)).toBe('kunci-judul');
  });
  it('lebih dari sebulan ke depan disembunyikan', () => {
    expect(statusTema(tema(5), 3)).toBe('tersembunyi');
  });
  it('tema tanpa bulan (materi lama) dianggap terbuka — jangan mengunci yang tadinya jalan', () => {
    expect(statusTema({ id: 'x', judul: 'x' }, 1)).toBe('terbuka');
  });
});

describe('kelompokTema', () => {
  const list = [tema(1, 'a'), tema(2, 'b'), tema(3, 'c'), tema(4, 'd'), tema(9, 'e')];
  it('membagi bulan ini / sudah terbuka / bulan depan, dan membuang yang tersembunyi', () => {
    const g = kelompokTema(list, 3);
    expect(g.bulanIni.map((t) => t.judul)).toEqual(['c']);
    expect(g.sudahTerbuka.map((t) => t.judul)).toEqual(['a', 'b']);
    expect(g.bulanDepan.map((t) => t.judul)).toEqual(['d']);
  });
  it('sudah terbuka diurutkan dari yang TERBARU (bulan turun)', () => {
    expect(kelompokTema(list, 3).sudahTerbuka.map((t) => t.bulan_kurikulum)).toEqual([2, 1]);
  });
});

describe('ringkasEvaluasi', () => {
  it('menghitung tercapai & persen', () => {
    expect(ringkasEvaluasi([
      { aktivitas: 'A', butir: 'x', tercapai: true },
      { aktivitas: 'A', butir: 'y', tercapai: false },
    ])).toEqual({ total: 2, tercapai: 1, persen: 50 });
  });
  it('kosong tidak membagi nol', () => {
    expect(ringkasEvaluasi([])).toEqual({ total: 0, tercapai: 0, persen: 0 });
  });
});
```

- [ ] **Step 2: Jalankan tes, pastikan GAGAL**

`npx vitest run src/lib/domain/__tests__/kurikulum.test.ts` → gagal "Failed to resolve import ../kurikulum".

- [ ] **Step 3: Implementasi minimal**

```ts
// src/lib/domain/kurikulum.ts — aturan kurikulum bulanan (murni, tanpa I/O).
//
// Kohort itu MILIK ANAK, bukan akun: kakak di bulan ke-3 TIDAK membuka tema itu untuk bayi
// yang masih bulan ke-1. Karena itu satu-satunya masukan waktu di berkas ini adalah
// `bulanAnak` — tak ada varian tingkat akun yang bisa dipanggil keliru lalu diam-diam
// menggabungkan kohort dua anak.
export interface TemaKurikulum { id: string; judul: string; bulan_kurikulum?: number | null; urutan?: number | null }
export type StatusTema = 'terbuka' | 'kunci-judul' | 'tersembunyi';
export interface ButirEvaluasi { aktivitas: string; butir: string; tercapai: boolean }

/** Bulan kurikulum seorang anak. Minimal 1: trial & Basic pun ikut kurikulum (bulan ke-1). */
export function bulanKurikulumAnak(bulanTersimpan?: number | null): number {
  const n = Math.floor(Number(bulanTersimpan) || 0);
  return n < 1 ? 1 : n;
}

/**
 * Tema tanpa `bulan_kurikulum` (materi lama / migrasi 0098 belum jalan) dianggap
 * TERBUKA. Default yang salah arah di sini akan mengunci konten yang tadinya jalan.
 */
export function statusTema(tema: TemaKurikulum, bulanAnak: number): StatusTema {
  const b = Math.floor(Number(tema.bulan_kurikulum) || 0);
  if (b < 1) return 'terbuka';
  if (b <= bulanAnak) return 'terbuka';
  if (b === bulanAnak + 1) return 'kunci-judul';
  return 'tersembunyi';
}

const urut = (a: TemaKurikulum, b: TemaKurikulum) =>
  (a.bulan_kurikulum ?? 0) - (b.bulan_kurikulum ?? 0) || (a.urutan ?? 0) - (b.urutan ?? 0);

export function kelompokTema<T extends TemaKurikulum>(list: T[], bulanAnak: number): {
  bulanIni: T[]; sudahTerbuka: T[]; bulanDepan: T[];
} {
  const bulanIni: T[] = [], sudahTerbuka: T[] = [], bulanDepan: T[] = [];
  for (const t of list ?? []) {
    const st = statusTema(t, bulanAnak);
    if (st === 'kunci-judul') bulanDepan.push(t);
    else if (st === 'terbuka') ((t.bulan_kurikulum ?? 0) === bulanAnak ? bulanIni : sudahTerbuka).push(t);
  }
  return {
    bulanIni: bulanIni.sort(urut),
    // Yang sudah terbuka diurutkan dari yang TERBARU: bulan lalu lebih relevan dari bulan ke-1.
    sudahTerbuka: sudahTerbuka.sort((a, b) => urut(b, a)),
    bulanDepan: bulanDepan.sort(urut),
  };
}

export function ringkasEvaluasi(hasil: ButirEvaluasi[] | null | undefined): { total: number; tercapai: number; persen: number } {
  const h = hasil ?? [];
  const tercapai = h.filter((x) => x.tercapai).length;
  return { total: h.length, tercapai, persen: h.length ? Math.round((tercapai / h.length) * 100) : 0 };
}
```

- [ ] **Step 4: Tes LULUS**

`npx vitest run src/lib/domain/__tests__/kurikulum.test.ts` → semua hijau.

- [ ] **Step 5: Uji daya gigit (WAJIB, jangan terima hijau sebagai bukti)**

Ubah sementara `if (b <= bulanAnak)` → `if (b < bulanAnak)`; jalankan tes → **harus gagal** ("bulan ini terbuka penuh"). Kembalikan. Ulangi dengan menghapus `n < 1 ? 1 : n` → **harus gagal** (tes trial). Kembalikan.

- [ ] **Step 6: Commit**

```bash
git add src/lib/domain/kurikulum.ts src/lib/domain/__tests__/kurikulum.test.ts
git -c commit.gpgsign=false commit -m "feat(kurikulum): aturan bulan & status tema (murni, diuji)"
```

---

## Task 2: Migrasi 0098 + tipe + pembacaan toleran

**Files:**
- Create: `supabase/migrations/0098_kurikulum.sql`
- Modify: `src/lib/game/tipe.ts`, `src/lib/data/publik.ts`

- [ ] **Step 1: Tulis migrasinya**

```sql
-- 0098_kurikulum.sql — kurikulum bulanan per anak + evaluasi per aktivitas.
-- Idempoten. Dijalankan MANUAL di Supabase SQL Editor setelah deploy.

-- 1) Tema: bulan kurikulum + urutan --------------------------------------------
alter table public.kelas_bermain add column if not exists bulan_kurikulum int not null default 1;
alter table public.kelas_bermain add column if not exists urutan int not null default 0;
create index if not exists kelas_bermain_kurikulum_idx on public.kelas_bermain(bulan_kurikulum, urutan);

-- 2) Penghitung bulan langganan per ANAK ---------------------------------------
--    Kohort mengikuti JUMLAH BULAN BERLANGGANAN, bukan tanggal kalender: bulan yang
--    tidak aktif tidak menambah hitungan. Karena itu angkanya DISIMPAN dan hanya naik
--    di `setPaketAnak` — menurunkannya dari riwayat akan salah untuk aktivasi manual
--    admin dan untuk member lama hasil backfill 0089 (keduanya tanpa baris tagihan).
alter table public.langganan_anak add column if not exists bulan_kurikulum int not null default 0;

update public.langganan_anak la
   set bulan_kurikulum = greatest(1, coalesce((
         select sum(t.bulan)::int
           from public.tagihan_langganan_item i
           join public.tagihan_langganan t on t.id = i.tagihan_id
          where i.anak_id = la.anak_id and t.status = 'diterima'
       ), 0))
 where la.bulan_kurikulum = 0;

-- 3) Hasil evaluasi per (anak, tema) -------------------------------------------
create table if not exists public.evaluasi_kurikulum (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references public.anak(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  kelas_id uuid not null references public.kelas_bermain(id) on delete cascade,
  -- SNAPSHOT kalimatnya, bukan indeks: [{aktivitas, butir, tercapai}]. Begitu admin
  -- menyunting kalimat evaluasi, rapor bulan lalu tidak boleh berubah artinya.
  hasil jsonb not null default '[]'::jsonb,
  catatan text,
  dinilai_oleh text,
  peran text not null default 'ortu' check (peran in ('ortu','guru','psikolog','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (anak_id, kelas_id)
);
create index if not exists evaluasi_kurikulum_anak_idx on public.evaluasi_kurikulum(anak_id, updated_at desc);

alter table public.evaluasi_kurikulum enable row level security;

drop policy if exists "evaluasi baca" on public.evaluasi_kurikulum;
create policy "evaluasi baca" on public.evaluasi_kurikulum for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin() or public.is_guru()
         or public.boleh_lihat_laporan_anak(anak_id));

drop policy if exists "evaluasi tulis" on public.evaluasi_kurikulum;
create policy "evaluasi tulis" on public.evaluasi_kurikulum for insert to authenticated
  with check (ortu_id = auth.uid() or public.is_admin() or public.is_guru()
              or public.boleh_lihat_laporan_anak(anak_id));

drop policy if exists "evaluasi ubah" on public.evaluasi_kurikulum;
create policy "evaluasi ubah" on public.evaluasi_kurikulum for update to authenticated
  using (ortu_id = auth.uid() or public.is_admin() or public.is_guru()
         or public.boleh_lihat_laporan_anak(anak_id))
  with check (ortu_id = auth.uid() or public.is_admin() or public.is_guru()
              or public.boleh_lihat_laporan_anak(anak_id));

-- TIDAK ADA policy DELETE untuk ortu: riwayat rapor tak boleh dirapikan belakangan
-- (pola `kegiatan_anak`, 0093). Admin membersihkan lewat SQL Editor bila perlu.
```

> Tanda tangan `public.boleh_lihat_laporan_anak(p_anak_id uuid)` sudah diverifikasi ada di `0066_laporan_akses_psikolog.sql` — policy di atas memanggilnya apa adanya.

- [ ] **Step 2: Tambah tipe**

Di `src/lib/game/tipe.ts`, pada `AktivitasItem` tambahkan:

```ts
  /** kalimat checklist evaluasi; diinput admin, boleh berbeda tiap aktivitas (0098) */
  evaluasi?: string[];
  /** paket_aset yang admin nilai cocok; null/absen = aktivitas tanpa game */
  game_paket_id?: string | null;
```

Pada `KelasBermain` tambahkan:

```ts
  bulan_kurikulum?: number;   // 0098 — tema ini milik bulan ke-N kurikulum
  urutan?: number;            // 0098 — urutan di dalam bulan itu
```

Lalu tipe hasil evaluasi:

```ts
export interface ButirEvaluasiTersimpan { aktivitas: string; butir: string; tercapai: boolean }
export interface EvaluasiKurikulum {
  kelas_id: string;
  hasil: ButirEvaluasiTersimpan[];
  catatan: string | null;
  dinilai_oleh: string | null;
  peran: 'ortu' | 'guru' | 'psikolog' | 'admin';
  updated_at: string;
}
```

- [ ] **Step 3: Baca kolom baru secara TOLERAN**

Di `src/lib/data/publik.ts`, tambahkan konstanta dan pakai di `getKelasAktifCached` (perhatikan: `pilihToleran` sudah ada, jangan menulis ulang):

```ts
const K_098 = `${K_089},bulan_kurikulum,urutan`;
```

```ts
export const getKelasAktifCached = unstable_cache(
  async (): Promise<KelasBermain[]> => {
    // Urut bulan kurikulum → urutan; bila kolomnya belum ada (0098 belum jalan) jatuh ke
    // urutan lama (created_at) dan SEMUA tema dianggap terbuka oleh `statusTema`.
    const baru = await anon.from('kelas_bermain').select(K_098).eq('status', 'aktif')
      .order('bulan_kurikulum', { ascending: true }).order('urutan', { ascending: true });
    if (!baru.error) return (baru.data ?? []) as unknown as KelasBermain[];
    return pilihToleran<KelasBermain>(
      (cols) => anon.from('kelas_bermain').select(cols).eq('status', 'aktif').order('created_at', { ascending: false }),
      K_089, K);
  },
  ['katalog-kelas'], { tags: ['katalog'], revalidate: 60 },
);
```

- [ ] **Step 4: Gerbang mutu + commit**

```bash
npx tsc --noEmit && npx eslint src/lib/data/publik.ts src/lib/game/tipe.ts && npm test && npm run build
git add supabase/migrations/0098_kurikulum.sql src/lib/game/tipe.ts src/lib/data/publik.ts
git -c commit.gpgsign=false commit -m "feat(kurikulum): migrasi 0098 + tipe + pembacaan kolom tema secara toleran"
```

- [ ] **Step 5: Minta user menjalankan 0098**, lalu verifikasi lewat probe anon baca-saja (pola sesi 0093–0097): tabel & kolom ada, kolom kontrol palsu tetap `42703`.

---

## Task 3: Penghitung bulan naik saat periode diberikan

**Files:**
- Modify: `src/lib/data/langganan-anak-actions.ts` (`setPaketAnak`)

- [ ] **Step 1: Naikkan penghitung di dalam upsert**

Ganti blok `upsert` pada `setPaketAnak` menjadi (baca dulu nilai lama bersama `aktif_sampai` — `select('aktif_sampai,bulan_kurikulum')`, toleran bila kolomnya belum ada):

```ts
    // Jam kohort kurikulum mengikuti JUMLAH BULAN BERLANGGANAN, jadi ia naik di sini —
    // satu-satunya tempat periode diperpanjang (admin manual DAN verifikasi tagihan).
    // `hentikanPaketAnak` tidak menurunkannya: bulan yang sudah dijalani tidak hilang.
    const tambah = Math.max(1, Math.floor(bulan));
    const baris: Record<string, unknown> = {
      anak_id: anakId, ortu_id: anak.ortu_id as string, paket_id: paketId,
      aktif_sampai: aktifSampai, updated_at: new Date().toISOString(),
    };
    if (bulanLama !== null) baris.bulan_kurikulum = bulanLama + tambah;

    const { error } = await s.from('langganan_anak').upsert(baris, { onConflict: 'anak_id' });
    if (error) {
      // Kolom 0098 belum ada → ulangi tanpa penghitung, jangan mematikan aktivasi.
      if (!/bulan_kurikulum/.test(error.message)) return { ok: false, error: error.message };
      delete baris.bulan_kurikulum;
      const ulang = await s.from('langganan_anak').upsert(baris, { onConflict: 'anak_id' });
      if (ulang.error) return { ok: false, error: ulang.error.message };
    }
```

`bulanLama` diambil dari query pembacaan; bila kolomnya tak terbaca, `bulanLama = null`.

- [ ] **Step 2: Uji manual (tak ada unit test — ini I/O)**

Di `/admin/langganan`, aktifkan 2 bulan untuk satu anak → probe REST sebagai admin memastikan `bulan_kurikulum` naik 2. Aktifkan lagi 1 bulan → naik jadi 3. Tekan **Hentikan** → nilainya **tidak** berubah.

- [ ] **Step 3: Gerbang mutu + commit**

```bash
git -c commit.gpgsign=false commit -am "feat(kurikulum): bulan_kurikulum naik saat periode langganan anak diberikan"
```

---

## Task 4: Admin — kalimat evaluasi, pemilih game (opsional), bulan & urutan

**Files:**
- Create: `src/lib/data/game-pilihan.ts`
- Modify: `src/app/admin/kelas-bermain/page.tsx`, `src/app/admin/kelas-bermain/KelasAdmin.tsx`, `src/lib/data/kelas-bermain-actions.ts` (action penyimpan materi)

- [ ] **Step 1: Reader daftar game**

```ts
// src/lib/data/game-pilihan.ts — daftar game untuk dropdown "game per aktivitas" (admin).
import { createClient } from '@/lib/supabase/server';

export interface OpsiGame { id: string; judul: string; area_skill: string; tema: string }

/** Semua paket game disetujui, bergrup per tema. Admin memilihnya per aktivitas (opsional). */
export async function getOpsiGame(): Promise<OpsiGame[]> {
  const s = await createClient();
  const { data } = await s.from('paket_aset')
    .select('id,judul,area_skill,status,tema:tema_id(nama)')
    .eq('status', 'disetujui').order('judul');
  return (data ?? []).map((r) => {
    const t = Array.isArray(r.tema) ? r.tema[0] : r.tema;
    return {
      id: r.id as string, judul: r.judul as string, area_skill: (r.area_skill as string) ?? '-',
      tema: (t as { nama?: string } | null)?.nama ?? 'Tanpa tema',
    };
  });
}
```

- [ ] **Step 2: Teruskan opsi game + tambah field di form**

Di `page.tsx`, `await getOpsiGame()` lalu kirim `opsiGame` ke `KelasAdmin`. Di `KelasAdmin.tsx`:

1. Bentuk form aktivitas (`{ judul, caraMembuat, langkah, catatanOrtu }`) ditambah `evaluasi: string[]` dan `gamePaketId: string`. Nilai awal dari materi: `evaluasi: a.evaluasi ?? []`, `gamePaketId: a.game_paket_id ?? ''`.
2. Helper baris evaluasi mengikuti pola `setLangkah`/`tambahLangkah`/`hapusLangkah` yang **sudah ada** di berkas itu — jangan membuat pola baru:

```tsx
{/* EVALUASI: kalimat checklist yang nanti dicentang orang tua */}
<div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>📋 Butir evaluasi</div>
{a.evaluasi.map((ev, ei) => (
  <div key={ei} className={s.row} style={{ gap: 6, marginTop: 4 }}>
    <input className={s.inp} value={ev} placeholder="mis. Anak mau memegang manik tanpa dibantu"
      onChange={(e) => setEvaluasi(ai, ei, e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
    <button className={s.btnSm} style={{ background: '#eee' }} onClick={() => hapusEvaluasi(ai, ei)}>✕</button>
  </div>
))}
<button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }}
  onClick={() => tambahEvaluasi(ai)}>+ butir evaluasi</button>

{/* GAME: OPSIONAL — pilihan pertama sengaja "tanpa game" */}
<div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>🎮 Game untuk aktivitas ini (opsional)</div>
<select className={s.inp} value={a.gamePaketId} onChange={(e) => setAkt(ai, { gamePaketId: e.target.value })}
  style={{ width: '100%', marginTop: 4 }}>
  <option value="">— tanpa game —</option>
  {opsiGame.map((g) => <option key={g.id} value={g.id}>{g.tema} · {g.judul} ({g.area_skill})</option>)}
</select>
```

3. Field tema: `bulan_kurikulum` (number, min 1) + `urutan` (number).
4. Saat menyimpan, petakan kembali ke bentuk jsonb: `evaluasi: a.evaluasi.map((x) => x.trim()).filter(Boolean)`, `game_paket_id: a.gamePaketId || null`.

- [ ] **Step 3: Peringatan bulan tak berisi 4 tema**

Di daftar materi admin, hitung `Map<bulan, jumlah>` dan tampilkan baris peringatan untuk bulan yang ≠ 4:

```tsx
{[...hitungBulan.entries()].filter(([, n]) => n !== 4).map(([b, n]) => (
  <div key={b} className={s.muted} style={{ fontSize: 12, color: '#b88600' }}>
    ⚠️ Bulan {b}: {n} tema (kurikulum dirancang 4 tema/bulan)
  </div>
))}
```

- [ ] **Step 4: Gerbang mutu + commit**

```bash
git -c commit.gpgsign=false commit -am "feat(kurikulum): admin isi butir evaluasi & pilih game per aktivitas (opsional)"
```

---

## Task 5: Reader & action evaluasi

**Files:**
- Create: `src/lib/data/kurikulum.ts`, `src/lib/data/kurikulum-actions.ts`

- [ ] **Step 1: Reader**

```ts
// src/lib/data/kurikulum.ts — bulan kurikulum seorang anak + hasil evaluasinya.
import { createClient } from '@/lib/supabase/server';
import { bulanKurikulumAnak } from '@/lib/domain/kurikulum';
import type { EvaluasiKurikulum } from '@/lib/game/tipe';

/** Bulan kurikulum SEORANG ANAK (bukan akun). Kolom belum ada → bulan ke-1. */
export async function getBulanKurikulumAnak(anakId: string): Promise<number> {
  const s = await createClient();
  const { data, error } = await s.from('langganan_anak')
    .select('bulan_kurikulum').eq('anak_id', anakId).maybeSingle();
  if (error) return bulanKurikulumAnak(0);
  return bulanKurikulumAnak((data?.bulan_kurikulum as number | null) ?? 0);
}

/** Semua evaluasi tersimpan milik satu anak (untuk rapor & prefill checklist). */
export async function getEvaluasiAnak(anakId: string): Promise<EvaluasiKurikulum[]> {
  const s = await createClient();
  const { data, error } = await s.from('evaluasi_kurikulum')
    .select('kelas_id,hasil,catatan,dinilai_oleh,peran,updated_at')
    .eq('anak_id', anakId).order('updated_at', { ascending: false });
  if (error) return [];   // tabel belum ada (0098 belum jalan)
  return (data ?? []) as unknown as EvaluasiKurikulum[];
}
```

- [ ] **Step 2: Action simpan**

```ts
// src/lib/data/kurikulum-actions.ts — simpan checklist evaluasi satu tema untuk satu anak.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ButirEvaluasiTersimpan } from '@/lib/game/tipe';

/**
 * Menyimpan seluruh checklist sebuah tema (satu baris per anak+tema).
 *
 * Kalimat butirnya diambil ULANG dari materi di server, bukan dari kiriman klien: klien
 * hanya menyebut aktivitas ke-i dan butir ke-j yang dicentang. Tanpa itu, siapa pun bisa
 * menuliskan kalimat evaluasi karangan sendiri ke rapor anaknya.
 */
export async function simpanEvaluasi(
  anakId: string, kelasId: string, dicentang: Record<string, number[]>, catatan?: string,
): Promise<{ ok: boolean; error?: string; tercapai?: number; total?: number }> {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { ok: false, error: 'Harus login.' };

    const [{ data: anak }, { data: kelas }, { data: prof }] = await Promise.all([
      s.from('anak').select('id,ortu_id').eq('id', anakId).maybeSingle(),
      s.from('kelas_bermain').select('aktivitas').eq('id', kelasId).maybeSingle(),
      s.from('profiles').select('is_admin,is_guru,is_psikolog,nama_tampilan,email').eq('id', user.id).maybeSingle(),
    ]);
    if (!anak) return { ok: false, error: 'Anak tidak ditemukan.' };
    if (!kelas) return { ok: false, error: 'Materi tidak ditemukan.' };

    const milikSendiri = anak.ortu_id === user.id;
    const peran = milikSendiri ? 'ortu'
      : prof?.is_admin ? 'admin' : prof?.is_guru ? 'guru' : prof?.is_psikolog ? 'psikolog' : null;
    if (!peran) return { ok: false, error: 'Anda tidak berhak menilai anak ini.' };

    const aktivitas = (kelas.aktivitas as { judul?: string; evaluasi?: string[] }[]) ?? [];
    const hasil: ButirEvaluasiTersimpan[] = [];
    aktivitas.forEach((a, ai) => {
      const centang = new Set(dicentang[String(ai)] ?? []);
      (a.evaluasi ?? []).forEach((butir, bi) => {
        hasil.push({ aktivitas: a.judul || `Aktivitas ${ai + 1}`, butir, tercapai: centang.has(bi) });
      });
    });
    if (hasil.length === 0) return { ok: false, error: 'Materi ini belum punya butir evaluasi.' };

    const oleh = (prof?.nama_tampilan as string | null)?.trim() || (prof?.email as string | null) || null;
    const { error } = await s.from('evaluasi_kurikulum').upsert({
      anak_id: anakId, ortu_id: anak.ortu_id as string, kelas_id: kelasId,
      hasil, catatan: catatan?.trim() || null, dinilai_oleh: oleh, peran,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'anak_id,kelas_id' });
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/anak/${anakId}/laporan`); revalidatePath('/kelas-saya');
    return { ok: true, tercapai: hasil.filter((h) => h.tercapai).length, total: hasil.length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan evaluasi.' };
  }
}
```

- [ ] **Step 3: Gerbang mutu + commit**

```bash
git -c commit.gpgsign=false commit -am "feat(kurikulum): reader bulan & evaluasi + action simpan checklist"
```

---

## Task 6: Checklist & tombol game di `KelasIsi`

**Files:**
- Create: `src/lib/nav.ts`, `src/lib/__tests__/nav.test.ts`
- Modify: `src/components/KelasIsi.tsx`

- [ ] **Step 1: Tes + helper path internal (TDD kecil)**

```ts
// src/lib/__tests__/nav.test.ts
import { describe, it, expect } from 'vitest';
import { pathInternal } from '../nav';

describe('pathInternal', () => {
  it('menerima path internal', () => {
    expect(pathInternal('/kelas/abc')).toBe('/kelas/abc');
    expect(pathInternal('/ortu/1?x=2')).toBe('/ortu/1?x=2');
  });
  it('menolak URL luar & protokol aneh — parameter redirect bebas = open redirect', () => {
    for (const jahat of ['https://luar.example', '//luar.example', 'javascript:alert(1)', 'http://x', '']) {
      expect(pathInternal(jahat)).toBeNull();
    }
  });
});
```

```ts
// src/lib/nav.ts
/** Path internal yang aman dipakai sebagai tujuan `kembali` (bukan open redirect). */
export function pathInternal(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  if (!s.startsWith('/') || s.startsWith('//')) return null;
  return s;
}
```

- [ ] **Step 2: Blok evaluasi + tombol game di `KelasIsi`**

`KelasIsi` menerima prop baru: `anakId?: string`, `anakNama?: string`, `evaluasiAwal?: ButirEvaluasiTersimpan[]`, `kembaliUrl?: string`. Di dalam `kelas.aktivitas.map(...)`, **setelah** blok `catatan_ortu`, tambahkan:

```tsx
{a.game_paket_id && anakId && (
  <a className="kp-btn putih" style={{ display: 'inline-block', marginTop: 10, fontSize: 13 }}
     href={`/main/${anakId}?paket=${a.game_paket_id}&kembali=${encodeURIComponent(kembaliUrl ?? `/kelas/${kelas.id}?anak=${anakId}`)}`}>
    🎮 Mainkan game aktivitas ini
  </a>
)}

{(a.evaluasi?.length ?? 0) > 0 && (
  <div style={{ marginTop: 10, background: '#faf8ff', borderRadius: 12, padding: '8px 12px' }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lavender-d)' }}>
      📋 EVALUASI{anakNama ? ` — ${anakNama}` : ''}
    </div>
    {!anakId && <div style={{ fontSize: 12, color: 'var(--abu)' }}>Pilih anak dulu untuk menilai.</div>}
    {a.evaluasi!.map((butir, bi) => (
      <label key={bi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 6, fontSize: 14 }}>
        <input type="checkbox" disabled={!anakId} checked={dicentang[ai]?.includes(bi) ?? false}
          onChange={() => toggle(ai, bi)} />
        <span>{butir}</span>
      </label>
    ))}
  </div>
)}
```

Di bawah seluruh aktivitas, **satu** tombol simpan per tema:

```tsx
{adaEvaluasi && anakId && (
  <div className="kp-card no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
    <button className="kp-btn mint" onClick={simpan} disabled={sibuk}>
      {sibuk ? 'Menyimpan…' : '💾 Simpan evaluasi tema ini'}
    </button>
    <span style={{ fontSize: 12, color: belumTersimpan ? '#b88600' : 'var(--abu)' }}>
      {ringkas.tercapai} dari {ringkas.total} butir tercapai
      {belumTersimpan ? ' · belum tersimpan' : pesanSimpan}
    </span>
  </div>
)}
```

`belumTersimpan` = state berubah sejak `evaluasiAwal`. **Wajib ada** — checklist yang tampak tersimpan padahal belum adalah cara tercepat kehilangan kepercayaan.

- [ ] **Step 3: Gerbang mutu + commit**

```bash
npx vitest run src/lib/__tests__/nav.test.ts && npx tsc --noEmit && npm run build
git -c commit.gpgsign=false commit -am "feat(kurikulum): checklist evaluasi & tombol game di materi"
```

---

## Task 7: Gerbang bulanan + konteks anak di halaman tanpa `anakId`

**Files:**
- Create: `src/components/PemilihAnak.tsx`
- Modify: `src/app/kelas/[id]/page.tsx`, `src/app/kelas-saya/page.tsx`, `src/app/ortu/[anakId]/page.tsx`, `src/app/main/[anakId]/MenuAnak.tsx`

- [ ] **Step 1: `PemilihAnak`** — client component: `<select>` daftar anak → `router.push('?anak=' + id)`. Selalu terlihat, bukan tersembunyi.

- [ ] **Step 2: `/kelas/[id]`** — baca `searchParams.anak`, bawaan anak pertama (`getAnakSaya()`); ambil `getBulanKurikulumAnak(anakId)`; hitung `statusTema(kelas, bulanAnak)`:
  - `terbuka` → render `KelasIsi` penuh + evaluasi;
  - `kunci-judul` → judul + sampul + keterangan **"terbuka saat langganan {nama} masuk bulan ke-N"**;
  - `tersembunyi` → 404-lembut dengan alasan yang terbaca (**jangan** redirect diam-diam — aturan `CLAUDE.md`).
  Judul halaman: `Kurikulum {nama} · bulan ke-{bulanAnak}` + `<PemilihAnak/>`.

- [ ] **Step 3: `/kelas-saya` & Mode Ortu** — kelompokkan dengan `kelompokTema(list, bulanAnak)` menjadi tiga bagian (BULAN INI / SUDAH TERBUKA / BULAN DEPAN). Mode Ortu memakai `anakId` dari path (tanpa pemilih).

- [ ] **Step 4: Mode Anak** — `MenuAnak` menyaring daftar kelas dengan `statusTema` juga, supaya anak tak melihat tema bulan depan.

- [ ] **Step 5: Uji kohort dua anak (uji utama fitur ini)** — kakak `bulan_kurikulum=3`, bayi `=1`: tema bulan ke-3 terbuka untuk kakak dan **terkunci untuk bayi**; ganti anak lewat pemilih → daftar ikut berubah.

- [ ] **Step 6: Gerbang mutu + commit**

```bash
git -c commit.gpgsign=false commit -am "feat(kurikulum): gerbang tema bulanan per anak + pemilih anak di halaman materi"
```

---

## Task 8: Kembali dari game ke aktivitas

**Files:**
- Modify: `src/app/main/[anakId]/page.tsx`, `src/app/main/[anakId]/MenuAnak.tsx`

- [ ] **Step 1** — `searchParams` menerima `kembali`; validasi `pathInternal(kembali)`; teruskan ke `MenuAnak` sebagai prop `kembaliUrl`.
- [ ] **Step 2** — di `MenuAnak`, `onKeluar` layar game: bila `kembaliUrl` ada **dan** game dibuka dari `paketAwal`, `router.push(kembaliUrl)`; selain itu perilaku lama (`setLayar('daftar')`). Jangan mengubah jalur keluar biasa.
- [ ] **Step 3** — uji: dari aktivitas → game → keluar → kembali **ke halaman materi itu**, dan `?kembali=https://luar.example` diabaikan.
- [ ] **Step 4: Commit**

```bash
git -c commit.gpgsign=false commit -am "feat(kurikulum): tombol keluar game kembali ke aktivitas asalnya"
```

---

## Task 9: Evaluasi masuk rapor (layar & JPEG)

**Files:**
- Modify: `src/components/LaporanAnakView.tsx`, `src/app/anak/[anakId]/laporan/page.tsx`, `src/lib/domain/laporan-bulanan.ts` (+ tesnya), `src/app/anak/[anakId]/rapor/[ym]/page.tsx`, `src/lib/rapor-jpeg.ts`, `src/components/UnduhRaporBtn.tsx`

- [ ] **Step 1** — `laporan-bulanan.ts`: tambah tipe `EvaluasiRingkas { judulTema, tercapai, total, peran, dinilaiOleh, belum: string[] }`, terima `evaluasi?: EvaluasiRingkas[]` di `ringkasBulan`, kembalikan apa adanya, dan **ikutkan ke `adaIsi`** (bulan yang hanya berisi evaluasi tetap layak dicetak). Tambah tes seperti pola `rekomendasiPsikolog`.
- [ ] **Step 2** — halaman rapor bulanan: `getEvaluasiAnak(anakId)` difilter `updated_at` di dalam `rentangBulan(ym)`; render blok **"📋 EVALUASI KURIKULUM"** dengan `x dari y` + **siapa penilai** ("dinilai orang tua" / "dinilai guru").
- [ ] **Step 3** — `LaporanAnakView`: blok yang sama untuk rapor berjalan.
- [ ] **Step 4** — `rapor-jpeg.ts`: tambahkan bagian evaluasi. **Ruangnya harus DICADANGKAN** seperti `cadanganItem`/`plafonNaratif` yang sudah ada — jangan menaruhnya di sisa ruang.
- [ ] **Step 5: WAJIB — verifikasi VISUAL**, bukan membaca kode. Bundel `rapor-jpeg.ts` dengan Vite lalu render di Chrome (`chromium.launch({ channel: 'chrome' })`), isi contoh: 3 tema evaluasi + catatan guru panjang + konsultasi. Periksa gambarnya: tak ada blok yang terpotong.
- [ ] **Step 6: Gerbang mutu + commit**

```bash
git -c commit.gpgsign=false commit -am "feat(kurikulum): evaluasi kurikulum masuk rapor layar & JPEG"
```

---

## Task 10: Dokumentasi & penutup

- [ ] **Step 1** — `docs/DEVELOPER-KIDZPLAYFUL.md`: bagian baru "🎓 Kurikulum bulanan & evaluasi (0098)" — kohort **per anak tanpa union**, penghitung tersimpan & alasannya, snapshot kalimat, default aman saat migrasi belum jalan.
- [ ] **Step 2** — `docs/DOKUMENTASI-KIDZPLAYFUL.md`: bagian pengguna + daftar migrasi `… → 0098 kurikulum`.
- [ ] **Step 3** — `CLAUDE.md`: satu aturan tetap — *"kohort kurikulum milik ANAK, bukan akun; `statusTema` hanya menerima `bulanAnak`"*.
- [ ] **Step 4** — regenerasi HTML+PDF: `python tools/md2pdf.py <md>` lalu Chrome `--headless=new --no-pdf-header-footer --print-to-pdf`.
- [ ] **Step 5** — commit + push, lalu **ingatkan user menjalankan 0098** bila belum.

---

## Verifikasi akhir (end-to-end)

1. `npx tsc --noEmit` · `npx eslint` · `npm test` · `npm run build` — semua bersih.
2. **Sebelum 0098 dijalankan**: buka Mode Ortu & `/kelas/[id]` → semua tema **terbuka**, tak ada yang terkunci, tak ada galat.
3. **Sesudah 0098**: probe anon baca-saja (tabel & kolom ada; kolom kontrol palsu `42703`), lalu isi 1 tema bulan 1 + 1 tema bulan 2 di admin.
4. Anak trial → 4 tema bulan 1 terbuka, judul bulan 2 terlihat, bulan 3 tak terlihat.
5. Admin aktifkan 1 bulan → penghitung naik → tema bulan 2 terbuka.
6. Centang checklist → **Simpan** → cek `/anak/[id]/laporan` dan `/anak/[id]/rapor/<ym>` memuat blok evaluasi + label penilai; unduh JPEG dan **lihat gambarnya**.
7. Sunting kalimat evaluasi di admin → buka rapor lama → **teksnya tidak berubah**.
8. Kohort dua anak: kakak bulan 3 vs bayi bulan 1 → tema bulan 3 terkunci untuk bayi.
9. Game: aktivitas dengan game → main → keluar → kembali ke aktivitas; aktivitas tanpa game → tak ada tombol.
10. Keamanan (REST sebagai ortu): PATCH evaluasi anak orang lain → gagal; DELETE evaluasi sendiri → gagal; `kembali=https://luar.example` → diabaikan.
