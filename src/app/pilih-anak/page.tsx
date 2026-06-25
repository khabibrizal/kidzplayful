// src/app/pilih-anak/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan, bolehAkses } from '@/lib/domain/trial';
import { tambahAnak } from './actions';

export default async function PilihAnakPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: anakList } = await supabase
    .from('anak').select('id,nama,tanggal_lahir,mode_default').order('created_at');
  const { data: lang } = await supabase
    .from('langganan').select('trial_mulai,aktif_sampai').single();

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
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24 }}>Halo, Bunda 👋</h1>
      <p style={{ color: 'var(--abu)', marginBottom: 16 }}>
        Status langganan: <b>{status}</b>
        {!bolehAkses(status) && ' — silakan perpanjang untuk lanjut.'}
      </p>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '10px 0' }}>PROFIL ANAK</div>
      {(anakList ?? []).map((a) => (
        <div key={a.id} className="kp-card" style={{ marginBottom: 10 }}>
          <a href={`/main/${a.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 30 }}>🧒</span>
            <span><b>{a.nama}</b><br /><small style={{ color: 'var(--abu)' }}>mode {a.mode_default}</small></span>
          </a>
          <a href={`/pilih-game/${a.id}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: 'var(--biru-d)' }}>🎯 Pilih game (orang tua)</a>
        </div>
      ))}
      {(anakList ?? []).length === 0 && (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada profil anak. Tambahkan di bawah.</p>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '16px 0 6px' }}>TAMBAH ANAK</div>
      <form action={tambahAnak} className="kp-card">
        <input className="kp-input" name="nama" placeholder="Nama anak" required />
        <input className="kp-input" name="tanggal_lahir" type="date" required />
        <button className="kp-btn" type="submit">Tambah anak</button>
      </form>
    </main>
  );
}
