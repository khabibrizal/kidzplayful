// src/app/pilih-anak/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan, bolehAkses } from '@/lib/domain/trial';
import { umurTeks } from '@/lib/domain/anak';
import { getPendaftaranSaya } from '@/lib/data/event';
import { getEventTampilCached } from '@/lib/data/publik';
import { getArtikelTerbitCached } from '@/lib/data/artikel';
import EventCarousel from '@/components/EventCarousel';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import RekamAktivitas from '@/components/RekamAktivitas';
import BottomNav from '@/components/BottomNav';
import { tambahAnak } from './actions';
import Pewi from '@/components/ui/Pewi';

export default async function PilihAnakPage({ searchParams }: { searchParams: Promise<{ galat?: string }> }) {
  const { galat } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Admin/super user → dashboard admin; psikolog → area psikolog
  const { data: role } = await supabase.from('profiles').select('is_admin,is_superuser,is_psikolog').eq('id', user.id).single();
  if (role?.is_admin || role?.is_superuser) redirect('/admin');
  if (role?.is_psikolog) redirect('/psikolog');

  // Jalankan paralel (hindari round-trip berurutan ke Supabase)
  const [{ data: anakList }, { data: lang }, { data: prof }, events, pendaftaran, artikel, { count: jumlahAktivitas }] = await Promise.all([
    supabase.from('anak').select('id,nama,tanggal_lahir,mode_default,jenis_kelamin').order('created_at'),
    supabase.from('langganan').select('trial_mulai,aktif_sampai').eq('ortu_id', user.id).single(),
    supabase.from('profiles').select('nama_tampilan').eq('id', user.id).single(),
    getEventTampilCached(),
    getPendaftaranSaya(user.id),
    getArtikelTerbitCached().then((a) => a.slice(0, 3)),
    supabase.from('hasil_main').select('id, anak!inner(ortu_id)', { count: 'exact', head: true }).eq('anak.ortu_id', user.id),
  ]);
  const statusEvent = pendaftaran.statusMap;
  const peserta = pendaftaran.pesertaMap;
  const jumlahAnak = (anakList ?? []).length;
  const anak0 = (anakList ?? [])[0];
  const gameHref = anak0 ? (anak0.mode_default === 'ortu' ? `/pilih-game/${anak0.id}` : `/main/${anak0.id}`) : null;
  // batas tanggal lahir: maksimal kemarin (WIB) — tidak boleh hari ini/masa depan
  const maksTgl = new Date(Date.now() + 7 * 3600 * 1000 - 86400000).toISOString().slice(0, 10);
  const sisaMap: Record<string, number> = {};
  for (const ev of events) sisaMap[ev.id] = jumlahAnak - (peserta[ev.id]?.filter((p) => p.status !== 'ditolak').length ?? 0);

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
    <main className="kp-page" style={{ padding: 16, paddingBottom: 90, marginTop: 30 }}>
      <RekamAktivitas fitur="beranda" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Pewi size={64} />
        <h1 style={{ color: 'var(--lavender-d)', fontSize: 24 }}>Hai Kak {prof?.nama_tampilan || 'Kakak'} 👋</h1>
      </div>
      <p style={{ color: 'var(--abu)', marginBottom: 16 }}>
        Status langganan: <b>{status}</b>
        {!bolehAkses(status) && ' — perpanjang untuk membuka materi & game khusus pelanggan.'}
      </p>

      {/* Guard halaman anak memantulkan ke sini; dulu tanpa pesan sama sekali sehingga
          klik pada kartu anak terasa seperti tombol rusak. */}
      {galat === 'anak-tidak-ditemukan' && (
        <p style={{ background: '#fdeaea', color: '#b3261e', fontSize: 13, borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
          Profil anak itu tidak ditemukan atau bukan milik akun ini. Pilih salah satu profil di bawah ya.
        </p>
      )}

      <OnboardingChecklist
        adaAnak={jumlahAnak > 0}
        adaAktivitas={(jumlahAktivitas ?? 0) > 0}
        statusAktif={status === 'aktif'}
        gameHref={gameHref}
      />

      <Link href="/favorit" className="kp-btn putih"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        ❤️ Favoritmu
      </Link>

      <EventCarousel events={events} statusMap={statusEvent} sisaMap={sisaMap} pesertaMap={peserta} alasanMap={pendaftaran.alasanMap} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '10px 0' }}>PROFIL ANAK</div>
      <div className="kp-grid-kartu">{(anakList ?? []).map((a) => (
        <div key={a.id} className="kp-card">
          <a href={a.mode_default === 'ortu' ? `/ortu/${a.id}` : `/main/${a.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontSize: 30 }}>{a.jenis_kelamin === 'laki-laki' ? '👦' : a.jenis_kelamin === 'perempuan' ? '👧' : '🧒'}</span>
            <span><b>{a.nama}</b><br /><small style={{ color: 'var(--abu)' }}>{a.tanggal_lahir ? `${umurTeks(new Date(a.tanggal_lahir + 'T00:00:00Z'), new Date())} · ` : ''}mode {a.mode_default}</small></span>
          </a>
          <a href={`/pilih-game/${a.id}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: 'var(--biru-d)' }}>🎯 Pilih game (orang tua)</a>
          <a href={`/anak/${a.id}`} style={{ display: 'inline-block', marginTop: 8, marginLeft: 12, fontSize: 12, color: 'var(--biru-d)' }}>⚙️ Kelola</a>
        </div>
      ))}</div>
      {(anakList ?? []).length === 0 && (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada profil anak. Tambahkan di bawah.</p>
      )}

      {artikel.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>📖 ARTIKEL & TIPS</span>
            <Link href="/artikel" style={{ fontSize: 12, color: 'var(--biru-d)' }}>Lihat semua →</Link>
          </div>
          <div className="kp-grid-kartu">{artikel.map((a) => (
            <Link key={a.slug} href={`/artikel/${a.slug}`} className="kp-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--lavender-d)', fontSize: 14, lineHeight: 1.3 }}>{a.judul}</div>
              {a.ringkasan && <div style={{ fontSize: 12, color: 'var(--abu)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.ringkasan}</div>}
            </Link>
          ))}</div>
        </div>
      )}

      <details id="tambah-anak" className="kp-card" style={{ marginTop: 16, scrollMarginTop: 16 }}>
        <summary className="kp-btn putih" style={{ display: 'inline-block', textAlign: 'center' }}>➕ Tambah data anak</summary>
        <form action={tambahAnak} style={{ marginTop: 12 }}>
          <input className="kp-input" name="nama" placeholder="Nama anak" required />
          <input className="kp-input" name="nama_panggilan" placeholder="Nama panggilan (opsional)" />
          <select className="kp-input" name="jenis_kelamin" defaultValue="" required>
            <option value="" disabled>Jenis kelamin</option>
            <option value="laki-laki">Laki-laki</option>
            <option value="perempuan">Perempuan</option>
          </select>
          <input className="kp-input" name="tanggal_lahir" type="date" max={maksTgl} required />
          <button className="kp-btn mint" type="submit" style={{ width: '100%' }}>Tambah anak</button>
        </form>
      </details>

      <BottomNav />
    </main>
  );
}
