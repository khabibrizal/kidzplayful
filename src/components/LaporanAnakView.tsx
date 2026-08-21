// src/components/LaporanAnakView.tsx — badan laporan tumbuh kembang anak (dipakai ortu & psikolog)
// Dipisah dari halaman /anak/[id]/laporan agar bisa dipakai ulang di chat psikolog.
// Akses psikolog dijamin RLS boleh_lihat_laporan_anak (migrasi 0066).
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { laporanAnak, type BarisHasil } from '@/lib/domain/laporan-anak';
import { getCatatanAnak } from '@/lib/data/catatan';
import { getSertifikatAnak } from '@/lib/data/sertifikat';
import { getGamifikasiAnak } from '@/lib/data/gamifikasi';
import { getKegiatanAnak } from '@/lib/data/kegiatan';
import { getHakAnak } from '@/lib/data/langganan-anak';
import { bulanTerakhir, labelBulan } from '@/lib/domain/laporan-bulanan';
import { getEventIdHadirAnak, getEventInfoBanyak } from '@/lib/data/event';
import { formatTanggal } from '@/lib/format';
import CatatanCard from '@/components/CatatanCard';

const LABEL: Record<string, string> = { 'kognitif': 'Kognitif', 'motorik-halus': 'Motorik Halus', 'sensorik': 'Sensorik', 'kemandirian': 'Kemandirian', 'kreativitas': 'Kreativitas' };
const MESIN: Record<string, string> = { 'tekan-sesuai': 'Mana Ya', 'seret-wadah': 'Beres-Beres', 'cari-pasangan': 'Cari Pasangan', 'mewarnai': 'Mewarnai', 'dekode': 'Pecahkan Kode', 'urutan': 'Urutan & Pola', 'jalur': 'Robot Grid', 'hitung': 'Hitung-Kode' };

function Stat({ b, l }: { b: string; l: string }) {
  return (
    <div className="kp-card" style={{ flex: 1, textAlign: 'center', padding: 14 }}><div style={{ fontSize: 22, fontWeight: 800 }}>{b}</div><div style={{ fontSize: 12, color: 'var(--abu)' }}>{l}</div></div>
  );
}

export default async function LaporanAnakView({ anakId, tampilkanSertifikat = true }: { anakId: string; tampilkanSertifikat?: boolean }) {
  const supabase = await createClient();
  const { data: anak } = await supabase.from('anak').select('nama').eq('id', anakId).maybeSingle();
  const [{ data: rows }, catatan, sertifikat, gami, idHadir, kegiatan, hak] = await Promise.all([
    supabase.from('hasil_main').select('mesin,area_skill,bintang,durasi_detik,selesai').eq('anak_id', anakId),
    getCatatanAnak(anakId),
    getSertifikatAnak(anakId),
    getGamifikasiAnak(anakId),
    getEventIdHadirAnak(anakId),
    getKegiatanAnak(anakId),
    getHakAnak(anakId),
  ]);
  const r = laporanAnak((rows ?? []) as unknown as BarisHasil[]);
  const maxArea = Math.max(1, ...Object.values(r.perArea));
  const namaAnak = (anak?.nama as string) ?? 'anak';

  // Gabungkan catatan + sertifikat + KEHADIRAN per EVENT (daftar collapse).
  type BlokEvent = { key: string; judul: string; tanggal: string | null; hadir: boolean; dokumentasi: string | null; catatan: typeof catatan[number]['c'][]; sertifikat: typeof sertifikat };
  const blokMap = new Map<string, BlokEvent>();
  const judulBaik = (j?: string | null) => !!j && j.trim() !== '' && j !== 'Event';
  const ambilBlok = (key: string, judul: string, tanggal: string | null) => {
    let b = blokMap.get(key);
    if (!b) { b = { key, judul, tanggal, hadir: false, dokumentasi: null, catatan: [], sertifikat: [] }; blokMap.set(key, b); }
    // upgrade ke judul yang lebih valid bila blok sebelumnya masih fallback "Event"
    if (!judulBaik(b.judul) && judulBaik(judul)) b.judul = judul;
    if (!b.tanggal && tanggal) b.tanggal = tanggal;
    return b;
  };
  for (const { c, judulEvent } of catatan) ambilBlok(c.event_id ?? `j:${judulEvent}`, judulEvent, null).catatan.push(c);
  if (tampilkanSertifikat) for (const st of sertifikat) ambilBlok(st.event_id ?? `j:${st.event_judul}`, st.event_judul, st.event_tanggal).sertifikat.push(st);
  // Anak yang sudah diabsen HADIR selalu dapat bloknya sendiri — walau sertifikatnya belum
  // di-generate dan walau eventnya sudah diarsipkan. Di blok itulah tautan dokumentasi ada.
  for (const id of idHadir) ambilBlok(id, 'Event', null).hadir = true;

  // Judul, tanggal, dan tautan dokumentasi diambil ULANG dari event (bukan snapshot
  // sertifikat): admin sering memasang link dokumentasi SETELAH sertifikat terbit, dan
  // snapshot yang kosong itu membuat tombol Dokumentasi tak pernah muncul.
  const info = await getEventInfoBanyak([...blokMap.keys()].filter((k) => !k.startsWith('j:')));
  for (const b of blokMap.values()) {
    const i = info.get(b.key);
    if (i) {
      if (judulBaik(i.judul)) b.judul = i.judul;
      if (i.tanggal) b.tanggal = i.tanggal;
      b.dokumentasi = i.dokumentasi_url?.trim() || null;
    }
    // cadangan: event tak terbaca (mis. dilihat psikolog) → pakai snapshot sertifikat
    if (!b.dokumentasi) b.dokumentasi = b.sertifikat.find((st) => st.dokumentasi_url)?.dokumentasi_url ?? null;
    if (!judulBaik(b.judul)) b.judul = b.sertifikat[0]?.event_judul || 'Kelas Bermain';
  }
  const blokEvent = [...blokMap.values()].sort((a, b) => (b.tanggal ?? '').localeCompare(a.tanggal ?? ''));

  // Kegiatan mandiri dikelompokkan per bulan WIB (bukan UTC): kegiatan malam tanggal 31 tak
  // boleh pindah ke bulan berikutnya.
  const grupKeg = new Map<string, typeof kegiatan>();
  for (const k of kegiatan) {
    const wib = new Date(new Date(k.waktu).getTime() + 7 * 3600 * 1000);
    const ym = `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, '0')}`;
    const arr = grupKeg.get(ym); if (arr) arr.push(k); else grupKeg.set(ym, [k]);
  }
  const perBulanKegiatan = [...grupKeg.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <>
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
      {r.totalSesi === 0 && <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada data — ajak {namaAnak} main dulu ya.</p>}

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

      {/* ——— Aktivitas mandiri di rumah (migrasi 0093) ———
          Ide Bermain & video yang dikerjakan anak — inti homeschooling, dan sebelumnya sama
          sekali tak tercatat per anak. */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>🏠 AKTIVITAS MANDIRI</div>
      {kegiatan.length === 0 ? (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>
          Belum ada catatan. Setiap Ide Bermain yang dibuka dan video yang ditonton {namaAnak} di Mode Anak akan tercatat di sini.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
            <Stat b={String(kegiatan.filter((k) => k.jenis === 'ide-bermain').length)} l="Ide Bermain" />
            <Stat b={String(kegiatan.filter((k) => k.jenis === 'video').length)} l="Video" />
          </div>
          {perBulanKegiatan.map(([ym, list]) => (
            <details key={ym} className="kp-card" style={{ padding: 12, marginBottom: 8 }} open={ym === perBulanKegiatan[0]?.[0]}>
              <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700 }}>
                <span>🗓️ {labelBulan(ym)}</span>
                <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--abu)' }}>{list.length} kegiatan ▾</span>
              </summary>
              <div style={{ marginTop: 8 }}>
                {list.slice(0, 40).map((k) => (
                  <div key={k.id} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 8, margin: '3px 0' }}>
                    <span>{k.jenis === 'video' ? '📺' : '🎈'} {k.judul ?? 'Tanpa judul'}</span>
                    <span style={{ color: 'var(--abu)', fontSize: 12 }}>{formatTanggal(k.waktu.slice(0, 10))}</span>
                  </div>
                ))}
                {list.length > 40 && <div style={{ fontSize: 12, color: 'var(--abu)', marginTop: 4 }}>…dan {list.length - 40} kegiatan lain</div>}
              </div>
            </details>
          ))}
        </>
      )}

      {/* Rapor bulanan yang bisa diunduh — hak `raporBulanan` dari paket anak ini. */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>📄 RAPOR BULANAN</div>
      {hak.raporBulanan ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {bulanTerakhir(new Date(), 3).map((ym) => (
            <Link key={ym} href={`/anak/${anakId}/rapor/${ym}`} className="kp-btn putih" style={{ display: 'inline-block' }}>
              {labelBulan(ym)}
            </Link>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--abu)', fontSize: 13 }}>
          Rapor bulanan yang bisa diunduh tersedia pada paket yang menyertakannya
          {hak.paket ? ` — paket ${hak.paket.nama} belum termasuk.` : '.'}{' '}
          <Link href="/langganan" style={{ color: 'var(--biru-d)' }}>Lihat paket →</Link>
        </p>
      )}

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>KEGIATAN (EVENT)</div>
      {blokEvent.length === 0
        ? <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada event yang diikuti. Catatan & sertifikat muncul setelah {namaAnak} ikut event.</p>
        : blokEvent.map((b) => (
          <details key={b.key} className="kp-card" style={{ padding: 12, marginBottom: 8 }}>
            <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700 }}>
              <span>🎈 {b.judul}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400, fontSize: 12, color: 'var(--abu)' }}>
                {b.tanggal && <span>{formatTanggal(b.tanggal)}</span>}
                {b.sertifikat.length > 0 && <span title="Ada sertifikat">🏅</span>}
                {b.dokumentasi && <span title="Ada dokumentasi">📷</span>}
                <span aria-hidden>▾</span>
              </span>
            </summary>
            <div style={{ marginTop: 10 }}>
              {(b.sertifikat.length > 0 || b.dokumentasi) && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {b.sertifikat.map((st) => (
                    <Link key={st.id} href={`/sertifikat/${st.id}`} className="kp-btn" style={{ display: 'inline-block' }}>🏅 Lihat / Unduh Sertifikat</Link>
                  ))}
                  {/* satu tombol dokumentasi per event — sumbernya event, bukan snapshot sertifikat */}
                  {b.dokumentasi && <a href={b.dokumentasi} target="_blank" rel="noopener noreferrer" className="kp-btn" style={{ display: 'inline-block', background: 'var(--mint-d)' }}>📷 Dokumentasi</a>}
                </div>
              )}
              {tampilkanSertifikat && b.hadir && b.sertifikat.length === 0 && (
                <p style={{ color: 'var(--abu)', fontSize: 13, marginTop: 0 }}>🏅 E-sertifikat untuk event ini belum diterbitkan admin.</p>
              )}
              {b.catatan.length > 0
                ? b.catatan.map((c) => <CatatanCard key={c.id} c={c} judulEvent={b.judul} />)
                : b.sertifikat.length === 0 && !b.hadir && !b.dokumentasi && <p style={{ color: 'var(--abu)', fontSize: 13, margin: 0 }}>Belum ada detail.</p>}
            </div>
          </details>
        ))}
    </>
  );
}
