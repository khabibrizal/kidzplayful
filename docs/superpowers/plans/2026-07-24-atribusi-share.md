# UTM Tracking & Dashboard Atribusi Share — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin tahu berapa PENDAFTAR baru dari share konten, dipecah per saluran (WA/FB/X/Telegram/Salin/native) & per jenis (artikel/kelas/game), lewat kartu di `/admin/analitik`.

**Architecture:** ShareButton menambahkan UTM ke link (`denganUtm`); halaman publik menangkap UTM first-touch ke `localStorage` (`TangkapRef`); `/daftar` menyimpan ref ke 3 kolom baru di `profiles`; `/admin/analitik` mengagregasi. Pendekatan A (konversi-only, first-touch 30 hari).

**Tech Stack:** Next.js 16 App Router, Supabase (RLS), Vitest (env `node` → util inti murni & teruji tanpa DOM).

Spec: `docs/superpowers/specs/2026-07-24-atribusi-share-design.md`.

Konvensi: commit `git -c commit.gpgsign=false ... -m "…"` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Gerbang: `npx tsc --noEmit` + `npm run build`. Bahasa Indonesia untuk UI/komentar.

## File Structure
- Create `supabase/migrations/0082_atribusi_share.sql` — 3 kolom `ref_*` di `profiles` + index.
- Modify `src/lib/share.ts` — tambah `denganUtm(url, {medium, jenis})`.
- Modify `src/lib/__tests__/share.test.ts` — test `denganUtm`.
- Create `src/lib/ref.ts` — `parseRef` (murni) + `bacaRef`/`simpanRefDariUrl`/`hapusRef` (localStorage).
- Create `src/lib/__tests__/ref.test.ts` — test `parseRef`.
- Modify `src/components/ShareButton.tsx` — prop `jenis`, bungkus URL dgn `denganUtm`.
- Modify call sites ShareButton: `src/app/artikel/[slug]/page.tsx` (jenis=artikel), `src/components/KelasIsi.tsx` (jenis=kelas), `src/app/main/[anakId]/MenuAnak.tsx` (jenis=game).
- Create `src/components/TangkapRef.tsx` — tangkap UTM first-touch (client).
- Modify teaser + artikel pages — pasang `<TangkapRef />`.
- Modify `src/app/daftar/page.tsx` — simpan ref ke profiles saat signUp.
- Create `src/lib/data/atribusi.ts` — `getAtribusiShare()`.
- Modify `src/app/admin/analitik/page.tsx` — kartu "🔗 Atribusi Share".

---

### Task 1: Migrasi kolom atribusi di `profiles`

**Files:**
- Create: `supabase/migrations/0082_atribusi_share.sql`

- [ ] **Step 1: Write migration**

```sql
-- 0082_atribusi_share.sql — atribusi pendaftar dari share konten.
alter table public.profiles
  add column if not exists ref_sumber text,   -- 'share' | null (organik)
  add column if not exists ref_saluran text,  -- whatsapp|facebook|twitter|telegram|salin|native
  add column if not exists ref_jenis text;    -- artikel|kelas|game
create index if not exists profiles_ref_sumber_idx on public.profiles(ref_sumber);
```

- [ ] **Step 2: Commit** (SQL dijalankan manual oleh user)

```bash
git add supabase/migrations/0082_atribusi_share.sql
git -c commit.gpgsign=false commit -m "feat(db): kolom atribusi share di profiles (0082)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Util `denganUtm`

**Files:**
- Modify: `src/lib/share.ts`
- Test: `src/lib/__tests__/share.test.ts`

- [ ] **Step 1: Tambah test di akhir `describe`/file `share.test.ts`**

Tambahkan blok berikut (setelah test `tautanShare` yang sudah ada, di dalam file):

```ts
import { denganUtm } from '../share';

describe('denganUtm', () => {
  it('menambah utm ke url tanpa query (pakai ?)', () => {
    const r = denganUtm('https://x.id/coba/tema/1', { medium: 'whatsapp', jenis: 'game' });
    expect(r).toBe('https://x.id/coba/tema/1?utm_source=share&utm_medium=whatsapp&utm_content=game');
  });
  it('menyambung dengan & bila url sudah ada query', () => {
    const r = denganUtm('https://x.id/a?b=1', { medium: 'native', jenis: 'kelas' });
    expect(r).toBe('https://x.id/a?b=1&utm_source=share&utm_medium=native&utm_content=kelas');
  });
  it('meng-encode nilai medium/jenis', () => {
    const r = denganUtm('https://x.id/a', { medium: 'w a', jenis: 'k/e' });
    expect(r).toContain('utm_medium=w%20a');
    expect(r).toContain('utm_content=k%2Fe');
  });
});
```

- [ ] **Step 2: Run test → gagal**

Run: `npx vitest run src/lib/__tests__/share.test.ts`
Expected: FAIL — `denganUtm` belum diekspor.

- [ ] **Step 3: Tambah implementasi di `src/lib/share.ts`** (di bawah `tautanShare`)

```ts
// Tambah parameter UTM share ke sebuah URL (murni). jenis: 'artikel'|'kelas'|'game'.
export function denganUtm(url: string, opts: { medium: string; jenis: string }): string {
  const sep = url.includes('?') ? '&' : '?';
  const q = `utm_source=share&utm_medium=${encodeURIComponent(opts.medium)}&utm_content=${encodeURIComponent(opts.jenis)}`;
  return `${url}${sep}${q}`;
}
```

- [ ] **Step 4: Run test → lulus**

Run: `npx vitest run src/lib/__tests__/share.test.ts`
Expected: PASS (semua test share).

- [ ] **Step 5: Commit**

```bash
git add src/lib/share.ts src/lib/__tests__/share.test.ts
git -c commit.gpgsign=false commit -m "feat(share): util denganUtm + test

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Util ref (`lib/ref.ts`)

**Files:**
- Create: `src/lib/ref.ts`
- Test: `src/lib/__tests__/ref.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/__tests__/ref.test.ts
import { describe, it, expect } from 'vitest';
import { parseRef } from '../ref';

describe('parseRef', () => {
  const now = 1_000_000_000_000;
  it('null bila kosong', () => { expect(parseRef(null, now)).toBeNull(); });
  it('null bila JSON rusak', () => { expect(parseRef('{bukan json', now)).toBeNull(); });
  it('null bila kedaluwarsa (>30 hari)', () => {
    const raw = JSON.stringify({ saluran: 'whatsapp', jenis: 'kelas', ts: now - 31 * 864e5 });
    expect(parseRef(raw, now)).toBeNull();
  });
  it('baca valid (<30 hari)', () => {
    const raw = JSON.stringify({ saluran: 'whatsapp', jenis: 'kelas', ts: now - 5 * 864e5 });
    expect(parseRef(raw, now)).toEqual({ saluran: 'whatsapp', jenis: 'kelas' });
  });
  it('default saluran native bila kosong', () => {
    const raw = JSON.stringify({ jenis: 'game', ts: now });
    expect(parseRef(raw, now)).toEqual({ saluran: 'native', jenis: 'game' });
  });
});
```

- [ ] **Step 2: Run test → gagal**

Run: `npx vitest run src/lib/__tests__/ref.test.ts`
Expected: FAIL — module `../ref` tak ada.

- [ ] **Step 3: Write `src/lib/ref.ts`**

```ts
// src/lib/ref.ts — atribusi first-touch dari share (disimpan di localStorage 'kp_ref').
export interface Ref { saluran: string; jenis: string }
const KUNCI = 'kp_ref';
const MAKS_MS = 30 * 24 * 3600 * 1000; // first-touch berlaku 30 hari

/** Inti murni: parse & validasi raw localStorage. `sekarang` = Date.now(). */
export function parseRef(raw: string | null, sekarang: number): Ref | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { saluran?: unknown; jenis?: unknown; ts?: unknown };
    if (typeof o?.ts !== 'number' || sekarang - o.ts > MAKS_MS) return null;
    return { saluran: String(o.saluran || 'native'), jenis: String(o.jenis || '') };
  } catch { return null; }
}

/** Baca ref valid dari localStorage (client). */
export function bacaRef(): Ref | null {
  if (typeof window === 'undefined') return null;
  return parseRef(window.localStorage.getItem(KUNCI), Date.now());
}

/** First-touch: simpan ref dari query URL bila utm_source=share & belum ada ref valid. */
export function simpanRefDariUrl(sp: URLSearchParams): void {
  if (typeof window === 'undefined') return;
  if (sp.get('utm_source') !== 'share') return;
  if (parseRef(window.localStorage.getItem(KUNCI), Date.now())) return; // sudah ada (first-touch menang)
  const data = { saluran: sp.get('utm_medium') || 'native', jenis: sp.get('utm_content') || '', ts: Date.now() };
  try { window.localStorage.setItem(KUNCI, JSON.stringify(data)); } catch { /* storage penuh/diblokir */ }
}

export function hapusRef(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KUNCI); } catch { /* abaikan */ }
}
```

- [ ] **Step 4: Run test → lulus**

Run: `npx vitest run src/lib/__tests__/ref.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ref.ts src/lib/__tests__/ref.test.ts
git -c commit.gpgsign=false commit -m "feat(atribusi): util ref first-touch (parseRef teruji)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: ShareButton pakai UTM + prop `jenis` (+ perbarui call sites)

**Files:**
- Modify: `src/components/ShareButton.tsx`
- Modify: `src/app/artikel/[slug]/page.tsx`
- Modify: `src/components/KelasIsi.tsx`
- Modify: `src/app/main/[anakId]/MenuAnak.tsx`

- [ ] **Step 1: Ubah `ShareButton.tsx`**

Tambah import di atas:

```tsx
import { tautanShare, denganUtm, type ShareTarget } from '@/lib/share';
```

(hapus import lama `tautanShare` yang terpisah bila ada — jadikan satu baris di atas.)

Ubah signature + tipe props menambah `jenis`:

```tsx
export default function ShareButton({ url, title, text, jenis, label = 'Bagikan', kelas = 'kp-btn putih' }: {
  url: string; title: string; text?: string; jenis: 'artikel' | 'kelas' | 'game'; label?: string; kelas?: string;
}) {
```

Tambahkan helper URL ber-UTM tepat setelah fungsi `absolut()`:

```tsx
  function urlShare(medium: string): string { return denganUtm(absolut(), { medium, jenis }); }
```

Di `klik()` (native share) ubah `url: u` menjadi ber-UTM:

```tsx
    if (nav && typeof nav.share === 'function') {
      try { await nav.share({ title, text, url: urlShare('native') }); return; }
      catch { /* user batal / tak didukung → buka fallback */ }
    }
```

Di `bagikanKe()` ubah pemanggilan `tautanShare`:

```tsx
  function bagikanKe(target: ShareTarget) {
    window.open(tautanShare(target, { url: urlShare(target), text: text ?? title }), '_blank', 'noopener,noreferrer');
    setBuka(false);
  }
```

Di `salin()` ubah teks yang disalin:

```tsx
    try { await navigator.clipboard.writeText(urlShare('salin')); flash('Link disalin ✓'); }
```

- [ ] **Step 2: Perbarui call site artikel** (`src/app/artikel/[slug]/page.tsx`)

Ubah `<ShareButton ... />` menjadi menyertakan `jenis="artikel"`:

```tsx
            <ShareButton url={`${BASE}/artikel/${a.slug}`} title={a.judul} text={a.ringkasan || a.judul} jenis="artikel" label="Bagikan artikel" />
```

- [ ] **Step 3: Perbarui call site kelas** (`src/components/KelasIsi.tsx`)

Ubah baris ShareButton menjadi menyertakan `jenis="kelas"`:

```tsx
        {bagikanUrl && <ShareButton url={bagikanUrl} title={kelas.judul} text={`Materi kelas bermain "${kelas.judul}" di KidzPlayful`} jenis="kelas" label="Bagikan" />}
```

- [ ] **Step 4: Perbarui call site tema** (`src/app/main/[anakId]/MenuAnak.tsx`)

Ubah ShareButton tema menjadi menyertakan `jenis="game"`:

```tsx
          <ShareButton url={`/coba/tema/${temaTerpilih.tema.id}`} title={temaTerpilih.tema.nama} text={`Main game "${temaTerpilih.tema.nama}" di KidzPlayful`} jenis="game" label="Bagikan tema" />
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0 (semua call site sudah kirim `jenis`).

- [ ] **Step 6: Commit**

```bash
git add src/components/ShareButton.tsx src/app/artikel/[slug]/page.tsx src/components/KelasIsi.tsx src/app/main/[anakId]/MenuAnak.tsx
git -c commit.gpgsign=false commit -m "feat(atribusi): ShareButton sisipkan UTM (source/medium/jenis)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Komponen `TangkapRef` + pasang di halaman publik

**Files:**
- Create: `src/components/TangkapRef.tsx`
- Modify: `src/app/coba/kelas/[id]/page.tsx`
- Modify: `src/app/coba/tema/[id]/page.tsx`
- Modify: `src/app/artikel/[slug]/page.tsx`

- [ ] **Step 1: Write `TangkapRef.tsx`**

```tsx
// src/components/TangkapRef.tsx — tangkap UTM share (first-touch) saat pengunjung landing. Render null.
'use client';
import { useEffect } from 'react';
import { simpanRefDariUrl } from '@/lib/ref';

export default function TangkapRef() {
  useEffect(() => {
    try { simpanRefDariUrl(new URLSearchParams(window.location.search)); } catch { /* abaikan */ }
  }, []);
  return null;
}
```

- [ ] **Step 2: Pasang di teaser kelas** (`src/app/coba/kelas/[id]/page.tsx`)

Tambah import: `import TangkapRef from '@/components/TangkapRef';`
Render `<TangkapRef />` sebagai anak pertama sebelum `<TeaserPublik ... />` (bungkus dengan fragment bila perlu):

```tsx
  return (
    <>
      <TangkapRef />
      <TeaserPublik
        label="KELAS BERMAIN"
        judul={k.judul}
        deskripsi={<>
          <div>👶 Untuk usia {k.usia_min}–{k.usia_max} tahun</div>
          {k.tujuan && <p style={{ marginTop: 8 }}>🎯 {k.tujuan}</p>}
        </>}
      />
    </>
  );
```

- [ ] **Step 3: Pasang di teaser tema** (`src/app/coba/tema/[id]/page.tsx`)

Tambah import `TangkapRef`, dan bungkus return dengan fragment berisi `<TangkapRef />` di atas `<TeaserPublik ... />` (pola sama seperti Step 2).

- [ ] **Step 4: Pasang di artikel** (`src/app/artikel/[slug]/page.tsx`)

Tambah import `import TangkapRef from '@/components/TangkapRef';` dan render `<TangkapRef />` tepat setelah pembuka `<>` (sebelum `<script ... jsonLd>`):

```tsx
  return (
    <>
      <TangkapRef />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/TangkapRef.tsx src/app/coba/kelas/[id]/page.tsx src/app/coba/tema/[id]/page.tsx src/app/artikel/[slug]/page.tsx
git -c commit.gpgsign=false commit -m "feat(atribusi): TangkapRef first-touch di halaman publik

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Simpan ref saat daftar

**Files:**
- Modify: `src/app/daftar/page.tsx`

- [ ] **Step 1: Tambah import**

```tsx
import { bacaRef, hapusRef } from '@/lib/ref';
```

- [ ] **Step 2: Sertakan ref pada update profiles**

Ganti blok:

```tsx
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles')
        .update({ nama_tampilan: nama.trim() || null, no_wa: noWa.trim() || null })
        .eq('id', user.id);
    }
```

menjadi:

```tsx
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const ref = bacaRef();
      await supabase.from('profiles')
        .update({
          nama_tampilan: nama.trim() || null,
          no_wa: noWa.trim() || null,
          ...(ref ? { ref_sumber: 'share', ref_saluran: ref.saluran, ref_jenis: ref.jenis } : {}),
        })
        .eq('id', user.id);
      if (ref) hapusRef();
    }
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/daftar/page.tsx
git -c commit.gpgsign=false commit -m "feat(atribusi): simpan ref share ke profiles saat daftar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Reader agregasi + kartu dashboard

**Files:**
- Create: `src/lib/data/atribusi.ts`
- Modify: `src/app/admin/analitik/page.tsx`

- [ ] **Step 1: Write `src/lib/data/atribusi.ts`**

```ts
// src/lib/data/atribusi.ts — agregasi pendaftar dari share (30 hari).
import { createClient } from '@/lib/supabase/server';

export interface AtribusiShare {
  totalShare: number;
  totalOrganik: number;
  perSaluran: Record<string, number>;
  perJenis: Record<string, number>;
}

export async function getAtribusiShare(hari = 30): Promise<AtribusiShare> {
  const db = await createClient();
  const sejak = new Date(Date.now() - hari * 864e5).toISOString();
  const { data } = await db.from('profiles')
    .select('ref_sumber,ref_saluran,ref_jenis,created_at')
    .gte('created_at', sejak);
  const rows = data ?? [];
  let totalShare = 0, totalOrganik = 0;
  const perSaluran: Record<string, number> = {};
  const perJenis: Record<string, number> = {};
  for (const r of rows) {
    if (r.ref_sumber === 'share') {
      totalShare++;
      const sal = (r.ref_saluran as string) || 'native';
      const jen = (r.ref_jenis as string) || 'lainnya';
      perSaluran[sal] = (perSaluran[sal] ?? 0) + 1;
      perJenis[jen] = (perJenis[jen] ?? 0) + 1;
    } else {
      totalOrganik++;
    }
  }
  return { totalShare, totalOrganik, perSaluran, perJenis };
}

export const LABEL_SALURAN: Record<string, string> = {
  whatsapp: 'WhatsApp', facebook: 'Facebook', twitter: 'X (Twitter)', telegram: 'Telegram', salin: 'Salin link', native: 'HP (share sheet)',
};
export const LABEL_JENIS: Record<string, string> = { artikel: 'Artikel', kelas: 'Kelas Bermain', game: 'Game', lainnya: 'Lainnya' };
```

- [ ] **Step 2: Tampilkan di `analitik/page.tsx`**

Tambah import:

```tsx
import { getAtribusiShare, LABEL_SALURAN, LABEL_JENIS } from '@/lib/data/atribusi';
```

Tambahkan pemanggilan reader — di dalam `Promise.all([...])` awal, tambahkan sebagai elemen terakhir dan tangkap namanya. Cara aman: setelah blok `Promise.all` yang ada, tambahkan baris:

```tsx
  const atrib = await getAtribusiShare(30);
```

(letakkan tepat setelah destructuring hasil `Promise.all`, sebelum perhitungan `anakOrtu`.)

Lalu tambahkan kartu — sisipkan sebelum `return (` sudah ada perhitungan; tempatkan JSX ini tepat SETELELAH blok "Aktivitas (30 hari terakhir)" (`</div>` penutup baris kartu aktivitas), di dalam `return`:

```tsx
      <div className={s.section} style={{ marginTop: 16 }}>🔗 Atribusi Share (pendaftar 30 hari)</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <Kartu b={atrib.totalShare} l="Pendaftar dari share" />
        <Kartu b={atrib.totalOrganik} l="Pendaftar organik" />
      </div>
      {atrib.totalShare > 0 && (
        <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <div className={s.card} style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Per saluran</div>
            {Object.entries(atrib.perSaluran).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span>{LABEL_SALURAN[k] ?? k}</span><b>{n}</b></div>
            ))}
          </div>
          <div className={s.card} style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Per jenis konten</div>
            {Object.entries(atrib.perJenis).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span>{LABEL_JENIS[k] ?? k}</span><b>{n}</b></div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/atribusi.ts src/app/admin/analitik/page.tsx
git -c commit.gpgsign=false commit -m "feat(atribusi): kartu Atribusi Share di /admin/analitik

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Gerbang mutu akhir + dokumentasi + push

**Files:**
- Modify: `docs/DEVELOPER-KIDZPLAYFUL.md` (+ regen HTML/PDF)

- [ ] **Step 1: Jalankan gerbang mutu penuh**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc exit 0; semua test PASS (termasuk share.test.ts & ref.test.ts); build exit 0.

- [ ] **Step 2: Update DEVELOPER doc**

Di seksi "🔗 Bagikan Konten" tambahkan paragraf atribusi: UTM via `denganUtm`, `TangkapRef` first-touch → `localStorage kp_ref`, disimpan ke `profiles.ref_sumber/ref_saluran/ref_jenis` (migrasi 0082) saat `/daftar`, kartu "🔗 Atribusi Share" di `/admin/analitik` (`getAtribusiShare`). Set rentang migrasi ke `0001..0082`; tambah baris kamus atau catatan kolom `profiles.ref_*`. Regen HTML+PDF (pola commit dokumentasi sebelumnya).

- [ ] **Step 3: Commit & push**

```bash
git add docs/DEVELOPER-KIDZPLAYFUL.md docs/DEVELOPER-KIDZPLAYFUL.html docs/DEVELOPER-KIDZPLAYFUL.pdf
git -c commit.gpgsign=false commit -m "docs: atribusi share (UTM + dashboard, 0082)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin master
```

---

## Verifikasi end-to-end (manual, setelah deploy + migrasi 0082)
1. Jalankan `0082_atribusi_share.sql` di Supabase SQL Editor.
2. Incognito: buka `/coba/kelas/<id>?utm_source=share&utm_medium=whatsapp&utm_content=kelas` → cek `localStorage.kp_ref` terisi (DevTools).
3. Daftar akun baru dari sesi itu → cek row `profiles` baru: `ref_sumber='share', ref_saluran='whatsapp', ref_jenis='kelas'`.
4. Buka `/admin/analitik` → kartu "🔗 Atribusi Share" bertambah 1 di WhatsApp & Kelas.
5. Daftar tanpa UTM → tercatat sebagai organik (ref_* NULL).

## Catatan
- First-touch: ref pertama menang selama 30 hari; native share → saluran `native` (batas Web Share API).
- `Date.now()` dipakai di util client biasa (bukan workflow script) → aman.
