# Bagikan Konten ke Sosial Media — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Orang tua bisa membagikan Artikel, Kelas Bermain, dan Game (per tema) ke sosial media; tautan mengarah ke halaman teaser publik yang menarik non-login untuk mendaftar.

**Architecture:** Pendekatan A — rute teaser publik `/coba/kelas/[id]` & `/coba/tema/[id]` (read-only, OG metadata) + komponen `ShareButton` (Web Share API + fallback) yang dipasang di halaman detail. Gating halaman asli tak disentuh; teaser hanya menampilkan metadata ringan.

**Tech Stack:** Next.js 16 App Router (Server Components + generateMetadata), Supabase (RLS + anon client), Vitest.

Spec: `docs/superpowers/specs/2026-07-24-share-konten-sosmed-design.md`.

Konvensi repo: commit `git -c commit.gpgsign=false ... -m "…"` diakhiri `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Gerbang mutu: `npx tsc --noEmit` + `npm run build`. Bahasa Indonesia untuk komentar/teks UI.

## File Structure
- Create `src/lib/share.ts` — util murni pembentuk URL share sosmed (teruji unit).
- Create `src/lib/game/__tests__/share.test.ts` — unit test util (folder __tests__ yang sudah ada dipakai vitest; boleh juga `src/lib/__tests__/`). Pakai `src/lib/__tests__/share.test.ts`.
- Create `src/components/ShareButton.tsx` — tombol share client (native + fallback popover).
- Modify `src/lib/data/publik.ts` — tambah `getKelasPublik(id)` & `getTemaPublik(id)` (anon).
- Create `supabase/migrations/0081_katalog_anon_tema.sql` — policy baca anon `tema` & `paket_aset`.
- Create `src/app/coba/kelas/[id]/page.tsx` — teaser kelas + generateMetadata.
- Create `src/app/coba/tema/[id]/page.tsx` — teaser tema + generateMetadata.
- Create `src/components/TeaserPublik.tsx` — layout teaser bersama (brand + gambar + judul + deskripsi + CTA).
- Modify `src/app/artikel/[slug]/page.tsx` — pasang ShareButton.
- Modify `src/components/KelasIsi.tsx` — prop opsional `bagikanUrl` → ShareButton.
- Modify `src/app/kelas/[id]/page.tsx` — kirim `bagikanUrl={`/coba/kelas/${id}`}` ke KelasIsi.
- Modify `src/app/main/[anakId]/MenuAnak.tsx` — ShareButton tema di layar 'daftar'.

**Catatan penempatan:** spec menyebut PilihGame juga, tetapi `/pilih-game/[anakId]` menampilkan daftar game **datar lintas-tema** (bukan per-tema), sehingga tombol "bagikan tema" tidak cocok di sana. Tema di-share dari layar 'daftar' MenuAnak (konteks satu tema jelas). Ini penyempurnaan UX kecil dari spec.

---

### Task 1: Util URL share (`lib/share.ts`)

**Files:**
- Create: `src/lib/share.ts`
- Test: `src/lib/__tests__/share.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/share.test.ts
import { describe, it, expect } from 'vitest';
import { tautanShare } from '../share';

describe('tautanShare', () => {
  const url = 'https://www.kidzplayful.com/coba/tema/abc';
  const text = 'Cek game seru!';
  it('WhatsApp berisi text lalu url ter-encode', () => {
    const r = tautanShare('whatsapp', { url, text });
    expect(r.startsWith('https://wa.me/?text=')).toBe(true);
    expect(r).toContain(encodeURIComponent(url));
    expect(r).toContain(encodeURIComponent(text));
  });
  it('Facebook hanya url', () => {
    expect(tautanShare('facebook', { url })).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  });
  it('X/Twitter url + text', () => {
    const r = tautanShare('twitter', { url, text });
    expect(r).toContain(`url=${encodeURIComponent(url)}`);
    expect(r).toContain(`text=${encodeURIComponent(text)}`);
  });
  it('Telegram url + text', () => {
    const r = tautanShare('telegram', { url, text });
    expect(r.startsWith('https://t.me/share/url?')).toBe(true);
    expect(r).toContain(encodeURIComponent(url));
  });
  it('text opsional (kosong tetap valid)', () => {
    expect(tautanShare('whatsapp', { url })).toContain(encodeURIComponent(url));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/share.test.ts`
Expected: FAIL — `Cannot find module '../share'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/share.ts — util pembentuk URL berbagi ke sosial media (murni, teruji unit).
export type ShareTarget = 'whatsapp' | 'facebook' | 'twitter' | 'telegram';

export function tautanShare(target: ShareTarget, opts: { url: string; text?: string }): string {
  const u = encodeURIComponent(opts.url);
  const t = encodeURIComponent(opts.text ?? '');
  switch (target) {
    case 'whatsapp': return t ? `https://wa.me/?text=${t}%20${u}` : `https://wa.me/?text=${u}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case 'twitter': return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    case 'telegram': return `https://t.me/share/url?url=${u}&text=${t}`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/share.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/share.ts src/lib/__tests__/share.test.ts
git -c commit.gpgsign=false commit -m "feat(share): util tautanShare + unit test

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Komponen `ShareButton`

**Files:**
- Create: `src/components/ShareButton.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/ShareButton.tsx — tombol Bagikan: Web Share API + fallback menu sosmed.
'use client';
import { useState } from 'react';
import { tautanShare, type ShareTarget } from '@/lib/share';

// url boleh relatif ('/coba/tema/x') atau absolut; diselesaikan ke absolut saat diklik.
export default function ShareButton({ url, title, text, label = 'Bagikan', kelas = 'kp-btn putih' }: {
  url: string; title: string; text?: string; label?: string; kelas?: string;
}) {
  const [buka, setBuka] = useState(false);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2000); }

  function absolut(): string {
    if (/^https?:\/\//.test(url)) return url;
    if (typeof window !== 'undefined') return new URL(url, window.location.origin).href;
    return url;
  }

  async function klik() {
    const u = absolut();
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav && typeof nav.share === 'function') {
      try { await nav.share({ title, text, url: u }); return; }
      catch { /* user batal / tak didukung → buka fallback */ }
    }
    setBuka((v) => !v);
  }

  function bagikanKe(target: ShareTarget) {
    window.open(tautanShare(target, { url: absolut(), text: text ?? title }), '_blank', 'noopener,noreferrer');
    setBuka(false);
  }

  async function salin() {
    try { await navigator.clipboard.writeText(absolut()); flash('Link disalin ✓'); }
    catch { flash('Gagal menyalin'); }
    setBuka(false);
  }

  const opsi: { t: ShareTarget | 'copy'; label: string }[] = [
    { t: 'whatsapp', label: '🟢 WhatsApp' },
    { t: 'facebook', label: '🔵 Facebook' },
    { t: 'twitter', label: '⬛ X (Twitter)' },
    { t: 'telegram', label: '🔷 Telegram' },
    { t: 'copy', label: '🔗 Salin link' },
  ];

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className={kelas} onClick={klik} style={{ display: 'inline-block' }}>🔗 {label}</button>
      {buka && (
        <div role="menu" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: 6, zIndex: 90, minWidth: 170 }}>
          {opsi.map((o) => (
            <button key={o.t} type="button" onClick={() => (o.t === 'copy' ? salin() : bagikanKe(o.t))}
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
      {toast && <span style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 100 }}>{toast}</span>}
    </span>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareButton.tsx
git -c commit.gpgsign=false commit -m "feat(share): komponen ShareButton (native + fallback sosmed)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Migrasi baca anon `tema` & `paket_aset`

**Files:**
- Create: `supabase/migrations/0081_katalog_anon_tema.sql`

- [ ] **Step 1: Write migration**

```sql
-- 0081_katalog_anon_tema.sql — izinkan baca anon katalog tema & paket (untuk halaman teaser publik /coba/*).
drop policy if exists "tema baca anon" on public.tema;
create policy "tema baca anon" on public.tema for select to anon using (status = 'disetujui');

drop policy if exists "paket baca anon" on public.paket_aset;
create policy "paket baca anon" on public.paket_aset for select to anon using (status = 'disetujui');
```

- [ ] **Step 2: Commit** (dijalankan manual oleh user di SQL Editor saat verifikasi)

```bash
git add supabase/migrations/0081_katalog_anon_tema.sql
git -c commit.gpgsign=false commit -m "feat(db): baca anon tema & paket_aset utk teaser publik (0081)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Reader publik `getKelasPublik` & `getTemaPublik`

**Files:**
- Modify: `src/lib/data/publik.ts`

- [ ] **Step 1: Tambah reader di akhir file `publik.ts`**

Tambahkan (di bawah fungsi ekspor terakhir; gunakan `anon` client yang sudah didefinisikan di atas file):

```ts
// —— Teaser publik (halaman /coba/*): metadata ringan, tanpa butir/materi penuh ——
export async function getKelasPublik(id: string): Promise<{ id: string; judul: string; tujuan: string | null; usia_min: number; usia_max: number } | null> {
  const { data } = await anon.from('kelas_bermain')
    .select('id,judul,tujuan,usia_min,usia_max')
    .eq('id', id).eq('status', 'aktif').maybeSingle();
  return (data ?? null) as { id: string; judul: string; tujuan: string | null; usia_min: number; usia_max: number } | null;
}

export async function getTemaPublik(id: string): Promise<{ id: string; nama: string; sampul: string | null; game: string[] } | null> {
  const [{ data: tema }, { data: paket }] = await Promise.all([
    anon.from('tema').select('id,nama,sampul').eq('id', id).eq('status', 'disetujui').maybeSingle(),
    anon.from('paket_aset').select('judul').eq('tema_id', id).eq('status', 'disetujui').order('urutan'),
  ]);
  if (!tema) return null;
  return { id: tema.id as string, nama: tema.nama as string, sampul: (tema.sampul as string) ?? null, game: (paket ?? []).map((p) => p.judul as string) };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/publik.ts
git -c commit.gpgsign=false commit -m "feat(share): reader publik kelas & tema (anon) utk teaser

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Komponen layout teaser bersama

**Files:**
- Create: `src/components/TeaserPublik.tsx`

- [ ] **Step 1: Write component**

```tsx
// src/components/TeaserPublik.tsx — kerangka halaman teaser publik (non-login → CTA daftar).
import Link from 'next/link';
import Logo from '@/components/Logo';
import Sampul from '@/components/Sampul';

export default function TeaserPublik({ label, judul, deskripsi, gambar }: {
  label: string; judul: string; deskripsi: React.ReactNode; gambar?: string | null;
}) {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '18px 20px 60px', textAlign: 'center' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <Link href="/"><Logo height={36} /></Link>
        <Link href="/daftar" className="kp-btn" style={{ padding: '10px 20px', fontSize: 15 }}>Coba Gratis</Link>
      </header>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', letterSpacing: 1 }}>{label}</div>
      {gambar && (
        <div style={{ margin: '12px auto', width: 120, height: 120, borderRadius: 24, overflow: 'hidden', background: '#efe7fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sampul value={gambar} size={120} />
        </div>
      )}
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 26, margin: '10px 0' }}>{judul}</h1>
      <div style={{ color: 'var(--tinta)', fontSize: 15, lineHeight: 1.6 }}>{deskripsi}</div>
      <div className="kp-card" style={{ background: 'linear-gradient(150deg,#e9dcff,#d4ecff)', padding: 24, marginTop: 26 }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Mainkan di KidzPlayful ✨</div>
        <p style={{ color: 'var(--abu)', fontSize: 14, marginBottom: 14 }}>Belajar & bermain untuk anak 0–6 tahun. Coba gratis sekarang.</p>
        <Link href="/daftar" className="kp-btn" style={{ display: 'inline-block', padding: '12px 28px' }}>✨ Coba Gratis di KidzPlayful</Link>
        <p style={{ marginTop: 12, fontSize: 13 }}>Sudah punya akun? <Link href="/login" style={{ color: 'var(--biru-d)', fontWeight: 700 }}>Masuk</Link></p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/TeaserPublik.tsx
git -c commit.gpgsign=false commit -m "feat(share): komponen TeaserPublik (layout teaser + CTA daftar)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Halaman teaser kelas `/coba/kelas/[id]`

**Files:**
- Create: `src/app/coba/kelas/[id]/page.tsx`

- [ ] **Step 1: Write page + generateMetadata**

```tsx
// src/app/coba/kelas/[id]/page.tsx — teaser publik kelas bermain (non-login).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getKelasPublik } from '@/lib/data/publik';
import TeaserPublik from '@/components/TeaserPublik';

const BASE = 'https://www.kidzplayful.com';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const k = await getKelasPublik(id);
  if (!k) return { title: 'Kelas Bermain — KidzPlayful' };
  const desc = k.tujuan || `Aktivitas main bersama untuk anak usia ${k.usia_min}–${k.usia_max} tahun.`;
  const gambar = `${BASE}/opengraph-image`;
  return {
    title: `${k.judul} — Kelas Bermain KidzPlayful`,
    description: desc,
    openGraph: { title: k.judul, description: desc, images: [{ url: gambar }], url: `${BASE}/coba/kelas/${id}`, type: 'website' },
    twitter: { card: 'summary_large_image', title: k.judul, description: desc, images: [gambar] },
  };
}

export default async function TeaserKelas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = await getKelasPublik(id);
  if (!k) notFound();
  return (
    <TeaserPublik
      label="KELAS BERMAIN"
      judul={k.judul}
      deskripsi={<>
        <div>👶 Untuk usia {k.usia_min}–{k.usia_max} tahun</div>
        {k.tujuan && <p style={{ marginTop: 8 }}>🎯 {k.tujuan}</p>}
      </>}
    />
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/coba/kelas/[id]/page.tsx
git -c commit.gpgsign=false commit -m "feat(share): halaman teaser publik /coba/kelas/[id]

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Halaman teaser tema `/coba/tema/[id]`

**Files:**
- Create: `src/app/coba/tema/[id]/page.tsx`

- [ ] **Step 1: Write page + generateMetadata**

```tsx
// src/app/coba/tema/[id]/page.tsx — teaser publik tema game (non-login).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTemaPublik } from '@/lib/data/publik';
import TeaserPublik from '@/components/TeaserPublik';

const BASE = 'https://www.kidzplayful.com';
function isUrl(v?: string | null) { return !!v && /^(https?:\/\/|\/)/.test(v); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTemaPublik(id);
  if (!t) return { title: 'Game Edukasi — KidzPlayful' };
  const desc = t.game.length ? `${t.game.length} permainan seru: ${t.game.slice(0, 5).join(', ')}.` : 'Kumpulan permainan edukatif untuk anak.';
  const gambar = isUrl(t.sampul) ? t.sampul! : `${BASE}/opengraph-image`;
  return {
    title: `${t.nama} — Game Edukasi KidzPlayful`,
    description: desc,
    openGraph: { title: t.nama, description: desc, images: [{ url: gambar }], url: `${BASE}/coba/tema/${id}`, type: 'website' },
    twitter: { card: 'summary_large_image', title: t.nama, description: desc, images: [gambar] },
  };
}

export default async function TeaserTema({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTemaPublik(id);
  if (!t) notFound();
  return (
    <TeaserPublik
      label="GAME EDUKASI"
      judul={t.nama}
      gambar={isUrl(t.sampul) ? t.sampul : null}
      deskripsi={<>
        <div>🎮 {t.game.length} permainan edukatif</div>
        {t.game.length > 0 && <p style={{ marginTop: 8 }}>{t.game.slice(0, 6).join(' · ')}</p>}
      </>}
    />
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/coba/tema/[id]/page.tsx
git -c commit.gpgsign=false commit -m "feat(share): halaman teaser publik /coba/tema/[id]

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Tombol Share di artikel detail

**Files:**
- Modify: `src/app/artikel/[slug]/page.tsx`

- [ ] **Step 1: Tambah import** (di bagian import atas file)

```tsx
import ShareButton from '@/components/ShareButton';
```

- [ ] **Step 2: Pasang ShareButton di dalam `<article>`, setelah `<ArtikelBody isi={a.isi} />`**

Cari baris `<ArtikelBody isi={a.isi} />` dan tambahkan tepat SESUDAHNYA (masih di dalam `</article>` atau setelahnya):

```tsx
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <ShareButton url={`${BASE}/artikel/${a.slug}`} title={a.judul} text={a.ringkasan || a.judul} label="Bagikan artikel" />
          </div>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/artikel/[slug]/page.tsx
git -c commit.gpgsign=false commit -m "feat(share): tombol Bagikan di detail artikel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Tombol Share di detail kelas (via KelasIsi)

**Files:**
- Modify: `src/components/KelasIsi.tsx`
- Modify: `src/app/kelas/[id]/page.tsx`

- [ ] **Step 1: Tambah import + prop `bagikanUrl` di `KelasIsi.tsx`**

Di daftar import `KelasIsi.tsx` tambahkan:

```tsx
import ShareButton from '@/components/ShareButton';
```

Ubah signature komponen menjadi:

```tsx
export default function KelasIsi({ kelas, labelArea = {}, bagikan = true, bagikanUrl }: {
  kelas: KelasBermain; labelArea?: Record<string, string>; bagikan?: boolean; bagikanUrl?: string;
}) {
```

- [ ] **Step 2: Render ShareButton di baris media (`no-print`)**

Cari blok tombol media (`<div className="no-print" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>`) dan di dalamnya, sebelum tombol "Bagikan pengalaman", tambahkan:

```tsx
        {bagikanUrl && <ShareButton url={bagikanUrl} title={kelas.judul} text={`Materi kelas bermain "${kelas.judul}" di KidzPlayful`} label="Bagikan" />}
```

- [ ] **Step 3: Kirim `bagikanUrl` dari `/kelas/[id]/page.tsx`**

Cari pemanggilan `<KelasIsi kelas={kelas} labelArea={labelMaster} />` dan ubah menjadi:

```tsx
      <KelasIsi kelas={kelas} labelArea={labelMaster} bagikanUrl={`/coba/kelas/${kelas.id}`} />
```

(Mode Anak & Mode Ortu tidak mengirim `bagikanUrl`, jadi tombol tak muncul di sana.)

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/KelasIsi.tsx src/app/kelas/[id]/page.tsx
git -c commit.gpgsign=false commit -m "feat(share): tombol Bagikan di detail kelas bermain (→ teaser publik)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Tombol Share tema di MenuAnak (layar daftar)

**Files:**
- Modify: `src/app/main/[anakId]/MenuAnak.tsx`

- [ ] **Step 1: Tambah import**

Di daftar import `MenuAnak.tsx` tambahkan:

```tsx
import ShareButton from '@/components/ShareButton';
```

- [ ] **Step 2: Pasang ShareButton di layar 'daftar'**

Cari blok `if (layar === 'daftar' && temaTerpilih) {` → di dalam `<div className={s.menu}>` setelah `.map(...)` game, atau tepat sebelum `<div className={s.foot}>`, tambahkan:

```tsx
        <div className="no-print" style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
          <ShareButton url={`/coba/tema/${temaTerpilih.tema.id}`} title={temaTerpilih.tema.nama} text={`Main game "${temaTerpilih.tema.nama}" di KidzPlayful`} label="Bagikan tema" />
        </div>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/main/[anakId]/MenuAnak.tsx
git -c commit.gpgsign=false commit -m "feat(share): tombol Bagikan tema di layar daftar game (→ teaser publik)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Gerbang mutu akhir + dokumentasi

**Files:**
- Modify: `docs/DEVELOPER-KIDZPLAYFUL.md` (+ regen HTML/PDF)

- [ ] **Step 1: Jalankan seluruh gerbang mutu**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc exit 0; semua test PASS; build exit 0.

- [ ] **Step 2: Tambah catatan fitur di DEVELOPER doc**

Di `docs/DEVELOPER-KIDZPLAYFUL.md` tambahkan seksi ringkas "Bagikan Konten" (rute `/coba/kelas/[id]` & `/coba/tema/[id]`, komponen `ShareButton`/`TeaserPublik`, util `lib/share.ts`, reader `getKelasPublik`/`getTemaPublik`, migrasi 0081) dan set rentang migrasi ke `0001..0081`. Regen HTML+PDF (pola commit dokumentasi sebelumnya).

- [ ] **Step 3: Commit**

```bash
git add docs/DEVELOPER-KIDZPLAYFUL.md docs/DEVELOPER-KIDZPLAYFUL.html docs/DEVELOPER-KIDZPLAYFUL.pdf
git -c commit.gpgsign=false commit -m "docs: fitur Bagikan Konten (teaser publik + ShareButton, 0081)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 4: Push**

```bash
git push origin master
```

---

## Verifikasi end-to-end (manual, setelah deploy + migrasi 0081)
1. Jalankan `0081_katalog_anon_tema.sql` di Supabase SQL Editor.
2. Incognito (tanpa login): buka `/coba/kelas/<id-kelas-aktif>` dan `/coba/tema/<id-tema-disetujui>` → tampil teaser + CTA "Coba Gratis" ke `/daftar`.
3. Cek preview OG: view-source halaman teaser → ada `og:title`/`og:description`/`og:image`; atau tempel URL di kolom chat WA/Telegram → muncul kartu preview.
4. Login: buka detail artikel/kelas & layar daftar tema → klik Bagikan → di HP muncul share sheet; di desktop muncul menu WA/FB/X/Telegram/Salin.
5. id tak valid → `/coba/kelas/xxx` menampilkan 404.

## Catatan
- Teaser tidak menampilkan butir/soal/langkah/materi penuh → konten berbayar tak bocor.
- Tanpa migrasi 0081, teaser TEMA gagal load untuk non-login (teaser kelas tetap jalan karena policy anon kelas sudah ada sejak 0022).
