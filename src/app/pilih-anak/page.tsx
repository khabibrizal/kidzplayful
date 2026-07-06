// src/app/pilih-anak/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan, bolehAkses } from '@/lib/domain/trial';
import { getStatusPendaftaranSaya, getPesertaPerEvent } from '@/lib/data/event';
import { getEventTampilCached } from '@/lib/data/publik';
import { getArtikelTerbit } from '@/lib/data/artikel';
import EventCarousel from '@/components/EventCarousel';
import BottomNav from '@/components/BottomNav';
import { tambahAnak } from './actions';
import Pewi from '@/components/ui/Pewi';

export default async function PilihAnakPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Jalankan paralel (hindari round-trip berurutan ke Supabase)
  const [{ data: anakList }, { data: lang }, { data: prof }, events, statusEvent, peserta, artikel] = await Promise.all([
    supabase.from('anak').select('id,nama,tanggal_lahir,mode_default,jenis_kelamin').order('created_at'),
    supabase.from('langganan').select('trial_mulai,aktif_sampai').eq('ortu_id', user.id).single(),
    supabase.from('profiles').select('nama_tampilan').eq('id', user.id).single(),
    getEventTampilCached(),
    getStatusPendaftaranSaya(),
    getPesertaPerEvent(),
    getArtikelTerbit({ limit: 3 }),
  ]);
  const jumlahAnak = (anakList ?? []).length;
  const sisaMap: Record<string, number> = {};
  for (const ev of events) sisaMap[ev.id] = jumlahAnak - (peserta[ev.id]?.length ?? 0);

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
    <main style={{ maxWidth: 420, margin: '30px auto', padding: 16, paddingBottom: 90 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Pewi size={64} />
        <h1 style={{ color: 'var(--lavender-d)', fontSize: 24 }}>Hai Kak {prof?.nama_tampilan || 'Kakak'} 👋</h1>
      </div>
      <p style={{ color: 'var(--abu)', marginBottom: 16 }}>
        Status langganan: <b>{status}</b>
        {!bolehAkses(status) && ' — silakan perpanjang untuk lanjut.'}
      </p>

      <Link href="/favorit" className="kp-btn putih"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        ❤️ Favoritmu
      </Link>

      <EventCarousel events={events} statusMap={statusEvent} sisaMap={sisaMap} pesertaMap={peserta} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '10px 0' }}>PROFIL ANAK</div>
      {(anakList ?? []).map((a) => (
        <div key={a.id} className="kp-card" style={{ marginBottom: 10 }}>
          <a href={a.mode_default === 'ortu' ? `/ortu/${a.id}` : `/main/${a.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 30 }}>{a.jenis_kelamin === 'laki-laki' ? '👦' : a.jenis_kelamin === 'perempuan' ? '👧' : '🧒'}</span>
            <span><b>{a.nama}</b><br /><small style={{ color: 'var(--abu)' }}>mode {a.mode_default}</small></span>
          </a>
          <a href={`/pilih-game/${a.id}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: 'var(--biru-d)' }}>🎯 Pilih game (orang tua)</a>
          <a href={`/anak/${a.id}`} style={{ display: 'inline-block', marginTop: 8, marginLeft: 12, fontSize: 12, color: 'var(--biru-d)' }}>⚙️ Kelola</a>
        </div>
      ))}
      {(anakList ?? []).length === 0 && (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada profil anak. Tambahkan di bawah.</p>
      )}

      {artikel.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>📖 ARTIKEL & TIPS</span>
            <Link href="/artikel" style={{ fontSize: 12, color: 'var(--biru-d)' }}>Lihat semua →</Link>
          </div>
          {artikel.map((a) => (
            <Link key={a.slug} href={`/artikel/${a.slug}`} className="kp-card" style={{ display: 'block', marginBottom: 8, textDecoration: 'none', color: 'inherit', padding: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--lavender-d)', fontSize: 14, lineHeight: 1.3 }}>{a.judul}</div>
              {a.ringkasan && <div style={{ fontSize: 12, color: 'var(--abu)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.ringkasan}</div>}
            </Link>
          ))}
        </div>
      )}

      <details className="kp-card" style={{ marginTop: 16 }}>
        <summary className="kp-btn putih" style={{ display: 'inline-block', textAlign: 'center' }}>➕ Tambah data anak</summary>
        <form action={tambahAnak} style={{ marginTop: 12 }}>
          <input className="kp-input" name="nama" placeholder="Nama anak" required />
          <select className="kp-input" name="jenis_kelamin" defaultValue="" required>
            <option value="" disabled>Jenis kelamin</option>
            <option value="laki-laki">Laki-laki</option>
            <option value="perempuan">Perempuan</option>
          </select>
          <input className="kp-input" name="tanggal_lahir" type="date" required />
          <button className="kp-btn mint" type="submit" style={{ width: '100%' }}>Tambah anak</button>
        </form>
      </details>

      <BottomNav />
    </main>
  );
}
