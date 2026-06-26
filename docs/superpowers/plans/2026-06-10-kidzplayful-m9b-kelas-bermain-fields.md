# KidzPlayful — M9b: Tambah Field Form Kelas Bermain — Implementation Plan

> Pola subagent-driven. Lanjutan M9.

**Goal:** Form Kelas Bermain (`/admin/kelas-bermain/[tema]`) memuat field: **1) Judul · 2) Aktivitas (textarea) · 3) Bahan · 4) Cara membuat (textarea) · 5) Langkah aktivitas** (+ Link referensi & Worksheet PDF tetap dipertahankan). Tampilan Mode Anak & Mode Ortu ikut menampilkan field baru.

**Architecture:** Tambah kolom `judul`, `aktivitas`, `cara_membuat` ke `panduan` (kolom lama `materi` dibiarkan, tak dipakai lagi). Perbarui tipe, server action, form, data select, & render Mode Anak/Ortu. Tanpa AI.

**Prasyarat:** M9 + pemisahan menu Kelas Bermain selesai.

---

## Task 1: Migrasi kolom
**Files:** Create `supabase/migrations/0013_kelas_bermain_fields.sql`
```sql
-- supabase/migrations/0013_kelas_bermain_fields.sql
alter table public.panduan add column if not exists judul text;
alter table public.panduan add column if not exists aktivitas text;
alter table public.panduan add column if not exists cara_membuat text;
```
- [ ] Terapkan di SQL Editor. Commit.

---

## Task 2: Tipe + data
**Files:** `src/lib/game/tipe.ts`, `src/lib/data/panduan.ts`
- [ ] Ubah interface `Panduan` menjadi:
```ts
export interface Panduan {
  tema_id: string;
  judul: string | null;
  aktivitas: string | null;
  bahan: string | null;
  cara_membuat: string | null;
  langkah: string[];
  link_ide: string | null;
  worksheet_url: string | null;
}
```
- [ ] Di `panduan.ts`: kedua select (`getModeOrtu`, `getKelasBermain`) jadi `select('tema_id,judul,aktivitas,bahan,cara_membuat,langkah,worksheet_url,link_ide')`.
- [ ] `npx tsc --noEmit`. Commit.

---

## Task 3: Server action simpanPanduan
**Files:** `src/lib/data/admin-konten.ts`
- [ ] Ganti `simpanPanduan` jadi menerima & menyimpan field baru:
```ts
export async function simpanPanduan(input: { temaId: string; judul: string; aktivitas: string; bahan: string; caraMembuat: string; langkah: string[]; linkIde: string; worksheetUrl: string | null }) {
  const supabase = await db();
  const { error } = await supabase.from('panduan').upsert({
    tema_id: input.temaId,
    judul: input.judul.trim() || null,
    aktivitas: input.aktivitas.trim() || null,
    bahan: input.bahan.trim() || null,
    cara_membuat: input.caraMembuat.trim() || null,
    langkah: input.langkah.filter((x) => x.trim()),
    link_ide: input.linkIde.trim() || null,
    worksheet_url: input.worksheetUrl?.trim() || null,
    status: 'disetujui',
  }, { onConflict: 'tema_id' });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/kelas-bermain/${input.temaId}`);
}
```
- [ ] `npx tsc --noEmit`. Commit.

---

## Task 4: PanduanForm — field baru
**Files:** `src/app/admin/kelas-bermain/PanduanForm.tsx`, `src/app/admin/kelas-bermain/[temaId]/page.tsx`
- [ ] Ubah `PanduanForm` agar urutan field: **Judul** (input), **Aktivitas kelas bermain** (textarea), **Bahan** (input), **Cara membuat** (textarea), **Langkah aktivitas** (daftar, existing), **Link referensi** (input), **Worksheet PDF** (existing). State: `judul`, `aktivitas`, `caraMembuat` (init dari `awal`), kirim semuanya ke `simpanPanduan`. Prop `awal` diperluas: `{ judul, aktivitas, bahan, cara_membuat, langkah, link_ide, worksheet_url } | null`.
- [ ] Di `[temaId]/page.tsx`: select `judul,aktivitas,bahan,cara_membuat,langkah,worksheet_url,link_ide` dan teruskan ke `<PanduanForm awal={...}>`.
- [ ] `npx tsc --noEmit && npm run build`. Commit.

---

## Task 5: Tampilan Mode Anak & Mode Ortu
**Files:** `src/app/main/[anakId]/MenuAnak.tsx` (layar 'kelas'), `src/app/ortu/[anakId]/page.tsx`
- [ ] **MenuAnak layar 'kelas'**: tampilkan urut — **Judul** (sebagai heading/chip), **Aktivitas** (kartu), **Bahan** (kartu), **Cara membuat** (kartu, whitespace-pre-wrap), **Langkah** (ol), lalu **Lihat ide** (link) & **Worksheet**. Ganti pemakaian `kelas.materi` lama dengan `kelas.judul`/`kelas.aktivitas`/`kelas.cara_membuat`.
- [ ] **Mode Ortu**: tampilkan `panduan.judul` (heading kartu) + `aktivitas` + `cara_membuat` selain bahan/langkah/link/worksheet yang sudah ada (ganti pemakaian `materi`).
- [ ] `npx tsc --noEmit && npm run build`. Commit.

---

## Task 6: Verifikasi + deploy
- [ ] `npm test` → 30 hijau. `npm run build` → sukses.
- [ ] `git push origin master` → auto-deploy.
- [ ] (Saya) uji simpan end-to-end sebagai admin via browser otomatis.

## Definition of Done
- Form Kelas Bermain punya Judul + Aktivitas + Bahan + Cara membuat + Langkah (+ Link + Worksheet).
- Simpan berfungsi (admin); tampil benar di Mode Anak & Mode Ortu.
- Build & test hijau, ter-deploy.
