# KidzPlayful — M8: Area Orang Tua (Kelola Anak, Batas & PIN, Bayar, Laporan) — Implementation Plan

> Pola subagent-driven. Murni fitur baru di atas skema yang ada (TANPA migrasi). Acuan: use case "Orang Tua" + spec §8.1/§16. Gaya pakai sistem desain `kp-*`.

**Goal:** Melengkapi halaman setelah login agar sesuai use case Orang Tua: **Kelola Profil Anak** (edit/hapus), **Atur Batas Waktu & PIN**, **Bayar Langganan** (status + instruksi bayar), dan **Lihat Laporan** perkembangan anak.

**Architecture:** Lanjutan Tahap 1. Memakai tabel `anak`/`profiles`/`langganan`/`hasil_main` + RLS yang sudah ada (anak & profiles `FOR ALL` milik sendiri → update/hapus boleh; `hasil_main` baca milik anak sendiri). Server actions baru untuk update/hapus anak, set batas, set PIN. Laporan = agregasi murni teruji-unit. Tanpa migrasi DB.

**Prasyarat:** Tahap 1 + visual fidelity selesai. Komponen `Pewi`, kelas `kp-*` tersedia.

---

## Task 1: Logika murni — laporan anak

**Files:** Create `src/lib/domain/laporan-anak.ts`, `src/lib/domain/__tests__/laporan-anak.test.ts`

- [ ] **Step 1: Test gagal**

```ts
// src/lib/domain/__tests__/laporan-anak.test.ts
import { describe, it, expect } from 'vitest';
import { laporanAnak } from '../laporan-anak';

describe('laporanAnak', () => {
  it('agregasi sesi, bintang, menit, per area', () => {
    const r = laporanAnak([
      { area_skill: 'kognitif', bintang: 3, durasi_detik: 120, selesai: true },
      { area_skill: 'kognitif', bintang: 2, durasi_detik: 60, selesai: true },
      { area_skill: 'motorik-halus', bintang: 1, durasi_detik: 30, selesai: true },
    ]);
    expect(r.totalSesi).toBe(3);
    expect(r.totalBintang).toBe(6);
    expect(r.totalMenit).toBe(4); // (120+60+30)/60 = 3.5 -> round 4
    expect(r.perArea['kognitif']).toBe(2);
    expect(r.perArea['motorik-halus']).toBe(1);
  });
  it('aman bila kosong', () => {
    const r = laporanAnak([]);
    expect(r.totalSesi).toBe(0); expect(r.totalBintang).toBe(0); expect(r.totalMenit).toBe(0);
  });
});
```

- [ ] **Step 2: Jalankan → gagal** `npx vitest run src/lib/domain/__tests__/laporan-anak.test.ts`

- [ ] **Step 3: Implementasi**

```ts
// src/lib/domain/laporan-anak.ts
export interface BarisHasil { area_skill: string; bintang: number; durasi_detik: number; selesai: boolean; }
export interface LaporanAnak { totalSesi: number; totalBintang: number; totalMenit: number; perArea: Record<string, number>; }

export function laporanAnak(rows: BarisHasil[]): LaporanAnak {
  const r: LaporanAnak = { totalSesi: rows.length, totalBintang: 0, totalMenit: 0, perArea: {} };
  let detik = 0;
  for (const x of rows) {
    r.totalBintang += x.bintang || 0;
    detik += x.durasi_detik || 0;
    r.perArea[x.area_skill] = (r.perArea[x.area_skill] ?? 0) + 1;
  }
  r.totalMenit = Math.round(detik / 60);
  return r;
}
```

- [ ] **Step 4: Jalankan → lulus** `npx vitest run src/lib/domain/__tests__/laporan-anak.test.ts`

- [ ] **Step 5: Commit** `git add -A && git commit -m "feat(domain): agregasi laporan anak + tests"`

---

## Task 2: Server actions Orang Tua

**Files:** Create `src/lib/data/ortu-actions.ts`

- [ ] **Step 1: Tulis actions**

```ts
// src/lib/data/ortu-actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { umurTahun, modeDefault } from '@/lib/domain/anak';

async function sesi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, userId: user.id };
}

export async function updateAnak(anakId: string, nama: string, tanggalLahir: string) {
  const { supabase } = await sesi();
  if (!nama.trim() || !tanggalLahir) throw new Error('Nama & tanggal lahir wajib.');
  const umur = umurTahun(new Date(tanggalLahir + 'T00:00:00Z'), new Date());
  const { error } = await supabase.from('anak')
    .update({ nama: nama.trim(), tanggal_lahir: tanggalLahir, mode_default: modeDefault(umur) })
    .eq('id', anakId);
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak'); revalidatePath(`/anak/${anakId}`);
}

export async function setBatas(anakId: string, menit: number) {
  const { supabase } = await sesi();
  const { error } = await supabase.from('anak').update({ batas_menit: menit }).eq('id', anakId);
  if (error) throw new Error(error.message);
  revalidatePath(`/anak/${anakId}`);
}

export async function hapusAnak(anakId: string) {
  const { supabase } = await sesi();
  const { error } = await supabase.from('anak').delete().eq('id', anakId);
  if (error) throw new Error(error.message);
  redirect('/pilih-anak');
}

export async function setPin(pin: string) {
  const { supabase, userId } = await sesi();
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN harus 4 angka.');
  const { error } = await supabase.from('profiles').update({ pin_ortu: pin }).eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/pengaturan');
}
```

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit`.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(ortu): server actions updateAnak/setBatas/hapusAnak/setPin"`

---

## Task 3: Kelola Profil Anak (/anak/[anakId])

**Files:** Create `src/app/anak/[anakId]/page.tsx`, `src/app/anak/[anakId]/KelolaAnak.tsx`

- [ ] **Step 1: Form client**

```tsx
// src/app/anak/[anakId]/KelolaAnak.tsx
'use client';
import { useState } from 'react';
import { updateAnak, setBatas, hapusAnak } from '@/lib/data/ortu-actions';

export default function KelolaAnak({ anak }: { anak: { id: string; nama: string; tanggal_lahir: string; batas_menit: number } }) {
  const [nama, setNama] = useState(anak.nama);
  const [tgl, setTgl] = useState(anak.tanggal_lahir);
  const [batas, setBatasState] = useState(anak.batas_menit);
  const [msg, setMsg] = useState('');

  async function simpan() {
    setMsg('');
    try { await updateAnak(anak.id, nama, tgl); await setBatas(anak.id, batas); setMsg('Tersimpan ✓'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); }
  }
  async function hapus() {
    if (!confirm(`Hapus profil ${anak.nama}? Data progres ikut terhapus.`)) return;
    try { await hapusAnak(anak.id); } catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); }
  }

  return (
    <div className="kp-card">
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Nama</label>
      <input className="kp-input" value={nama} onChange={(e) => setNama(e.target.value)} />
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Tanggal lahir</label>
      <input className="kp-input" type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} />
      <label style={{ fontSize: 12, color: 'var(--abu)' }}>Batas waktu main / hari</label>
      <select className="kp-input" value={batas} onChange={(e) => setBatasState(Number(e.target.value))}>
        <option value={15}>15 menit</option><option value={20}>20 menit</option>
        <option value={30}>30 menit</option><option value={45}>45 menit</option>
      </select>
      {msg && <div style={{ fontSize: 13, color: msg.includes('✓') ? '#2e9e63' : '#c0392b', marginBottom: 8 }}>{msg}</div>}
      <button className="kp-btn mint" style={{ width: '100%' }} onClick={simpan}>Simpan</button>
      <button onClick={hapus} style={{ width: '100%', marginTop: 8, background: '#fde8e8', color: '#d35050', border: 'none', borderRadius: 999, padding: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Hapus profil anak</button>
    </div>
  );
}
```

- [ ] **Step 2: Halaman**

```tsx
// src/app/anak/[anakId]/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import KelolaAnak from './KelolaAnak';

export default async function AnakPage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: anak } = await supabase.from('anak').select('id,nama,tanggal_lahir,batas_menit').eq('id', anakId).single();
  if (!anak) redirect('/pilih-anak');

  return (
    <main style={{ maxWidth: 440, margin: '20px auto', padding: 16 }}>
      <Link href="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }}>← kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 14px' }}>🧒 Kelola {anak.nama}</h1>
      <KelolaAnak anak={anak} />
      <p style={{ textAlign: 'center', marginTop: 14 }}>
        <Link href={`/anak/${anak.id}/laporan`} className="kp-btn putih" style={{ display: 'inline-block' }}>📊 Lihat Laporan Perkembangan</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Verifikasi** `npx tsc --noEmit && npm run build`.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat(ortu): Kelola Profil Anak (edit/batas/hapus)"`

---

## Task 4: Laporan Perkembangan Anak (/anak/[anakId]/laporan)

**Files:** Create `src/app/anak/[anakId]/laporan/page.tsx`

- [ ] **Step 1: Halaman**

```tsx
// src/app/anak/[anakId]/laporan/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { laporanAnak, type BarisHasil } from '@/lib/domain/laporan-anak';

const LABEL: Record<string, string> = { 'kognitif': 'Kognitif', 'motorik-halus': 'Motorik Halus', 'sensorik': 'Sensorik', 'kemandirian': 'Kemandirian' };

export default async function LaporanAnakPage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: anak } = await supabase.from('anak').select('nama').eq('id', anakId).single();
  if (!anak) redirect('/pilih-anak');
  const { data: rows } = await supabase.from('hasil_main').select('area_skill,bintang,durasi_detik,selesai').eq('anak_id', anakId);
  const r = laporanAnak((rows ?? []) as unknown as BarisHasil[]);

  const Stat = ({ b, l }: { b: string; l: string }) => (
    <div className="kp-card" style={{ flex: 1, textAlign: 'center', padding: 14 }}><div style={{ fontSize: 22, fontWeight: 800 }}>{b}</div><div style={{ fontSize: 12, color: 'var(--abu)' }}>{l}</div></div>
  );
  const maxArea = Math.max(1, ...Object.values(r.perArea));

  return (
    <main style={{ maxWidth: 440, margin: '20px auto', padding: 16 }}>
      <Link href={`/anak/${anakId}`} style={{ color: 'var(--abu)', fontSize: 13 }}>← kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 14px' }}>📊 Perkembangan {anak.nama}</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <Stat b={String(r.totalSesi)} l="Total main" /><Stat b={`⭐${r.totalBintang}`} l="Bintang" /><Stat b={`${r.totalMenit}m`} l="Total waktu" />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>LATIHAN PER AREA</div>
      {Object.keys(LABEL).map((k) => {
        const n = r.perArea[k] ?? 0;
        return (
          <div key={k} className="kp-card" style={{ padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><b>{LABEL[k]}</b><span style={{ color: 'var(--abu)' }}>{n}x</span></div>
            <div style={{ height: 10, background: '#eee', borderRadius: 99, marginTop: 6, overflow: 'hidden' }}><div style={{ height: '100%', width: `${(n / maxArea) * 100}%`, background: 'var(--mint-d)' }} /></div>
          </div>
        );
      })}
      {r.totalSesi === 0 && <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada data — ajak {anak.nama} main dulu ya.</p>}
    </main>
  );
}
```

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit && npm run build`.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(ortu): Laporan Perkembangan anak (per area skill)"`

---

## Task 5: Pengaturan — PIN + Bayar Langganan (/pengaturan)

**Files:** Create `src/app/pengaturan/page.tsx`, `src/app/pengaturan/PinForm.tsx`

> Detail bayar (rekening/QRIS/WA) di konstanta `BAYAR` — GANTI dengan milik owner.

- [ ] **Step 1: PinForm (client)**

```tsx
// src/app/pengaturan/PinForm.tsx
'use client';
import { useState } from 'react';
import { setPin } from '@/lib/data/ortu-actions';

export default function PinForm({ sudahAda }: { sudahAda: boolean }) {
  const [pin, setPinVal] = useState('');
  const [msg, setMsg] = useState('');
  async function simpan() {
    setMsg('');
    try { await setPin(pin); setMsg('PIN tersimpan ✓'); setPinVal(''); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal'); }
  }
  return (
    <div className="kp-card">
      <p style={{ fontSize: 13, color: 'var(--abu)', marginBottom: 8 }}>{sudahAda ? 'PIN sudah diatur. Masukkan PIN baru untuk mengganti.' : 'Buat PIN 4 angka untuk Gerbang Orang Tua.'}</p>
      <input className="kp-input" inputMode="numeric" maxLength={4} placeholder="4 angka" value={pin} onChange={(e) => setPinVal(e.target.value.replace(/\D/g, ''))} />
      {msg && <div style={{ fontSize: 13, color: msg.includes('✓') ? '#2e9e63' : '#c0392b', marginBottom: 8 }}>{msg}</div>}
      <button className="kp-btn mint" style={{ width: '100%' }} onClick={simpan}>Simpan PIN</button>
    </div>
  );
}
```

- [ ] **Step 2: Halaman Pengaturan (PIN + Langganan/Bayar)**

```tsx
// src/app/pengaturan/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan } from '@/lib/domain/trial';
import PinForm from './PinForm';

const BAYAR = {
  bank: 'BCA 1234567890 a.n. KidzPlayful',   // GANTI dgn rekening Anda
  qris: '',                                   // (opsional) URL gambar QRIS
  wa: '6281234567890',                        // GANTI dgn nomor WhatsApp Anda
  harga: 'Rp 35.000 / bulan',
};

export default async function Pengaturan() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: prof } = await supabase.from('profiles').select('pin_ortu').single();
  const { data: lang } = await supabase.from('langganan').select('trial_mulai,aktif_sampai').single();
  const status = lang ? statusLangganan({ trialMulai: new Date(lang.trial_mulai + 'T00:00:00Z'), aktifSampai: lang.aktif_sampai ? new Date(lang.aktif_sampai + 'T00:00:00Z') : null }, new Date()) : 'kadaluarsa';
  const waText = encodeURIComponent('Halo, saya sudah transfer untuk langganan KidzPlayful. Email: ' + (user.email ?? ''));

  return (
    <main style={{ maxWidth: 440, margin: '20px auto', padding: 16 }}>
      <Link href="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }}>← kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 14px' }}>⚙️ Pengaturan</h1>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>PIN ORANG TUA</div>
      <PinForm sudahAda={!!prof?.pin_ortu} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '16px 0 8px' }}>LANGGANAN</div>
      <div className="kp-card">
        <p>Status: <b>{status}</b></p>
        {status !== 'aktif' && (
          <>
            <p style={{ fontSize: 14, marginTop: 8 }}>Langganan {BAYAR.harga}. Untuk berlangganan:</p>
            <ol style={{ fontSize: 14, margin: '8px 0 8px 18px', lineHeight: 1.7 }}>
              <li>Transfer ke <b>{BAYAR.bank}</b></li>
              {BAYAR.qris && <li>atau scan QRIS</li>}
              <li>Konfirmasi via WhatsApp, akun diaktifkan &lt; 1×24 jam.</li>
            </ol>
            {BAYAR.qris && <img src={BAYAR.qris} alt="QRIS" style={{ width: 180, margin: '6px 0' }} />}
            <a className="kp-btn mint" style={{ display: 'inline-block' }} href={`https://wa.me/${BAYAR.wa}?text=${waText}`} target="_blank">Konfirmasi via WhatsApp</a>
          </>
        )}
        {status === 'aktif' && <p style={{ color: '#2e9e63' }}>Langganan aktif. Terima kasih! 🎉</p>}
      </div>
    </main>
  );
}
```

> Jika `BAYAR.qris` kosong dan lint `@next/next/no-img-element` menggagalkan, bungkus `<img>` dengan komentar disable atau hapus blok img (karena kosong, blok img tidak render — namun tetap perlu disable jika lint statis menandainya).

- [ ] **Step 3: Verifikasi** `npx tsc --noEmit && npx eslint src/app/pengaturan 2>&1 | tail -10 && npm run build`.

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat(ortu): Pengaturan PIN + Bayar Langganan (instruksi + WA)"`

---

## Task 6: Tautan di pilih-anak

**Files:** Modify `src/app/pilih-anak/page.tsx`

- [ ] **Step 1: Tambah tautan** — per kartu anak: tautan "⚙️ Kelola" ke `/anak/<id>` (di samping "Pilih game"). Di area atas/bawah halaman: tautan "⚙️ Pengaturan & Langganan" ke `/pengaturan`. (Pertahankan tautan "Panel Admin" & tombol tambah anak.)

Contoh, di blok kartu anak tambahkan setelah tautan Pilih game:
```tsx
          <a href={`/anak/${a.id}`} style={{ display: 'inline-block', marginTop: 8, marginLeft: 12, fontSize: 12, color: 'var(--biru-d)' }}>⚙️ Kelola</a>
```
Dan dekat tautan Panel Admin tambahkan:
```tsx
      <p style={{ textAlign: 'center', marginTop: 6 }}><a href="/pengaturan" style={{ color: 'var(--abu)', fontSize: 13 }}>⚙️ Pengaturan & Langganan</a></p>
```

- [ ] **Step 2: Verifikasi** `npx tsc --noEmit && npm run build`.

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(ortu): tautan Kelola anak & Pengaturan di pilih-anak"`

---

## Task 7: Verifikasi akhir + deploy

- [ ] **Step 1:** `npm test` → 30 (28 + laporan-anak 2). `npm run build` → sukses.
- [ ] **Step 2: Smoke** `npm run dev`: login → pilih-anak → "Kelola" anak (ubah nama/batas, simpan) → "Lihat Laporan" → Pengaturan (set PIN, lihat instruksi bayar + tombol WA).
- [ ] **Step 3: Push** → auto-deploy → cek live.

---

## Definition of Done
- Use case Orang Tua lengkap di app: **Kelola Profil Anak** (edit/batas/hapus), **Atur Batas & PIN**, **Bayar Langganan** (status + instruksi + WA), **Lihat Laporan** (per area skill).
- RLS aman (hanya data sendiri). Unit test hijau (30). Build sukses. Ter-deploy.

## Catatan
- Detail pembayaran ada di konstanta `BAYAR` (`src/app/pengaturan/page.tsx`) — owner ganti dengan rekening/QRIS/WA asli.
- Aktivasi tetap manual oleh admin (Opsi B) via /admin/langganan; halaman ini sisi ortu (instruksi + konfirmasi).
