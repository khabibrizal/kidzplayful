// src/app/ortu/[anakId]/page.tsx
import Link from 'next/link';
import Pewi from '@/components/ui/Pewi';
import { getAnakTerjamin } from '@/lib/data/anak';
import { getKelasAktifCached } from '@/lib/data/publik';
import { getVideoByKategori } from '@/lib/data/video';
import { getHakAnak } from '@/lib/data/langganan-anak';
import { getStatusWorksheet } from '@/lib/data/worksheet';
import { getLabelFokusArea } from '@/lib/data/fokus-area';
import { getEvaluasiAnak, getKonteksKurikulumAnak } from '@/lib/data/kurikulum';
import { kelompokTemaBracket } from '@/lib/domain/siklus-kurikulum';
import KelasIsi from '@/components/KelasIsi';
import Terkunci from '@/components/Terkunci';
import s from './ortu.module.css';
import TombolKembali from '@/components/TombolKembali';

export default async function ModeOrtu({ params }: { params: Promise<{ anakId: string }> }) {
  const { anakId } = await params;
  const anak = await getAnakTerjamin(anakId);
  const [kelasList0, videoBaby0, status, labelArea, wsKuota, evaluasi] = await Promise.all([
    getKelasAktifCached(), getVideoByKategori('baby'), getHakAnak(anakId), getLabelFokusArea(), getStatusWorksheet(),
    getEvaluasiAnak(anakId),
  ]);
  // Kategori usia DIBEKUKAN per siklus (0104): umur dihitung dari awal siklus, bukan hari
  // ini, supaya ulang tahun di tengah bulan tak mengganti daftar temanya.
  const ktx = await getKonteksKurikulumAnak(anakId);
  const bulanAnak = ktx.bulanDalamBracket;
  // Checklist milik ANAK ini dan peran 'ortu' — bukan penilaian guru/psikolog, yang punya
  // barisnya sendiri (kunci 0098 = anak+kelas+peran) dan tampil di rapor, bukan di sini.
  const evalOrtu = new Map(evaluasi.filter((e) => e.peran === 'ortu').map((e) => [e.kelas_id, e]));
  // trial: item tetap TAMPIL tapi yang tak ditandai "boleh trial" akan terkunci (🔒)
  // Hak per ANAK (migrasi 0089), bukan per akun.
  const batasi = !status.ideBermain;
  // Hanya tema yang sudah terbuka untuk ANAK INI (0098). Bulan depan cukup judulnya,
  // dan itu ditampilkan di bagian tersendiri di bawah.
  // Saring menurut usia anak; jumlah yang tersaring DISEBUTKAN di layar orang tua, supaya
  // selisih jumlah tema di admin dan di sini selalu ada penjelasannya.
  const umurAnak = ktx.umurBeku;
  const grup = kelompokTemaBracket(kelasList0, ktx);
  const kelasList = [...grup.bulanIni, ...grup.sudahTerbuka];
  const terkunciList = grup.terkunci;
  const videoBaby = videoBaby0;
  const terkunci = (b?: boolean) => batasi && b === false;

  return (
    <div className={s.wrap}>
      <TombolKembali fallback="/pilih-anak" className={s.back} />
      <div className={s.hd}>
        <Pewi size={72} />
        <div className={s.hdText}>
          <h1>👶 Mode Orang Tua</h1>
          <small>Untuk {anak.nama} · aktivitas main bersama (0-2 thn)</small>
        </div>
      </div>

      <div className={s.muted} style={{ fontSize: 12, fontWeight: 700 }}>📚 KURIKULUM {anak.nama.toUpperCase()} · BULAN KE-{bulanAnak}</div>
      {terkunciList.length > 0 && (
        <div className={s.muted} style={{ fontSize: 12 }}>
          {grup.terkunciBulan.length > 0 && `${grup.terkunciBulan.length} tema menunggu bulan berikutnya`}
          {grup.terkunciBulan.length > 0 && grup.terkunciUsia.length > 0 && ' · '}
          {grup.terkunciUsia.length > 0 && `${grup.terkunciUsia.length} tema untuk kategori usia lain (${anak.nama} ${umurAnak} th) — menunggu tak akan membukanya`}.
        </div>
      )}
      {kelasList.length === 0 && <p className={s.muted}>Belum ada ide bermain aktif. Admin dapat menambah di Kelola Ide Bermain.</p>}

      {kelasList.map((k) => (
        terkunci(k.boleh_trial) ? (
          <div key={k.id} className="kp-card" style={{ marginBottom: 12, opacity: 0.85 }}>
            <b>🔒 {k.judul}</b>
            <div style={{ marginTop: 6 }}><Terkunci fitur="Materi Ide Bermain" ringkas /></div>
          </div>
        ) : (
        <div key={k.id} className="kp-card" style={{ marginBottom: 12 }}>
          <b>🎈 {k.judul}</b>
          <KelasIsi kelas={k} labelArea={labelArea} bagikanUrl={`/coba/kelas/${k.id}`} bolehWorksheet={status.worksheet && wsKuota.boleh} sisaWorksheet={wsKuota.sisa} worksheetTanpaBatas={wsKuota.tanpaBatas} modeWorksheet={wsKuota.mode}
            anakId={anakId} anakNama={anak.nama} evaluasiAwal={evalOrtu.get(k.id)?.hasil ?? []}
            evaluasiPeran={evalOrtu.get(k.id)?.peran ?? null} evaluasiWaktu={evalOrtu.get(k.id)?.updated_at ?? null}
            kembaliUrl={`/ortu/${anakId}`} />
        </div>
        )
      ))}

      {/* SEMUA tema yang belum waktunya tetap tampil — terkunci, dengan bulan terbukanya.
          Menyembunyikannya membuat jumlah tema di admin dan di sini tak pernah cocok. */}
      {terkunciList.length > 0 && (
        <div className="kp-card" style={{ marginBottom: 12, background: '#f7f5fc' }}>
          <b style={{ fontSize: 13 }}>⏳ Belum terbuka untuk {anak.nama}</b>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--abu)', fontSize: 14 }}>
            {terkunciList.map((k) => (
              <li key={k.id}>{k.judul} <small>· bulan ke-{k.bulan_kurikulum}</small></li>
            ))}
          </ul>
          <div style={{ fontSize: 12, color: 'var(--abu)', marginTop: 6 }}>
            {anak.nama} sekarang di bulan ke-{bulanAnak}; tema di atas terbuka saat langganannya
            mencapai bulan yang tertulis.
          </div>
        </div>
      )}

      <div className={s.sec}>Video untuk Baby</div>
      {videoBaby.length === 0 && <p className={s.muted}>Belum ada video baby (tambah di Admin → Kelola Video).</p>}
      {videoBaby.map((v) => (
        <div key={v.id} className="kp-card" style={{ marginBottom: 12, opacity: terkunci(v.boleh_trial) ? 0.85 : 1 }}>
          <div className={s.vid}><span style={{ fontSize: 24 }}>{terkunci(v.boleh_trial) ? '🔒' : '▶'}</span><span style={{ flex: 1 }}><b>{v.judul}</b><br /><span className={s.muted}>{terkunci(v.boleh_trial) ? 'khusus pelanggan' : `${Math.round(v.durasi_detik / 60)} menit`}</span></span>
            {terkunci(v.boleh_trial)
              ? <Link className="kp-btn mint" href="/pengaturan" style={{ fontSize: 14, padding: '11px 20px' }}>✨ Upgrade</Link>
              : <a className="kp-btn" href={`https://www.youtube-nocookie.com/embed/${v.youtube_id}`} target="_blank" style={{ fontSize: 14, padding: '11px 20px' }}>Putar</a>}
          </div>
        </div>
      ))}
    </div>
  );
}
