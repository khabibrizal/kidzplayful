# Gambar Cover Kelas Bermain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kelas bermain punya gambar cover (`sampul_url`) yang tampil di kartu Share IG Story, teaser publik (+OG), dan banner detail materi.

**Architecture:** Tambah kolom `kelas_bermain.sampul_url` (migrasi 0083) + upload cover terkompres di form admin, lalu pakai di ShareButton (prop `gambar`), banner `KelasIsi`, dan teaser `/coba/kelas/[id]` (OG + gambar). Pola identik `sampul_url` artikel/produk. Cover opsional.

**Tech Stack:** Next.js 16, Supabase, `lib/img.ts kompresGambar`, Vitest (tak ada unit baru — perubahan schema/UI).

Spec: `docs/superpowers/specs/2026-07-24-kelas-sampul-cover-design.md`.

Konvensi: commit `git -c commit.gpgsign=false ... -m "…"` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Gerbang: `npx tsc --noEmit` + `npm run build`.

## File Structure
- Create `supabase/migrations/0083_kelas_sampul.sql`.
- Modify `src/lib/game/tipe.ts` (KelasBermain + sampul_url).
- Modify readers/COLS: `src/lib/data/kelas-bermain.ts`, `src/lib/data/publik.ts`, `src/app/kelas/[id]/page.tsx`.
- Modify `src/lib/data/kelas-bermain-actions.ts` (KelasInput + COLS + row).
- Modify `src/app/admin/kelas-bermain/KelasAdmin.tsx` (upload cover).
- Modify `src/components/KelasIsi.tsx` (banner + ShareButton gambar).
- Modify `src/app/coba/kelas/[id]/page.tsx` (OG + TeaserPublik gambar).

---

### Task 1: Migrasi + tipe

**Files:**
- Create: `supabase/migrations/0083_kelas_sampul.sql`
- Modify: `src/lib/game/tipe.ts`

- [ ] **Step 1: Write migration**

```sql
-- 0083_kelas_sampul.sql — gambar cover kelas bermain (untuk share IG Story, teaser, detail).
alter table public.kelas_bermain add column if not exists sampul_url text;
```

- [ ] **Step 2: Tambah field di `KelasBermain` (`tipe.ts`)**

Cari `export interface KelasBermain {` dan tambahkan setelah `judul: string;`:

```ts
  sampul_url?: string | null;  // gambar cover (share Story/teaser/detail)
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0083_kelas_sampul.sql src/lib/game/tipe.ts
git -c commit.gpgsign=false commit -m "feat(kelas): kolom sampul_url (cover) + tipe (0083)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Readers + action mengangkut `sampul_url`

**Files:**
- Modify: `src/lib/data/kelas-bermain.ts`
- Modify: `src/lib/data/publik.ts`
- Modify: `src/app/kelas/[id]/page.tsx`
- Modify: `src/lib/data/kelas-bermain-actions.ts`

- [ ] **Step 1: `kelas-bermain.ts` COLS**

Ganti baris `const COLS = 'id,judul,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';`
menjadi (sisipkan `sampul_url` setelah `judul`):
```ts
const COLS = 'id,judul,sampul_url,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';
```

- [ ] **Step 2: `publik.ts` — K + getKelasPublik**

Ganti `const K = 'id,judul,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';`
menjadi:
```ts
const K = 'id,judul,sampul_url,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';
```

Ubah `getKelasPublik` agar mengangkut `sampul_url`:
```ts
export async function getKelasPublik(id: string): Promise<{ id: string; judul: string; tujuan: string | null; usia_min: number; usia_max: number; sampul_url: string | null } | null> {
  const { data } = await anon.from('kelas_bermain')
    .select('id,judul,tujuan,usia_min,usia_max,sampul_url')
    .eq('id', id).eq('status', 'aktif').maybeSingle();
  return (data ?? null) as { id: string; judul: string; tujuan: string | null; usia_min: number; usia_max: number; sampul_url: string | null } | null;
}
```

- [ ] **Step 3: `kelas/[id]/page.tsx` COLS**

Ganti `const COLS = 'id,judul,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';`
menjadi:
```ts
const COLS = 'id,judul,sampul_url,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status,boleh_trial';
```

- [ ] **Step 4: `kelas-bermain-actions.ts` — KelasInput + COLS + row**

Di `interface KelasInput`, tambahkan setelah `tujuan: string;`:
```ts
  sampulUrl: string;
```

Ganti `const COLS = 'id,judul,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status';`
menjadi:
```ts
const COLS = 'id,judul,sampul_url,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status';
```

Di fungsi `row(i)`, setelah `judul: i.judul.trim() || 'Tanpa judul',` tambahkan:
```ts
    sampul_url: i.sampulUrl.trim() || null,
```

- [ ] **Step 5: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 (KelasInput baru dipakai KelasAdmin di Task 3 — tetapi field wajib `sampulUrl` belum diisi di KelasAdmin → tsc AKAN error di sini bila KelasAdmin belum diupdate). Untuk menjaga urutan, LANJUT ke Task 3 dulu bila muncul error terkait `sampulUrl` di `KelasAdmin.tsx`; jalankan ulang tsc setelah Task 3.

- [ ] **Step 6: Commit** (setelah tsc 0 — boleh digabung setelah Task 3 bila tsc belum 0)

```bash
git add src/lib/data/kelas-bermain.ts src/lib/data/publik.ts src/app/kelas/[id]/page.tsx src/lib/data/kelas-bermain-actions.ts
git -c commit.gpgsign=false commit -m "feat(kelas): angkut sampul_url di reader & action

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Upload cover di form admin

**Files:**
- Modify: `src/app/admin/kelas-bermain/KelasAdmin.tsx`

- [ ] **Step 1: Import kompresGambar**

Tambah setelah import baris 4:
```tsx
import { kompresGambar } from '@/lib/img';
```

- [ ] **Step 2: `KOSONG` + `bukaEdit` sampulUrl**

Di objek `KOSONG`, tambahkan setelah `tujuan: '',`:
```tsx
  sampulUrl: '',
```

Di `bukaEdit`, di objek `setForm({ … })`, tambahkan setelah `judul: k.judul,`:
```tsx
      sampulUrl: k.sampul_url ?? '',
```

- [ ] **Step 3: Ref + handler unggahCover**

Setelah `const fileRef = useRef<HTMLInputElement>(null);` tambahkan:
```tsx
  const coverRef = useRef<HTMLInputElement>(null);
```

Setelah fungsi `unggahPdf` (sebelum `async function simpan` atau di dekat unggahPdf) tambahkan:
```tsx
  async function unggahCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !form) return;
    setLoading(true);
    try {
      const sb = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 1280, kualitas: 0.82 });
      const path = `kelas/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
      if (error) throw error;
      setForm({ ...form, sampulUrl: sb.storage.from('aset').getPublicUrl(path).data.publicUrl });
      flash('Cover terunggah ✓');
    } catch (e2) { flash(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setLoading(false); if (coverRef.current) coverRef.current.value = ''; }
  }
```

- [ ] **Step 4: UI kontrol cover (di bawah input Judul)**

Cari `<input className={s.inp} placeholder="Judul kelas" …/>` dan tambahkan TEPAT SESUDAHNYA:
```tsx
          <div className={s.row} style={{ gap: 8, alignItems: 'center', marginTop: 8 }}>
            <button type="button" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} onClick={() => coverRef.current?.click()} disabled={loading}>{loading ? '...' : '⬆ Gambar Cover'}</button>
            {form.sampulUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.sampulUrl} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                <button type="button" className={s.btnSm} style={{ background: '#eee' }} onClick={() => setForm({ ...form, sampulUrl: '' })}>Hapus</button>
              </>
            )}
            <span className={s.muted} style={{ fontSize: 11 }}>untuk share Story & teaser</span>
            <input ref={coverRef} type="file" accept="image/*" hidden onChange={unggahCover} />
          </div>
```

- [ ] **Step 5: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/kelas-bermain/KelasAdmin.tsx
git -c commit.gpgsign=false commit -m "feat(kelas): upload gambar cover di form admin (kompres 1280/0.82)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

(Bila Task 2 belum di-commit karena menunggu tsc, commit gabungan file Task 2 di sini.)

---

### Task 4: Tampilkan cover (Story + banner detail + teaser OG)

**Files:**
- Modify: `src/components/KelasIsi.tsx`
- Modify: `src/app/coba/kelas/[id]/page.tsx`

- [ ] **Step 1: `KelasIsi` — ShareButton gambar + banner cover**

Pada baris ShareButton kelas, tambahkan prop `gambar`:
```tsx
        {bagikanUrl && <ShareButton url={bagikanUrl} title={kelas.judul} text={`Materi kelas bermain "${kelas.judul}" di KidzPlayful`} jenis="kelas" gambar={kelas.sampul_url ?? undefined} label="Bagikan" />}
```

Tambahkan banner cover di paling atas render — cari `return (` lalu `<>` pembuka, dan sisipkan sebagai anak pertama (sebelum `{adaInfo && (`):
```tsx
      {kelas.sampul_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={kelas.sampul_url} alt="" loading="lazy" decoding="async" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 16, marginBottom: 12, display: 'block' }} />
      )}
```

- [ ] **Step 2: Teaser `/coba/kelas/[id]` — OG + gambar**

Tambahkan helper isUrl di atas komponen (setelah `const BASE = …`):
```tsx
function isUrl(v?: string | null) { return !!v && /^(https?:\/\/|\/)/.test(v); }
```

Di `generateMetadata`, ganti `const gambar = `${BASE}/opengraph-image`;` menjadi:
```tsx
  const gambar = isUrl(k.sampul_url) ? k.sampul_url! : `${BASE}/opengraph-image`;
```

Di komponen `TeaserKelas`, tambahkan prop `gambar` pada `<TeaserPublik>`:
```tsx
      <TeaserPublik
        label="KELAS BERMAIN"
        judul={k.judul}
        gambar={isUrl(k.sampul_url) ? k.sampul_url : null}
        deskripsi={<>
          <div>👶 Untuk usia {k.usia_min}–{k.usia_max} tahun</div>
          {k.tujuan && <p style={{ marginTop: 8 }}>🎯 {k.tujuan}</p>}
        </>}
      />
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc exit 0; build exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/KelasIsi.tsx src/app/coba/kelas/[id]/page.tsx
git -c commit.gpgsign=false commit -m "feat(kelas): tampilkan cover di Story, banner detail & teaser (OG)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Gerbang mutu + dokumentasi + push

**Files:**
- Modify: `docs/DEVELOPER-KIDZPLAYFUL.md` (+ regen HTML/PDF)

- [ ] **Step 1: Gerbang mutu penuh**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc 0; semua test PASS; build 0.

- [ ] **Step 2: Update DEVELOPER doc**

Di seksi "🎈 Kelas Bermain" tambahkan field cover: `kelas_bermain.sampul_url` (migrasi **0083**) — upload di form admin (kompres 1280/0.82), tampil di banner detail (`KelasIsi`), kartu Share Story (prop `gambar`), dan teaser `/coba/kelas/[id]` (gambar + OG). Set rentang migrasi `0001..0083`; tambahkan `sampul_url` pada baris kamus `kelas_bermain`. Regen HTML+PDF.

- [ ] **Step 3: Commit & push**

```bash
git add docs/DEVELOPER-KIDZPLAYFUL.md docs/DEVELOPER-KIDZPLAYFUL.html docs/DEVELOPER-KIDZPLAYFUL.pdf
git -c commit.gpgsign=false commit -m "docs: gambar cover kelas bermain (0083)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin master
```

---

## Verifikasi end-to-end (manual, setelah deploy + migrasi 0083)
1. Jalankan `0083_kelas_sampul.sql` di Supabase SQL Editor.
2. Admin `/admin/kelas-bermain` → Edit/Tambah → ⬆ Gambar Cover → Simpan → cek `sampul_url` terisi (REST `?select=id,sampul_url`).
3. Detail materi kelas (login) → banner cover di atas.
4. `/coba/kelas/[id]` incognito → cover tampil; tempel link ke WA/Telegram → preview OG memakai cover.
5. Share → 📸 Bagikan ke Story → kartu memuat cover.
6. Kelas tanpa cover → semua tetap jalan (brand/OG default/tanpa banner).

## Catatan
- Cover opsional; artikel tidak diubah.
- Upload cover terkompres via `kompresGambar` (1280/0.82) → file kecil.
