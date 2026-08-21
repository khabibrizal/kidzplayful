// src/app/admin/pengaturan-bayar/page.tsx — master konfigurasi pembayaran (harga langganan + rekening)
import { redirect } from 'next/navigation';
import { getPengaturanBayar } from '@/lib/data/pengaturan-bayar';
import { simpanPengaturanBayar } from '@/lib/data/admin-bisnis';
import s from '../admin.module.css';

export default async function PengaturanBayarPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const cfg = await getPengaturanBayar();

  async function simpan(formData: FormData) {
    'use server';
    await simpanPengaturanBayar(formData);
    redirect('/admin/pengaturan-bayar?ok=1');
  }

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>💰 Pengaturan Pembayaran</h1></div>
      <p className={s.muted}>Harga langganan &amp; rekening tujuan ini dipakai otomatis di halaman Langganan (member) dan pembayaran Toko.</p>
      {ok && <div className={s.card} style={{ background: '#dff5e6', color: '#1c7a43', fontWeight: 700 }}>Tersimpan ✓</div>}

      <form action={simpan} className={s.card}>
        <label className={s.section} style={{ marginTop: 0 }}>Harga langganan (nominal, angka)</label>
        <input className={s.inp} name="harga_nominal" defaultValue={cfg.harga_langganan_nominal} inputMode="numeric" style={{ width: '100%' }} placeholder="35000" />

        <label className={s.section}>Teks harga yang ditampilkan ke member</label>
        <input className={s.inp} name="harga_teks" defaultValue={cfg.harga_langganan_teks} style={{ width: '100%' }} placeholder="Rp 35.000 / bulan" />

        <label className={s.section}>Rekening tujuan (bank + nomor + a.n.)</label>
        <input className={s.inp} name="bank_teks" defaultValue={cfg.bank_teks} style={{ width: '100%' }} placeholder="BCA 1234567890 a.n. KidzPlayful" />

        <label className={s.section}>URL gambar QRIS (opsional)</label>
        <input className={s.inp} name="qris_url" defaultValue={cfg.qris_url} style={{ width: '100%' }} placeholder="https://… (kosongkan bila tidak ada)" />

        <label className={s.section}>WA Admin Umum (langganan &amp; fallback) — mis. 6281234567890</label>
        <input className={s.inp} name="wa_nomor" defaultValue={cfg.wa_nomor} inputMode="numeric" style={{ width: '100%' }} placeholder="6281234567890" />

        <label className={s.section}>WA Admin Event (opsional)</label>
        <input className={s.inp} name="wa_event" defaultValue={cfg.wa_event} inputMode="numeric" style={{ width: '100%' }} placeholder="kosongkan = pakai WA umum" />

        <label className={s.section}>WA Admin Store (opsional)</label>
        <input className={s.inp} name="wa_store" defaultValue={cfg.wa_store} inputMode="numeric" style={{ width: '100%' }} placeholder="kosongkan = pakai WA umum" />

        {/* Konsultasi psikolog (0092). Tarif PER PSIKOLOG diisi di menu Psikolog — nilai di
            sini dipakai bila tarif psikolog itu masih 0. Psikolog tidak mengisi tarifnya. */}
        <label className={s.section}>Tarif konsultasi bawaan (Rp / sesi)</label>
        <input className={s.inp} name="harga_konsultasi" defaultValue={cfg.harga_konsultasi_nominal} inputMode="numeric" style={{ width: '100%' }} placeholder="0" />

        <label className={s.section}>Diskon member untuk konsultasi (%)</label>
        <input className={s.inp} name="diskon_konsultasi" defaultValue={cfg.diskon_konsultasi_langganan_persen} inputMode="numeric" style={{ width: '100%' }} placeholder="100 = member tidak ditagih" />

        <label className={s.section}>WA Admin Konsultasi (opsional)</label>
        <input className={s.inp} name="wa_konsultasi" defaultValue={cfg.wa_konsultasi} inputMode="numeric" style={{ width: '100%' }} placeholder="kosongkan = pakai WA umum" />

        <div style={{ marginTop: 14 }}><button className={s.btn} type="submit">💾 Simpan</button></div>
      </form>
    </div>
  );
}
