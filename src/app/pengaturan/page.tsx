// src/app/pengaturan/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan } from '@/lib/domain/trial';
import { getPengaturanBayar } from '@/lib/data/pengaturan-bayar';
import PinForm from './PinForm';
import AkunForm from './AkunForm';
import NamaForm from './NamaForm';
import ProfilPengirimanForm from './ProfilPengirimanForm';
import FeedbackForm from './FeedbackForm';
import BottomNav from '@/components/BottomNav';
import TombolKembali from '@/components/TombolKembali';

export default async function Pengaturan() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: prof }, { data: lang }, bayar] = await Promise.all([
    supabase.from('profiles').select('pin_ortu,nama_tampilan,no_wa,alamat').eq('id', user.id).single(),
    supabase.from('langganan').select('trial_mulai,aktif_sampai').eq('ortu_id', user.id).single(),
    getPengaturanBayar(),
  ]);
  const status = lang ? statusLangganan({ trialMulai: new Date(lang.trial_mulai + 'T00:00:00Z'), aktifSampai: lang.aktif_sampai ? new Date(lang.aktif_sampai + 'T00:00:00Z') : null }, new Date()) : 'kadaluarsa';
  const waText = encodeURIComponent('Halo, saya sudah transfer untuk langganan KidzPlayful. Email: ' + (user.email ?? ''));

  return (
    <main className="kp-page-narrow" style={{ padding: 16, paddingBottom: 90, marginTop: 20 }}>
      <TombolKembali fallback="/pilih-anak" style={{ color: 'var(--abu)', fontSize: 13 }} />
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 14px' }}>⚙️ Pengaturan</h1>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>AKUN</div>
      <AkunForm email={user.email ?? ''} />
      <NamaForm awal={prof?.nama_tampilan ?? ''} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '16px 0 8px' }}>DATA PENGIRIMAN</div>
      <ProfilPengirimanForm awalNoWa={prof?.no_wa ?? ''} awalAlamat={prof?.alamat ?? ''} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '16px 0 8px' }}>PIN ORANG TUA</div>
      <PinForm sudahAda={!!prof?.pin_ortu} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '16px 0 8px' }}>LANGGANAN</div>
      <div className="kp-card">
        <p>Status: <b>{status}</b></p>
        {status !== 'aktif' && (
          <>
            <p style={{ fontSize: 14, marginTop: 8 }}>Langganan {bayar.harga_langganan_teks}. Untuk berlangganan:</p>
            <ol style={{ fontSize: 14, margin: '8px 0 8px 18px', lineHeight: 1.7 }}>
              <li>Transfer ke <b>{bayar.bank_teks}</b></li>
              {bayar.qris_url && <li>atau scan QRIS</li>}
              <li>Konfirmasi via WhatsApp, akun diaktifkan &lt; 1×24 jam.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {bayar.qris_url && <img src={bayar.qris_url} alt="QRIS" style={{ width: 180, margin: '6px 0' }} />}
            <a className="kp-btn mint" style={{ display: 'inline-block' }} href={`https://wa.me/${bayar.wa_nomor}?text=${waText}`} target="_blank">Konfirmasi via WhatsApp</a>
          </>
        )}
        {status === 'aktif' && <p style={{ color: '#2e9e63' }}>Langganan aktif. Terima kasih! 🎉</p>}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '16px 0 8px' }}>MASUKAN UNTUK APLIKASI</div>
      <FeedbackForm />

      <BottomNav />
    </main>
  );
}
