# KidzPlayful — M5: Upload Gambar Worksheet ke Storage — Implementation Plan

> Pola subagent-driven. Langkah pakai checkbox `- [ ]`.

**Goal:** Admin dapat **mengunggah gambar** (dari worksheet) ke Supabase Storage saat membuat Paket Game; engine game menampilkan **gambar ATAU emoji** (campur). Nilai aset di `butir` boleh berupa emoji atau **URL publik** gambar.

**Architecture:** Lanjutan M4. Bucket Storage publik `aset` (baca publik, tulis khusus admin). Komponen `AsetInput` (admin): ketik emoji/teks ATAU upload gambar → menyimpan **URL publik**. Util `isUrlAset` + komponen `<Aset>` membuat engine render `<img>` untuk URL, atau teks/emoji untuk selain itu. PaketForm dirombak agar tiap opsi memakai `AsetInput`.

**Prasyarat:** M1–M4 + Admin Bisnis selesai; akun admin di-set. Acuan: §5.2b (konten dari worksheet), §6/§15.

---

## Task 1: Migrasi Storage bucket + policy

**Files:** Create `supabase/migrations/0007_storage_aset.sql`

- [ ] **Step 1: Tulis migrasi**

```sql
-- supabase/migrations/0007_storage_aset.sql
insert into storage.buckets (id, name, public)
values ('aset', 'aset', true)
on conflict (id) do nothing;

-- baca publik (selain URL publik bawaan bucket public)
create policy "aset baca publik" on storage.objects
  for select using (bucket_id = 'aset');
-- hanya admin yang boleh unggah & hapus
create policy "aset unggah admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'aset' and public.is_admin());
create policy "aset hapus admin" on storage.objects
  for delete to authenticated using (bucket_id = 'aset' and public.is_admin());
```

- [ ] **Step 2: Terapkan** (Dashboard SQL Editor / `supabase db push`).
Expected: bucket `aset` (public) muncul di Storage; 3 policy.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(db): bucket Storage 'aset' + policy admin upload"`

---

## Task 2: Util isUrlAset (+test) & komponen <Aset>

**Files:** Create `src/lib/game/aset.ts`, `src/lib/game/__tests__/aset.test.ts`, `src/components/game/Aset.tsx`

- [ ] **Step 1: Test gagal**

```ts
// src/lib/game/__tests__/aset.test.ts
import { describe, it, expect } from 'vitest';
import { isUrlAset } from '../aset';

describe('isUrlAset', () => {
  it('true utk url http & path', () => {
    expect(isUrlAset('https://x.supabase.co/storage/v1/object/public/aset/a.png')).toBe(true);
    expect(isUrlAset('/aset/a.png')).toBe(true);
  });
  it('false utk emoji/teks', () => {
    expect(isUrlAset('🐱')).toBe(false);
    expect(isUrlAset('kucing')).toBe(false);
  });
});
```

- [ ] **Step 2: Jalankan → gagal** `npx vitest run src/lib/game/__tests__/aset.test.ts`

- [ ] **Step 3: Implementasi util**

```ts
// src/lib/game/aset.ts
export function isUrlAset(v: string): boolean {
  return /^https?:\/\//.test(v) || v.startsWith('/');
}
```

- [ ] **Step 4: Komponen <Aset>**

```tsx
// src/components/game/Aset.tsx
import { isUrlAset } from '@/lib/game/aset';

export default function Aset({ value, size = 56 }: { value: string; size?: number }) {
  if (isUrlAset(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />
    );
  }
  return <span style={{ fontSize: size }}>{value}</span>;
}
```

- [ ] **Step 5: Jalankan → lulus** `npx vitest run src/lib/game/__tests__/aset.test.ts` lalu `npx tsc --noEmit`.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat(game): isUrlAset + komponen Aset (img/emoji) + test"`

---

## Task 3: Engine pakai <Aset>

**Files:** Modify `src/components/game/ManaYa.tsx`, `BeresBeres.tsx`, `CariPasangan.tsx`

- [ ] **Step 1: ManaYa** — import `Aset` dan render pilihan dengan `<Aset value={emo} size={62} />` (ganti `{emo}` di dalam tombol `.opt`).

Cari di ManaYa.tsx:
```tsx
            {emo}
```
Ganti dengan:
```tsx
            <Aset value={emo} size={62} />
```
Tambah import: `import Aset from './Aset';`

- [ ] **Step 2: BeresBeres** — import `Aset`; ganti tampilan benda `{b.emoji}` menjadi `<Aset value={b.emoji} size={46} />` (di dalam div item yang draggable). Wadah emoji boleh tetap emoji (atau pakai Aset juga). Minimal ganti benda.

Cari di BeresBeres.tsx baris yang menampilkan emoji benda di dalam item draggable:
```tsx
            {b.emoji}
```
Ganti:
```tsx
            <Aset value={b.emoji} size={46} />
```
Tambah import `import Aset from './Aset';`

- [ ] **Step 3: CariPasangan** — import `Aset`; ganti `{emo}` di kartu menjadi `<Aset value={emo} size={42} />`.

Cari:
```tsx
              {emo}
```
Ganti:
```tsx
              <Aset value={emo} size={42} />
```
Tambah import `import Aset from './Aset';`

- [ ] **Step 4: Verifikasi** `npx tsc --noEmit && npm run build` → sukses.

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(game): engine render gambar via <Aset>"`

---

## Task 4: Komponen AsetInput (admin: emoji/teks atau upload)

**Files:** Create `src/components/admin/AsetInput.tsx`

- [ ] **Step 1: Tulis komponen**

```tsx
// src/components/admin/AsetInput.tsx
'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isUrlAset } from '@/lib/game/aset';

export default function AsetInput({
  value, onChange, placeholder, width = 130,
}: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [naik, setNaik] = useState(false);
  const [err, setErr] = useState('');

  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setNaik(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `g/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await supabase.storage.from('aset').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('aset').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal unggah');
    } finally {
      setNaik(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f3f3f8', borderRadius: 8, fontSize: 22, overflow: 'hidden' }}>
        {value ? (isUrlAset(value) ? <img src={value} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} /> : value) : '·'}
      </span>
      <input value={isUrlAset(value) ? '' : value} placeholder={placeholder ?? '🐱 / teks'}
        onChange={(e) => onChange(e.target.value)}
        style={{ width, background: '#f3f3f8', border: 'none', borderRadius: 8, padding: 8, fontFamily: 'inherit' }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={naik}
        style={{ border: 'none', cursor: 'pointer', background: '#efe7fb', color: '#9B7FD4', borderRadius: 8, padding: '7px 9px', fontWeight: 700, fontSize: 12 }}>
        {naik ? '...' : '⬆ gambar'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pilihFile} />
      {err && <span style={{ color: '#c0392b', fontSize: 11 }}>{err}</span>}
    </span>
  );
}
```

> Catatan: `// eslint-disable-next-line @next/next/no-img-element` mungkin perlu di atas `<img>` jika lint `@next/next/no-img-element` menggagalkan. Tambahkan bila build/lint meminta.

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit`.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(admin): AsetInput (emoji/teks atau upload gambar)"`

---

## Task 5: PaketForm v2 — pakai AsetInput per opsi

**Files:** Modify (ganti penuh) `src/app/admin/tema/[id]/PaketForm.tsx`

Rombak agar tiap nilai aset memakai `AsetInput`. Struktur state berubah: pengecoh & pasangan jadi array (bukan string spasi).

- [ ] **Step 1: Tulis PaketForm v2**

```tsx
// src/app/admin/tema/[id]/PaketForm.tsx
'use client';
import { useState } from 'react';
import type { Mesin } from '@/lib/game/tipe';
import { buatPaket } from '@/lib/data/admin-konten';
import AsetInput from '@/components/admin/AsetInput';
import s from '../../admin.module.css';

const AREA: Record<Mesin, string> = { 'tekan-sesuai': 'kognitif', 'seret-wadah': 'motorik-halus', 'cari-pasangan': 'kognitif' };

type Soal = { tanya: string; benar: string; pengecoh: string[] };
type Wadah = { kategori: string; label: string; emoji: string };
type Benda = { emoji: string; kategori: string };

export default function PaketForm({ temaId }: { temaId: string }) {
  const [mesin, setMesin] = useState<Mesin>('tekan-sesuai');
  const [judul, setJudul] = useState('Mana Ya?');
  const [err, setErr] = useState('');

  const [soal, setSoal] = useState<Soal[]>([{ tanya: '', benar: '', pengecoh: ['', ''] }]);
  const [wadah, setWadah] = useState<Wadah[]>([{ kategori: '', label: '', emoji: '' }]);
  const [benda, setBenda] = useState<Benda[]>([{ emoji: '', kategori: '' }]);
  const [pasangan, setPasangan] = useState<string[]>(['', '']);

  async function simpan() {
    setErr('');
    let butir: unknown;
    if (mesin === 'tekan-sesuai') {
      butir = { soal: soal.filter((x) => x.tanya && x.benar).map((x) => ({ tanya: x.tanya.trim(), benar: x.benar, salah: x.pengecoh.filter(Boolean) })) };
    } else if (mesin === 'seret-wadah') {
      butir = { wadah: wadah.filter((w) => w.kategori && w.emoji), benda: benda.filter((b) => b.emoji && b.kategori) };
    } else {
      butir = { pasangan: pasangan.filter(Boolean) };
    }
    try {
      await buatPaket({ temaId, mesin, judul, areaSkill: AREA[mesin], usiaMin: 2, usiaMax: 5, butir });
      location.reload();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal menyimpan'); }
  }

  return (
    <div className={s.card}>
      <div className={s.row}>
        <select className={s.inp} value={mesin} onChange={(e) => setMesin(e.target.value as Mesin)}>
          <option value="tekan-sesuai">Mana Ya? (tekan)</option>
          <option value="seret-wadah">Beres-Beres (seret)</option>
          <option value="cari-pasangan">Cari Pasangan (cocok)</option>
        </select>
        <input className={s.inp} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul game" style={{ flex: 1 }} />
      </div>

      {mesin === 'tekan-sesuai' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Tiap soal: pertanyaan (teks), jawaban benar (emoji/gambar), pengecoh (emoji/gambar).</div>
          {soal.map((x, i) => (
            <div key={i} className={s.card} style={{ background: '#faf7ff' }}>
              <input className={s.inp} placeholder="pertanyaan (mis. kucing)" value={x.tanya}
                onChange={(e) => setSoal(soal.map((y, j) => j === i ? { ...y, tanya: e.target.value } : y))} style={{ width: '100%', marginBottom: 6 }} />
              <div className={s.row} style={{ flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#2e9e63', fontWeight: 700 }}>Benar:</span>
                <AsetInput value={x.benar} onChange={(v) => setSoal(soal.map((y, j) => j === i ? { ...y, benar: v } : y))} />
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--abu)', fontWeight: 700 }}>Pengecoh:</span>
                {x.pengecoh.map((p, k) => (
                  <div key={k} style={{ marginTop: 4 }}>
                    <AsetInput value={p} onChange={(v) => setSoal(soal.map((y, j) => j === i ? { ...y, pengecoh: y.pengecoh.map((q, m) => m === k ? v : q) } : y))} />
                  </div>
                ))}
                <button className={s.btnSm} style={{ background: '#eee', marginTop: 4 }} onClick={() => setSoal(soal.map((y, j) => j === i ? { ...y, pengecoh: [...y.pengecoh, ''] } : y))}>+ pengecoh</button>
              </div>
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setSoal([...soal, { tanya: '', benar: '', pengecoh: ['', ''] }])}>+ soal</button>
        </div>
      )}

      {mesin === 'seret-wadah' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Wadah (kategori, label, emoji/gambar) & Benda (emoji/gambar, kategori).</div>
          {wadah.map((w, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <input className={s.inp} placeholder="kategori (buah)" value={w.kategori} onChange={(e) => setWadah(wadah.map((y, j) => j === i ? { ...y, kategori: e.target.value } : y))} />
              <input className={s.inp} placeholder="label (Buah)" value={w.label} onChange={(e) => setWadah(wadah.map((y, j) => j === i ? { ...y, label: e.target.value } : y))} />
              <AsetInput value={w.emoji} onChange={(v) => setWadah(wadah.map((y, j) => j === i ? { ...y, emoji: v } : y))} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setWadah([...wadah, { kategori: '', label: '', emoji: '' }])}>+ wadah</button>
          <div style={{ height: 6 }} />
          {benda.map((b, i) => (
            <div key={i} className={s.row} style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <AsetInput value={b.emoji} onChange={(v) => setBenda(benda.map((y, j) => j === i ? { ...y, emoji: v } : y))} />
              <input className={s.inp} placeholder="kategori (buah)" value={b.kategori} onChange={(e) => setBenda(benda.map((y, j) => j === i ? { ...y, kategori: e.target.value } : y))} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setBenda([...benda, { emoji: '', kategori: '' }])}>+ benda</button>
        </div>
      )}

      {mesin === 'cari-pasangan' && (
        <div style={{ marginTop: 10 }}>
          <div className={s.muted}>Tiap entri jadi sepasang (emoji/gambar). Minimal 2.</div>
          {pasangan.map((p, i) => (
            <div key={i} style={{ marginTop: 6 }}>
              <AsetInput value={p} onChange={(v) => setPasangan(pasangan.map((q, j) => j === i ? v : q))} />
            </div>
          ))}
          <button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)', marginTop: 6 }} onClick={() => setPasangan([...pasangan, ''])}>+ pasangan</button>
        </div>
      )}

      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{err}</div>}
      <button className={s.btn} style={{ marginTop: 10 }} onClick={simpan}>💾 Simpan paket</button>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit && npx eslint src/app/admin src/components 2>&1 | tail -15 && npm run build` → sukses.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(admin): PaketForm v2 pakai AsetInput (emoji/upload gambar)"`

---

## Task 6: Verifikasi akhir

- [ ] **Step 1: Unit** `npm test` → 27 test (26 + isUrlAset 2 → 28? hitung: aset.test 2 → total 28). Laporkan angka sebenarnya.
- [ ] **Step 2: Build** `npm run build` → sukses.
- [ ] **Step 3: Smoke manual** (admin, perlu migrasi 0007 + bucket):
  - /admin → Tema → Kelola → tambah game **Mana Ya?**: pertanyaan "mobil", **Benar** → klik "⬆ gambar" unggah foto worksheet mobil, Pengecoh → unggah 2 gambar lain → Simpan.
  - Jadikan Minggu Ini → Mode Anak → game menampilkan **gambar worksheet** (bukan emoji) & bisa dimainkan.
  - Uji campur: satu opsi emoji, satu opsi gambar → keduanya tampil benar.
- [ ] **Step 4: Commit penutup** bila ada.

---

## Definition of Done
- Bucket Storage `aset` (publik baca, tulis admin) aktif.
- `AsetInput` memungkinkan admin **mengetik emoji/teks ATAU mengunggah gambar** (worksheet) → tersimpan sebagai URL publik di `butir`.
- Engine (Mana Ya?/Beres-Beres/Cari Pasangan) menampilkan **gambar untuk URL, emoji untuk selainnya** (boleh campur).
- Unit test hijau (≥28), build sukses, smoke manual gambar OK.

## Catatan
- Hapus file Storage saat paket dihapus belum ditangani (orphan files) — pembersihan bisa ditambah nanti.
- Audio (suara worksheet) belum diunggah — TTS tetap dipakai di Mana Ya?; upload audio menyusul bila perlu.
- Optimasi gambar (resize) dilakukan manual oleh owner sebelum unggah; kompresi otomatis = peningkatan nanti.
