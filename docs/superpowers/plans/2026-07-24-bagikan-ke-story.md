# Bagikan ke Story (kartu gambar) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User bisa membagikan konten sebagai kartu gambar Story (1080×1920) ke Instagram Story (share file di HP / unduh di desktop).

**Architecture:** Kartu dibuat via canvas di klien (`lib/story-card.ts`), lalu dibagikan sebagai FILE lewat `navigator.share({files})` atau diunduh. Opsi "📸 Bagikan ke Story" ditambahkan ke menu `ShareButton`, yang direstrukturisasi agar menu selalu terbuka (native URL share jadi item di dalamnya) sehingga opsi Story terjangkau di HP maupun desktop.

**Tech Stack:** Next.js 16 (client component), Canvas 2D, Web Share API (files), Vitest (env node → hanya helper murni diuji).

Spec: `docs/superpowers/specs/2026-07-24-bagikan-ke-story-design.md`. Tanpa migrasi DB.

Konvensi: commit `git -c commit.gpgsign=false ... -m "…"` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Gerbang: `npx tsc --noEmit` + `npm run build`.

## File Structure
- Create `src/lib/story-card.ts` — `bungkusTeks` (murni) + `buatKartuStory` (canvas → Blob).
- Create `src/lib/__tests__/story-card.test.ts` — test `bungkusTeks`.
- Modify `src/components/ShareButton.tsx` — prop `gambar?`, menu selalu terbuka, opsi native + "📸 Bagikan ke Story".
- Modify `src/app/artikel/[slug]/page.tsx` — kirim `gambar={a.sampul_url ?? undefined}`.
- Modify `src/app/main/[anakId]/MenuAnak.tsx` — kirim `gambar={temaTerpilih.tema.sampul ?? undefined}`.
- Modify `src/lib/data/atribusi.ts` — label `story: 'Instagram Story'`.

---

### Task 1: Util kartu Story (`lib/story-card.ts`)

**Files:**
- Create: `src/lib/story-card.ts`
- Test: `src/lib/__tests__/story-card.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/lib/__tests__/story-card.test.ts
import { describe, it, expect } from 'vitest';
import { bungkusTeks } from '../story-card';

describe('bungkusTeks', () => {
  it('kalimat pendek → 1 baris', () => {
    expect(bungkusTeks('Halo dunia', 20)).toEqual(['Halo dunia']);
  });
  it('pecah beberapa baris sesuai batas', () => {
    expect(bungkusTeks('satu dua tiga empat', 9)).toEqual(['satu dua', 'tiga', 'empat']);
  });
  it('kata lebih panjang dari batas tetap satu baris utuh', () => {
    expect(bungkusTeks('superkalifragilistik', 5)).toEqual(['superkalifragilistik']);
  });
  it('string kosong/whitespace → []', () => {
    expect(bungkusTeks('   ', 10)).toEqual([]);
    expect(bungkusTeks('', 10)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test → gagal**

Run: `npx vitest run src/lib/__tests__/story-card.test.ts`
Expected: FAIL — module `../story-card` belum ada.

- [ ] **Step 3: Write `src/lib/story-card.ts`**

```ts
// src/lib/story-card.ts — buat kartu gambar Story (1080x1920) via canvas untuk dibagikan ke IG Story.
'use client';

/** Pecah teks jadi baris berdasar batas karakter (per kata; kata > maks tetap satu baris). Murni & teruji. */
export function bungkusTeks(teks: string, maks: number): string[] {
  const kata = (teks ?? '').trim().split(/\s+/).filter(Boolean);
  if (!kata.length) return [];
  const baris: string[] = [];
  let cur = '';
  for (const w of kata) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maks) cur += ' ' + w;
    else { baris.push(cur); cur = w; }
  }
  if (cur) baris.push(cur);
  return baris;
}

function muatGambar(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('gagal muat gambar'));
    img.src = src;
  });
}

// gambar bulat-sudut area (cover) — dipakai untuk gambar konten
function gambarCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
  const ar = img.width / img.height, arBox = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ar > arBox) { sw = img.height * arBox; sx = (img.width - sw) / 2; }
  else { sh = img.width / arBox; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

export async function buatKartuStory(opts: {
  judul: string; jenisLabel: string; ajakan: string; gambar?: string; urlTeks: string;
}): Promise<Blob> {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas tak didukung');

  // latar gradient brand
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#a892e6'); g.addColorStop(1, '#7cc7f5');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // wordmark brand
  ctx.fillStyle = '#fff';
  ctx.font = '700 64px system-ui, sans-serif';
  ctx.fillText('🎈 KidzPlayful', W / 2, 170);

  // gambar konten (opsional) → kartu putih di tengah atas
  const boxX = 120, boxY = 260, boxW = W - 240, boxH = 760;
  if (opts.gambar) {
    try { gambarCover(ctx, await muatGambar(opts.gambar), boxX, boxY, boxW, boxH, 48); }
    catch { /* CORS/gagal → lewati gambar */ }
  }

  // panel teks bawah (semi transparan)
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, 1120, W, H - 1120);

  // label jenis
  ctx.fillStyle = '#fff8'; ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText(opts.jenisLabel.toUpperCase(), W / 2, 1230);

  // judul (auto-wrap, maks 3 baris)
  ctx.fillStyle = '#fff'; ctx.font = '800 76px system-ui, sans-serif';
  const baris = bungkusTeks(opts.judul, 18).slice(0, 3);
  let y = 1330;
  for (const b of baris) { ctx.fillText(b, W / 2, y); y += 92; }

  // CTA
  ctx.fillStyle = '#fff'; ctx.font = '700 46px system-ui, sans-serif';
  ctx.fillText('✨ ' + opts.ajakan, W / 2, y + 70);

  // url teks
  ctx.fillStyle = '#ffffffcc'; ctx.font = '600 38px system-ui, sans-serif';
  ctx.fillText(opts.urlTeks, W / 2, H - 90);

  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob gagal'))), 'image/png'));
}
```

- [ ] **Step 4: Run test → lulus**

Run: `npx vitest run src/lib/__tests__/story-card.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/story-card.ts src/lib/__tests__/story-card.test.ts
git -c commit.gpgsign=false commit -m "feat(story): util kartu Story (canvas) + bungkusTeks teruji

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: ShareButton — opsi Story + menu selalu terbuka

**Files:**
- Modify: `src/components/ShareButton.tsx`

- [ ] **Step 1: Ganti seluruh isi `src/components/ShareButton.tsx`**

```tsx
// src/components/ShareButton.tsx — tombol Bagikan: menu (native share + Story + sosmed).
'use client';
import { useEffect, useState } from 'react';
import { tautanShare, denganUtm, type ShareTarget } from '@/lib/share';
import { buatKartuStory } from '@/lib/story-card';

const LABEL_JENIS: Record<string, string> = { artikel: 'Artikel', kelas: 'Kelas Bermain', game: 'Game' };

// url boleh relatif ('/coba/tema/x') atau absolut; diselesaikan ke absolut saat diklik.
export default function ShareButton({ url, title, text, jenis, gambar, label = 'Bagikan', kelas = 'kp-btn putih' }: {
  url: string; title: string; text?: string; jenis: 'artikel' | 'kelas' | 'game'; gambar?: string; label?: string; kelas?: string;
}) {
  const [buka, setBuka] = useState(false);
  const [toast, setToast] = useState('');
  const [bisaNative, setBisaNative] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  useEffect(() => { setBisaNative(typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  function absolut(): string {
    if (/^https?:\/\//.test(url)) return url;
    if (typeof window !== 'undefined') return new URL(url, window.location.origin).href;
    return url;
  }
  function urlShare(medium: string): string { return denganUtm(absolut(), { medium, jenis }); }

  async function bagikanNative() {
    try { await navigator.share({ title, text, url: urlShare('native') }); } catch { /* batal */ }
    setBuka(false);
  }

  function bagikanKe(target: ShareTarget) {
    window.open(tautanShare(target, { url: urlShare(target), text: text ?? title }), '_blank', 'noopener,noreferrer');
    setBuka(false);
  }

  async function salin() {
    try { await navigator.clipboard.writeText(urlShare('salin')); flash('Link disalin ✓'); }
    catch { flash('Gagal menyalin'); }
    setBuka(false);
  }

  async function bagikanStory() {
    if (sibuk) return;
    setSibuk(true);
    try {
      const blob = await buatKartuStory({
        judul: title, jenisLabel: LABEL_JENIS[jenis] ?? '', ajakan: 'Coba Gratis di KidzPlayful',
        gambar, urlTeks: absolut().replace(/^https?:\/\//, ''),
      });
      const file = new File([blob], 'kidzplayful-story.png', { type: 'image/png' });
      const teks = `${text ?? title}\n${urlShare('story')}`;
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] }) && typeof navigator.share === 'function') {
        await navigator.share({ files: [file], title, text: teks });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'kidzplayful-story.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        flash('Gambar Story diunduh — posting ke IG Story, lalu tambahkan link sticker ✨');
      }
    } catch { flash('Gagal membuat gambar Story'); }
    finally { setSibuk(false); setBuka(false); }
  }

  const opsi: { t: ShareTarget | 'copy'; label: string }[] = [
    { t: 'whatsapp', label: '🟢 WhatsApp' },
    { t: 'facebook', label: '🔵 Facebook' },
    { t: 'twitter', label: '⬛ X (Twitter)' },
    { t: 'telegram', label: '🔷 Telegram' },
    { t: 'copy', label: '🔗 Salin link' },
  ];
  const itemStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' };

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className={kelas} onClick={() => setBuka((v) => !v)} style={{ display: 'inline-block' }}>🔗 {label}</button>
      {buka && (
        <div role="menu" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: 6, zIndex: 90, minWidth: 190 }}>
          <button type="button" onClick={bagikanStory} disabled={sibuk} style={{ ...itemStyle, fontWeight: 700 }}>{sibuk ? '⏳ Menyiapkan…' : '📸 Bagikan ke Story'}</button>
          {bisaNative && <button type="button" onClick={bagikanNative} style={itemStyle}>📱 Bagikan…</button>}
          {opsi.map((o) => (
            <button key={o.t} type="button" onClick={() => (o.t === 'copy' ? salin() : bagikanKe(o.t))} style={itemStyle}>{o.label}</button>
          ))}
        </div>
      )}
      {toast && <span style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 100, maxWidth: '90vw', textAlign: 'center' }}>{toast}</span>}
    </span>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareButton.tsx
git -c commit.gpgsign=false commit -m "feat(story): opsi Bagikan ke Story + menu selalu terbuka (native reachable)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Kirim `gambar` dari call sites

**Files:**
- Modify: `src/app/artikel/[slug]/page.tsx`
- Modify: `src/app/main/[anakId]/MenuAnak.tsx`

- [ ] **Step 1: Artikel** — tambahkan `gambar` pada ShareButton

Ubah `<ShareButton ... jenis="artikel" label="Bagikan artikel" />` menjadi menyertakan `gambar`:

```tsx
            <ShareButton url={`${BASE}/artikel/${a.slug}`} title={a.judul} text={a.ringkasan || a.judul} jenis="artikel" gambar={a.sampul_url ?? undefined} label="Bagikan artikel" />
```

- [ ] **Step 2: MenuAnak (tema)** — tambahkan `gambar`

Ubah ShareButton tema menjadi:

```tsx
          <ShareButton url={`/coba/tema/${temaTerpilih.tema.id}`} title={temaTerpilih.tema.nama} text={`Main game "${temaTerpilih.tema.nama}" di KidzPlayful`} jenis="game" gambar={temaTerpilih.tema.sampul ?? undefined} label="Bagikan tema" />
```

(KelasIsi tidak diubah — kelas tak punya gambar konten, kartu memakai brand saja.)

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/artikel/[slug]/page.tsx src/app/main/[anakId]/MenuAnak.tsx
git -c commit.gpgsign=false commit -m "feat(story): kirim gambar konten ke ShareButton (artikel & tema)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Label atribusi "Instagram Story"

**Files:**
- Modify: `src/lib/data/atribusi.ts`

- [ ] **Step 1: Tambah label `story` di `LABEL_SALURAN`**

Ubah objek `LABEL_SALURAN` sehingga memuat entri `story`:

```ts
export const LABEL_SALURAN: Record<string, string> = {
  whatsapp: 'WhatsApp', facebook: 'Facebook', twitter: 'X (Twitter)', telegram: 'Telegram', salin: 'Salin link', native: 'HP (share sheet)', story: 'Instagram Story',
};
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/atribusi.ts
git -c commit.gpgsign=false commit -m "feat(story): label saluran 'Instagram Story' di dashboard atribusi

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Gerbang mutu akhir + dokumentasi + push

**Files:**
- Modify: `docs/DEVELOPER-KIDZPLAYFUL.md` (+ regen HTML/PDF)

- [ ] **Step 1: Gerbang mutu penuh**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc exit 0; semua test PASS (termasuk story-card.test.ts); build exit 0.

- [ ] **Step 2: Update DEVELOPER doc**

Di seksi "🔗 Bagikan Konten" tambahkan paragraf "Bagikan ke Story": `lib/story-card.ts` (`buatKartuStory` canvas 1080×1920 + `bungkusTeks`), opsi di `ShareButton` (menu selalu terbuka; HP `navigator.share({files})` → IG Story, desktop unduh PNG), `gambar` dari artikel/tema, atribusi `utm_medium=story` (label "Instagram Story"). Tanpa migrasi. Regen HTML+PDF.

- [ ] **Step 3: Commit & push**

```bash
git add docs/DEVELOPER-KIDZPLAYFUL.md docs/DEVELOPER-KIDZPLAYFUL.html docs/DEVELOPER-KIDZPLAYFUL.pdf
git -c commit.gpgsign=false commit -m "docs: fitur Bagikan ke Story (kartu gambar canvas)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin master
```

---

## Verifikasi end-to-end (manual, setelah deploy)
1. **HP**: buka detail artikel/kelas/tema → 🔗 Bagikan → "📸 Bagikan ke Story" → share sheet muncul membawa gambar 1080×1920 → pilih Instagram → posting ke Story → tambahkan link sticker (URL teaser).
2. **Desktop**: klik "📸 Bagikan ke Story" → file `kidzplayful-story.png` terunduh (toast petunjuk muncul).
3. Kartu memuat: brand, gambar konten (artikel/tema; kelas = kartu brand), judul, "✨ Coba Gratis di KidzPlayful", teks URL.
4. Setelah ada pendaftar dari link story → `/admin/analitik` kartu Atribusi Share menampilkan saluran "Instagram Story".

## Catatan
- Menu kini SELALU terbuka saat tombol diklik (native share jadi item "📱 Bagikan…") agar opsi Story terjangkau di HP.
- Gambar lintas-origin butuh CORS; Supabase storage publik mengirim CORS. Bila gagal → kartu dibuat tanpa gambar (tetap valid).
