# KidzPlayful — M9: Kelas Bermain Minggu Ini — Implementation Plan

> Pola subagent-driven. Disetujui di brainstorming. Gaya pakai `kp-*`.

**Goal:** Ganti tile "Main Minggu Ini" (game) di Mode Anak menjadi **"Kelas Bermain Minggu Ini"** — menampilkan **materi/tujuan, bahan, cara/langkah, link referensi** (di-input admin) untuk diterapkan di rumah. Game tetap diakses lewat **Game Edukasi**. Konten = perluasan tabel `panduan` (dipakai Mode Anak + Mode Ortu).

**Architecture:** Lanjutan Tahap 1. Tabel `panduan` (1-1 per tema, sudah ada: bahan/langkah/worksheet_url) ditambah `materi` + `link_ide`. Mode Anak memuat panduan tema "Minggu Ini" dan menampilkannya di layar Kelas Bermain. Admin PanduanForm diperluas. Tanpa AI.

**Prasyarat:** Tahap 1 + Mode Ortu (panduan) selesai. Acuan: brainstorming "Kelas Bermain" + use case.

---

## Task 1: Migrasi — panduan + materi, link_ide

**Files:** Create `supabase/migrations/0009_kelas_bermain.sql`

- [ ] **Step 1:**
```sql
-- supabase/migrations/0009_kelas_bermain.sql
alter table public.panduan add column if not exists materi text;
alter table public.panduan add column if not exists link_ide text;
```
- [ ] **Step 2:** Terapkan (Dashboard SQL Editor / `supabase db push`).
- [ ] **Step 3:** Commit `git add -A && git commit -m "feat(db): panduan + materi & link_ide (kelas bermain)"`

---

## Task 2: Tipe + data Kelas Bermain

**Files:** Modify `src/lib/game/tipe.ts`, `src/lib/data/panduan.ts`

- [ ] **Step 1:** Perluas interface `Panduan` di `tipe.ts` — tambah `materi: string | null;` dan `link_ide: string | null;` (pertahankan `bahan`, `langkah`, `worksheet_url`, `tema_id`).

- [ ] **Step 2:** Di `src/lib/data/panduan.ts`:
  - Pada `getModeOrtu`, ubah select `panduan` menjadi `select('tema_id,materi,bahan,langkah,worksheet_url,link_ide')`.
  - Tambah fungsi baru:
```ts
export async function getKelasBermain(temaId: string): Promise<Panduan | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('panduan').select('tema_id,materi,bahan,langkah,worksheet_url,link_ide')
    .eq('tema_id', temaId).maybeSingle();
  return (data as unknown as Panduan) ?? null;
}
```

- [ ] **Step 3:** `npx tsc --noEmit` → bersih.
- [ ] **Step 4:** Commit `git add -A && git commit -m "feat(data): tipe & getKelasBermain (materi+link)"`

---

## Task 3: Admin — PanduanForm + materi & link

**Files:** Modify `src/lib/data/admin-konten.ts`, `src/app/admin/tema/[id]/PanduanForm.tsx`, `src/app/admin/tema/[id]/page.tsx`

- [ ] **Step 1:** Di `admin-konten.ts` `simpanPanduan`, tambah param `materi` & `linkIde` dan masukkan ke upsert:
```ts
export async function simpanPanduan(input: { temaId: string; materi: string; bahan: string; langkah: string[]; linkIde: string; worksheetUrl: string | null }) {
  const supabase = await db();
  const { error } = await supabase.from('panduan').upsert({
    tema_id: input.temaId,
    materi: input.materi.trim() || null,
    bahan: input.bahan.trim() || null,
    langkah: input.langkah.filter((x) => x.trim()),
    link_ide: input.linkIde.trim() || null,
    worksheet_url: input.worksheetUrl?.trim() || null,
    status: 'disetujui',
  }, { onConflict: 'tema_id' });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tema/${input.temaId}`);
}
```

- [ ] **Step 2:** Di `PanduanForm.tsx`: tambah state `materi` & `linkIde` (init dari `awal`), input **Materi/Tujuan** (textarea) di atas Bahan, dan input **Link/video referensi** sebelum tombol simpan; teruskan ke `simpanPanduan`. Ubah prop `awal` agar memuat `materi`/`link_ide`. Ganti judul section jadi "Kelas Bermain (Mode Anak + Ortu)".

```tsx
// tambahan state
const [materi, setMateri] = useState(awal?.materi ?? '');
const [linkIde, setLinkIde] = useState(awal?.link_ide ?? '');
// di simpan():
await simpanPanduan({ temaId, materi, bahan, langkah, linkIde, worksheetUrl: worksheet });
// markup: textarea materi (className kp-input, rows) + input linkIde (kp-input) — tambahkan.
```
Tipe prop `awal` menjadi: `{ materi: string | null; bahan: string | null; langkah: string[]; worksheet_url: string | null; link_ide: string | null } | null`.

- [ ] **Step 3:** Di `admin/tema/[id]/page.tsx`: ubah query panduan jadi `select('materi,bahan,langkah,worksheet_url,link_ide')` dan teruskan ke `<PanduanForm awal={...}>` (sertakan materi & link_ide).

- [ ] **Step 4:** `npx tsc --noEmit && npm run build`.
- [ ] **Step 5:** Commit `git add -A && git commit -m "feat(admin): PanduanForm materi + link (Kelas Bermain)"`

---

## Task 4: Mode Anak — tile "Kelas Bermain Minggu Ini"

**Files:** Modify `src/app/main/[anakId]/page.tsx`, `src/app/main/[anakId]/MenuAnak.tsx`

- [ ] **Step 1:** Di `main/[anakId]/page.tsx`: setelah dapat `pustaka`, tentukan tema minggu ini & muat kelas bermain:
```ts
import { getKelasBermain } from '@/lib/data/panduan';
// ...
const mi = pustaka.find((t) => t.tema.is_minggu_ini) ?? pustaka[0] ?? null;
const kelas = mi ? await getKelasBermain(mi.tema.id) : null;
```
Teruskan prop `kelas={kelas}` ke `<MenuAnak>`.

- [ ] **Step 2:** Di `MenuAnak.tsx`:
  - Tambah prop `kelas: Panduan | null` (import tipe `Panduan`).
  - Tambah `'kelas'` ke type `Layar`.
  - Ubah tile pertama menu utama: dari "Main Minggu Ini" (→ daftar game) menjadi **"🎈 Kelas Bermain Minggu Ini"** (→ `setLayar('kelas')`).
  - Tambah render layar `kelas`:
```tsx
if (layar === 'kelas') {
  return (
    <div className={s.wrap}>
      <div className={s.top}>
        <button className={s.lock} aria-label="Kembali" onClick={() => setLayar('menu')}>←</button>
        <div className={s.chip}>{mingguIni?.tema.sampul ?? '🎈'} {mingguIni?.tema.nama}</div>
        <div className={s.coin}>🪙 {koin}</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 2px' }}>
        {!kelas && <p style={{ color: 'var(--abu)', textAlign: 'center' }}>Materi kelas bermain minggu ini belum tersedia.</p>}
        {kelas?.materi && <div className="kp-card" style={{ marginBottom: 10 }}><b>🎯 Materi</b><p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{kelas.materi}</p></div>}
        {kelas?.bahan && <div className="kp-card" style={{ marginBottom: 10, background: '#fff3d6' }}><b>🧺 Bahan</b><p style={{ marginTop: 6 }}>{kelas.bahan}</p></div>}
        {(kelas?.langkah ?? []).length > 0 && (
          <div className="kp-card" style={{ marginBottom: 10 }}>
            <b>📝 Cara membuat</b>
            <ol style={{ margin: '8px 0 0 18px', lineHeight: 1.7 }}>{(kelas?.langkah ?? []).map((l, i) => <li key={i}>{l}</li>)}</ol>
          </div>
        )}
        {kelas?.link_ide && <a className="kp-btn" style={{ display: 'inline-block', marginRight: 8 }} href={kelas.link_ide} target="_blank">Lihat ide ▶</a>}
        {kelas?.worksheet_url && <a className="kp-btn putih" style={{ display: 'inline-block' }} href={kelas.worksheet_url} target="_blank">📄 Worksheet</a>}
      </div>
    </div>
  );
}
```
  - Tile pertama di menu utama jadi:
```tsx
<button className={`${s.tile} ${s.tMain}`} onClick={() => setLayar('kelas')}><span>🎈</span><div>Kelas Bermain<br /><small style={{ fontWeight: 600, fontSize: 12 }}>Minggu Ini</small></div></button>
```
  (Catatan: kelas global `kp-tile` vs modul `s.tile` — gunakan yang sudah dipakai komponen ini saat ini agar konsisten.)

- [ ] **Step 3:** `npx tsc --noEmit && npm run build`.
- [ ] **Step 4:** Commit `git add -A && git commit -m "feat(mode-anak): tile Kelas Bermain Minggu Ini (materi/bahan/cara/link)"`

---

## Task 5: Mode Ortu — tampilkan materi + link

**Files:** Modify `src/app/ortu/[anakId]/page.tsx`

- [ ] **Step 1:** Tampilkan `panduan.materi` (di atas bahan) & tombol "Lihat ide" (`panduan.link_ide`) di tiap kartu tema (selain bahan/langkah/worksheet yang sudah ada). `getModeOrtu` kini sudah menyertakan field tsb (Task 2).

- [ ] **Step 2:** `npx tsc --noEmit && npm run build`.
- [ ] **Step 3:** Commit `git add -A && git commit -m "feat(ortu): tampilkan materi + link kelas bermain"`

---

## Task 6: Verifikasi + deploy

- [ ] **Step 1:** `npm test` → 31 hijau (tak ada test baru). `npm run build` → sukses.
- [ ] **Step 2: Smoke** (admin + migrasi 0009): /admin → Tema (minggu ini) → Kelola → isi Materi/Bahan/Langkah/Link di "Kelas Bermain" → Simpan. Mode Anak → tile **Kelas Bermain Minggu Ini** → materi/bahan/cara/link tampil. Game tetap ada di Game Edukasi.
- [ ] **Step 3:** `git push origin master` → auto-deploy → cek live.

---

## Definition of Done
- Tabel `panduan` punya `materi` & `link_ide`.
- Admin mengisi Kelas Bermain (materi/bahan/cara/link/worksheet) per tema.
- Mode Anak tile pertama = **Kelas Bermain Minggu Ini** menampilkan materi+bahan+cara+link (bukan game); game tetap di Game Edukasi.
- Mode Ortu menampilkan materi + link juga.
- Build hijau, 31 test, ter-deploy.

## Catatan
- Fitur #2 (setoran video + penilaian) = spec terpisah, brainstorm berikutnya.
- Deep-link Pilih Game (?paket=) tetap meluncurkan game (tak terdampak).
