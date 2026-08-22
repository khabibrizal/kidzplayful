// src/components/KelasIsi.tsx — isi materi Kelas Bermain (dipakai konsisten di detail, Mode Anak, Mode Ortu).
// Presentational murni (aman di Server & Client Component). Judul kelas dirender oleh pemanggil.
import Link from 'next/link';
import type { KelasBermain } from '@/lib/game/tipe';
import BeliBtn from './BeliBtn';
import YoutubeEmbed from './YoutubeEmbed';
import { youtubeId } from '@/lib/youtube';
import ShareButton from '@/components/ShareButton';
import WorksheetBtn from '@/components/WorksheetBtn';
import AktivitasTema from '@/components/AktivitasTema';
import type { ButirEvaluasi } from '@/lib/domain/kurikulum';

const LABEL_FALLBACK: Record<string, string> = {
  'motorik-halus': '✋ Motorik Halus', 'motorik-kasar': '🏃 Motorik Kasar', kognitif: '🧠 Kognitif',
  bahasa: '🗣️ Bahasa', 'sosial-emosional': '💞 Sosial-Emosional', sensorik: '🖐️ Sensorik',
  kemandirian: '🌟 Kemandirian', kreativitas: '🎨 Kreativitas',
};

export default function KelasIsi({ kelas, labelArea = {}, bagikan = true, bagikanUrl, bolehWorksheet = false, sisaWorksheet, worksheetTanpaBatas, anakId, anakNama, evaluasiAwal = [], evaluasiPeran, evaluasiWaktu, kembaliUrl }: {
  kelas: KelasBermain; labelArea?: Record<string, string>; bagikan?: boolean; bagikanUrl?: string;
  /**
   * Worksheet adalah fasilitas paket berhak (migrasi 0089). BAWAANNYA `false`: pemanggil yang
   * lupa memasang hak akan MENGUNCI, bukan membuka — lupa memasang penjaga tidak boleh
   * berarti fasilitas berbayar dibagikan gratis. Materi dengan `worksheet_terbuka` tetap
   * terbuka untuk semua sebagai contoh.
   */
  bolehWorksheet?: boolean;
  /** sisa kuota unduh worksheet (null/undefined = tak dibatasi atau tak relevan) */
  sisaWorksheet?: number | null;
  worksheetTanpaBatas?: boolean;
  /**
   * Anak yang sedang dibuka (0098). Kurikulum & evaluasi selalu MILIK SATU ANAK, jadi
   * tanpa ini checklist tampil read-only dan tombol game disembunyikan — bukan menebak
   * anak siapa yang dimaksud.
   */
  anakId?: string | null;
  anakNama?: string | null;
  /** hasil checklist yang sudah tersimpan untuk anak itu pada tema ini */
  evaluasiAwal?: ButirEvaluasi[];
  evaluasiPeran?: string | null;
  evaluasiWaktu?: string | null;
  /** ke mana tombol keluar game harus kembali (path internal) */
  kembaliUrl?: string;
}) {
  const LABEL = { ...LABEL_FALLBACK, ...labelArea };
  const adaInfo = !!(kelas.tujuan || (kelas.fokus_area?.length ?? 0) > 0 || kelas.peran_ortu || kelas.usia_min != null);

  return (
    <>
      {kelas.sampul_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={kelas.sampul_url} alt="" loading="lazy" decoding="async" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 16, marginBottom: 12, display: 'block' }} />
      )}
      {adaInfo && (
        <div className="kp-card" style={{ marginBottom: 12, background: '#f7f5fc' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>👶 Untuk usia {kelas.usia_min ?? 0}–{kelas.usia_max ?? 6} tahun</div>
          {kelas.tujuan && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🎯 TUJUAN</div>
              <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{kelas.tujuan}</p>
            </div>
          )}
          {(kelas.fokus_area?.length ?? 0) > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🧩 FOKUS AREA PERKEMBANGAN</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {kelas.fokus_area!.map((ar) => (
                  <span key={ar} style={{ fontSize: 12, fontWeight: 700, background: '#efe7fb', color: 'var(--lavender-d)', borderRadius: 99, padding: '4px 10px' }}>{LABEL[ar] ?? ar}</span>
                ))}
              </div>
            </div>
          )}
          {kelas.peran_ortu && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🤝 PERAN ORANG TUA</div>
              <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{kelas.peran_ortu}</p>
            </div>
          )}
        </div>
      )}

      {kelas.bahan?.length > 0 && (
        <div className="kp-card" style={{ marginBottom: 12, background: '#fff3d6' }}>
          <b>🧺 Bahan</b>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {kelas.bahan.map((b, i) => (
              <li key={i} style={{ margin: '6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1 }}>{b.nama}</span>
                {(b.produk_id || b.link) && <BeliBtn nama={b.nama} link={b.link} produkId={b.produk_id} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Kartu aktivitas + tombol game + checklist evaluasi PER AKTIVITAS, lalu satu
          tombol simpan di bawah. Rendering-nya di komponen client karena centang seluruh
          aktivitas berbagi satu state. */}
      <AktivitasTema kelasId={kelas.id} aktivitas={kelas.aktivitas ?? []} anakId={anakId} anakNama={anakNama}
        kembaliUrl={kembaliUrl} tersimpan={evaluasiAwal} peranTersimpan={evaluasiPeran} waktuTersimpan={evaluasiWaktu} />

      {kelas.link_ide && youtubeId(kelas.link_ide) && (
        <div className="no-print"><YoutubeEmbed id={youtubeId(kelas.link_ide)!} title={kelas.judul} /></div>
      )}
      <div className="no-print" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {kelas.link_ide && !youtubeId(kelas.link_ide) && <a className="kp-btn" style={{ display: 'inline-block' }} href={kelas.link_ide} target="_blank">Lihat ide ▶</a>}
        {kelas.worksheet_url && (
          bolehWorksheet || kelas.worksheet_terbuka
            ? <WorksheetBtn kelasId={kelas.id} sisaAwal={sisaWorksheet} tanpaBatas={worksheetTanpaBatas} terbuka={kelas.worksheet_terbuka} />
            : <span className="kp-btn putih" style={{ display: 'inline-block', opacity: 0.6, cursor: 'not-allowed' }}
                title="Unduh worksheet tersedia pada paket berlangganan">🔒 Worksheet (khusus pelanggan)</span>
        )}
        {bagikanUrl && <ShareButton url={bagikanUrl} title={kelas.judul} text={`Materi kelas bermain "${kelas.judul}" di KidzPlayful`} jenis="kelas" gambar={kelas.sampul_url ?? undefined} label="Bagikan" />}
        {bagikan && <Link className="kp-btn putih" style={{ display: 'inline-block' }} href={`/komunitas?topik=${encodeURIComponent(kelas.judul)}`}>💬 Bagikan pengalaman</Link>}
      </div>
    </>
  );
}
