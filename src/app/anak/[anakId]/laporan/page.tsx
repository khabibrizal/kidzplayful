// src/app/anak/[anakId]/laporan/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { laporanAnak, type BarisHasil } from '@/lib/domain/laporan-anak';
import { getCatatanAnak } from '@/lib/data/catatan';
import { getSertifikatAnak } from '@/lib/data/sertifikat';
import { getGamifikasiAnak } from '@/lib/data/gamifikasi';
import { formatTanggal } from '@/lib/format';
import CatatanCard from '@/components/CatatanCard';

const LABEL: Record<string, string> = { 'kognitif': 'Kognitif', 'motorik-halus': 'Motorik Halus', 'sensorik': 'Sensorik', 'kemandirian': 'Kemandirian', 'kreativitas': 'Kreativitas' };
const MESIN: Record<string, string> = { 'tekan-sesuai': 'Mana Ya', 'seret-wadah': 'Beres-Beres', 'cari-pasangan': 'Cari Pasangan', 'mewarnai': 'Mewarnai', 'dekode': 'Pecahkan Kode', 'urutan': 'Urutan & Pola', 'jalur': 'Robot Grid', 'hitung': 'Hitung-Kode' };

function Stat({ b, l }: { b: string; l: string }) {
  return (
    <div className="kp-card" style={{ flex: 1, textAlign: 'center', padding: 14 }}><div style={{ fontSize: 22, fontWeight: 800 }}>{b}</div><div style={{ fontSize: 12, color: 'var(--abu)' }}>{l}</div></div>
  );
}

export default async function LaporanAnakPage({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: anak } = await supabase.from('anak').select('nama').eq('id', anakId).single();
  if (!anak) redirect('/pilih-anak');
  // 3 query independen (semua by anakId) → jalankan paralel
  const [{ data: rows }, catatan, sertifikat, gami] = await Promise.all([
    supabase.from('hasil_main').select('mesin,area_skill,bintang,durasi_detik,selesai').eq('anak_id', anakId),
    getCatatanAnak(anakId),
    getSertifikatAnak(anakId),
    getGamifikasiAnak(anakId),
  ]);
  const r = laporanAnak((rows ?? []) as unknown as BarisHasil[]);

  const maxArea = Math.max(1, ...Object.values(r.perArea));

  // Gabungkan catatan + sertifikat per EVENT agar bisa ditampilkan sebagai daftar collapse.
  type BlokEvent = { key: string; judul: string; tanggal: string | null; catatan: typeof catatan[number]['c'][]; sertifikat: typeof sertifikat };
  const blokMap = new Map<string, BlokEvent>();
  const ambilBlok = (key: string, judul: string, tanggal: string | null) => {
    let b = blokMap.get(key);
    if (!b) { b = { key, judul, tanggal, catatan: [], sertifikat: [] }; blokMap.set(key, b); }
    if (!b.tanggal && tanggal) b.tanggal = tanggal;
    return b;
  };
  for (const { c, judulEvent } of catatan) ambilBlok(c.event_id ?? `j:${judulEvent}`, judulEvent, null).catatan.push(c);
  for (const st of sertifikat) ambilBlok(st.event_id ?? `j:${st.event_judul}`, st.event_judul, st.event_tanggal).sertifikat.push(st);
  const blokEvent = [...blokMap.values()].sort((a, b) => (b.tanggal ?? '').localeCompare(a.tanggal ?? ''));

  return (
    <main style={{ maxWidth: 440, margin: '20px auto', padding: 16 }}>
      <Link href={`/anak/${anakId}`} style={{ color: 'var(--abu)', fontSize: 13 }}>← kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 14px' }}>📊 Perkembangan {anak.nama}</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <Stat b={String(r.totalSesi)} l="Total main" /><Stat b={`⭐${r.totalBintang}`} l="Bintang" /><Stat b={`${r.totalMenit}m`} l="Total waktu" />
      </div>
      {r.totalSesi > 0 && (
        <div style={{ fontSize: 12, color: 'var(--abu)', textAlign: 'center', marginBottom: 14 }}>⏱ Rata-rata {r.rataDetik} detik/sesi · tercepat {r.tercepatDetik} detik</div>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>LENCANA & STREAK</div>
      <div className="kp-card" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span className="kp-coin" style={{ color: '#d1660a' }}>🔥 Streak {gami.streak} hari</span>
          <span className="kp-coin" style={{ color: '#7c5cd6' }}>🏅 {gami.jumlahLencana}/{gami.lencana.length} lencana</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {gami.lencana.map((l) => (
            <div key={l.kode} title={l.syarat} style={{ textAlign: 'center', opacity: l.dapat ? 1 : 0.4 }}>
              <div style={{ fontSize: 30, filter: l.dapat ? 'none' : 'grayscale(1)' }}>{l.emoji}</div>
              <div style={{ fontSize: 10, color: l.dapat ? 'var(--tinta)' : 'var(--abu)', fontWeight: l.dapat ? 700 : 500, lineHeight: 1.2 }}>{l.judul}</div>
            </div>
          ))}
        </div>
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

      {Object.keys(r.perMesin).length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>⏱ WAKTU PER GAME</div>
          {Object.entries(r.perMesin).map(([m, st]) => (
            <div key={m} className="kp-card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
              <b>{MESIN[m] ?? m}</b>
              <span style={{ color: 'var(--abu)', fontSize: 13 }}>{st.count}x{st.tercepat > 0 ? ` · tercepat ${st.tercepat} dtk` : ''}</span>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>KEGIATAN (EVENT)</div>
      {blokEvent.length === 0
        ? <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada event yang diikuti. Catatan & sertifikat muncul setelah {anak.nama} ikut event.</p>
        : blokEvent.map((b) => (
          <details key={b.key} className="kp-card" style={{ padding: 12, marginBottom: 8 }}>
            <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700 }}>
              <span>🎈 {b.judul}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400, fontSize: 12, color: 'var(--abu)' }}>
                {b.tanggal && <span>{formatTanggal(b.tanggal)}</span>}
                {b.sertifikat.length > 0 && <span title="Ada sertifikat">🏅</span>}
                <span aria-hidden>▾</span>
              </span>
            </summary>
            <div style={{ marginTop: 10 }}>
              {b.sertifikat.map((st) => (
                <div key={st.id} style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <Link href={`/sertifikat/${st.id}`} className="kp-btn" style={{ display: 'inline-block' }}>🏅 Lihat / Unduh Sertifikat</Link>
                  {st.dokumentasi_url && <a href={st.dokumentasi_url} target="_blank" rel="noopener noreferrer" className="kp-btn" style={{ display: 'inline-block', background: 'var(--mint-d)' }}>📷 Dokumentasi</a>}
                </div>
              ))}
              {b.catatan.length > 0
                ? b.catatan.map((c) => <CatatanCard key={c.id} c={c} />)
                : b.sertifikat.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13, margin: 0 }}>Belum ada detail.</p>}
            </div>
          </details>
        ))}
    </main>
  );
}
