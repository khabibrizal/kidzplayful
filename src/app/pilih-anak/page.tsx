// src/app/pilih-anak/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan, bolehAkses } from '@/lib/domain/trial';
import { getFavoritKelas } from '@/lib/data/favorit';
import { tambahAnak } from './actions';
import Pewi from '@/components/ui/Pewi';

export default async function PilihAnakPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: anakList } = await supabase
    .from('anak').select('id,nama,tanggal_lahir,mode_default').order('created_at');
  const { data: lang } = await supabase
    .from('langganan').select('trial_mulai,aktif_sampai').eq('ortu_id', user.id).single();
  const { data: prof } = await supabase
    .from('profiles').select('nama_tampilan').eq('id', user.id).single();
  const favorit = await getFavoritKelas();

  const status = lang
    ? statusLangganan(
        {
          trialMulai: new Date(lang.trial_mulai + 'T00:00:00Z'),
          aktifSampai: lang.aktif_sampai ? new Date(lang.aktif_sampai + 'T00:00:00Z') : null,
        },
        new Date(),
      )
    : 'kadaluarsa';

  return (
    <main style={{ maxWidth: 420, margin: '30px auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Pewi size={64} />
        <h1 style={{ color: 'var(--lavender-d)', fontSize: 24 }}>Hai Kak {prof?.nama_tampilan || 'Kakak'} 👋</h1>
      </div>
      <p style={{ color: 'var(--abu)', marginBottom: 16 }}>
        Status langganan: <b>{status}</b>
        {!bolehAkses(status) && ' — silakan perpanjang untuk lanjut.'}
      </p>

      {favorit.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '0 0 8px' }}>❤️ KELAS BERMAIN FAVORIT</div>
          {favorit.map((k) => (
            <a key={k.id} href={`/kelas/${k.id}`} className="kp-card"
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: 22 }}>❤️</span>
              <b>{k.judul}</b>
            </a>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '10px 0' }}>PROFIL ANAK</div>
      {(anakList ?? []).map((a) => (
        <div key={a.id} className="kp-card" style={{ marginBottom: 10 }}>
          <a href={a.mode_default === 'ortu' ? `/ortu/${a.id}` : `/main/${a.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 30 }}>🧒</span>
            <span><b>{a.nama}</b><br /><small style={{ color: 'var(--abu)' }}>mode {a.mode_default}</small></span>
          </a>
          <a href={`/pilih-game/${a.id}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: 'var(--biru-d)' }}>🎯 Pilih game (orang tua)</a>
          <a href={`/anak/${a.id}`} style={{ display: 'inline-block', marginTop: 8, marginLeft: 12, fontSize: 12, color: 'var(--biru-d)' }}>⚙️ Kelola</a>
        </div>
      ))}
      {(anakList ?? []).length === 0 && (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada profil anak. Tambahkan di bawah.</p>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '16px 0 6px' }}>TAMBAH ANAK</div>
      <form action={tambahAnak} className="kp-card">
        <input className="kp-input" name="nama" placeholder="Nama anak" required />
        <input className="kp-input" name="tanggal_lahir" type="date" required />
        <button className="kp-btn mint" type="submit" style={{ width: '100%' }}>Tambah anak</button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 6 }}><a href="/pengaturan" style={{ color: 'var(--abu)', fontSize: 13 }}>⚙️ Pengaturan & Langganan</a></p>

      <p style={{ textAlign: 'center', marginTop: 6 }}><Link href="/komunitas" style={{ color: 'var(--biru-d)', fontSize: 13 }}>💬 Komunitas</Link></p>
    </main>
  );
}
