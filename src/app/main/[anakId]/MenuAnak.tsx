// src/app/main/[anakId]/MenuAnak.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { KelasBermain, Paket, TemaLengkap, Video } from '@/lib/game/tipe';
import GameRunner from '@/components/game/GameRunner';
import PinGate from '@/components/game/PinGate';
import VideoPojok from '@/components/game/VideoPojok';
import FavoritBtn from '@/components/FavoritBtn';
import KelasIsi from '@/components/KelasIsi';
import Sampul from '@/components/Sampul';
import { catatRiwayatKelas } from '@/lib/data/riwayat-actions';
import { waktuHabis, kunciHari, sisaDetik } from '@/lib/domain/waktu';
import Pewi from '@/components/ui/Pewi';
import Logo from '@/components/Logo';
import Terkunci from '@/components/Terkunci';
import ShareButton from '@/components/ShareButton';
import type { GamifikasiAnak } from '@/lib/data/gamifikasi';
import s from './main.module.css';

type Layar = 'menu' | 'kelas' | 'kelas-detail' | 'daftar' | 'pustaka' | 'video' | 'main' | 'istirahat';

export default function MenuAnak({
  anak, pustaka, pinTersimpan, video, paketAwal, kelasList, favIds, gamiAwal, batasi = false, labelArea = {},
}: {
  anak: { id: string; nama: string; koin: number; batas_menit: number };
  pustaka: TemaLengkap[]; pinTersimpan: string | null; video: Video[]; paketAwal?: string; kelasList: KelasBermain[]; favIds: string[];
  gamiAwal: GamifikasiAnak; batasi?: boolean; labelArea?: Record<string, string>;
}) {
  const router = useRouter();
  const [kunciFitur, setKunciFitur] = useState<string | null>(null);
  const terkunci = (boleh?: boolean) => batasi && boleh === false; // item khusus pelanggan
  const [gami, setGami] = useState<GamifikasiAnak>(gamiAwal);
  const [misi, setMisi] = useState<GamifikasiAnak['kustom'][number] | null>(null);
  const mingguIni = pustaka.find((t) => t.tema.is_minggu_ini) ?? pustaka[0] ?? null;
  // Deep-link: jika datang dari "Pilih Game" dengan ?paket=<id>, langsung mainkan game itu
  // — KECUALI tema-nya terkunci untuk trial (jangan auto-start; landing di menu).
  const awalCari = paketAwal
    ? pustaka.flatMap((t) => t.paket.map((p) => ({ p, t }))).find((x) => x.p.id === paketAwal) ?? null
    : null;
  const awal = awalCari && !terkunci(awalCari.t.tema.boleh_trial) ? awalCari : null;
  const [layar, setLayar] = useState<Layar>(() => (awal ? 'main' : 'menu'));
  const [koin, setKoin] = useState(anak.koin);
  const [aktif, setAktif] = useState<Paket | null>(() => awal?.p ?? null);
  const [temaTerpilih, setTemaTerpilih] = useState<TemaLengkap | null>(() => awal?.t ?? mingguIni);
  const [pinUntuk, setPinUntuk] = useState<null | 'keluar'>(null);
  const [kelasDipilih, setKelasDipilih] = useState<KelasBermain | null>(null);
  const [terpakai, setTerpakai] = useState(0);
  const [kunci] = useState(() => kunciHari(anak.id, new Date()));

  useEffect(() => {
    const awal = Number(localStorage.getItem(kunci) ?? '0');
    // localStorage hanya di klien; baca awal harus di effect (komponen ikut SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTerpakai(awal);
    const iv = setInterval(() => {
      setTerpakai((t) => {
        const n = t + 1;
        localStorage.setItem(kunci, String(n));
        if (waktuHabis(n, anak.batas_menit)) setLayar('istirahat');
        return n;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [kunci, anak.batas_menit]);

  const sisaMnt = Math.ceil(sisaDetik(terpakai, anak.batas_menit) / 60);

  function mulaiGame(p: Paket, tema: TemaLengkap) {
    setTemaTerpilih(tema); setAktif(p); setLayar('main');
  }

  // perbarui streak/lencana/tantangan di menu setelah selesai main
  function terapkanGami(r: { streak: number; lencanaBaru: { kode: string }[]; tantangan: { judul: string; emoji: string; target: number; progress: number; selesai: boolean } }) {
    setGami((g) => {
      const lencana = g.lencana.map((l) => ({ ...l, dapat: l.dapat || r.lencanaBaru.some((b) => b.kode === l.kode) }));
      return { ...g, streak: r.streak, lencana, jumlahLencana: lencana.filter((l) => l.dapat).length, tantangan: { ...g.tantangan, ...r.tantangan } };
    });
  }

  if (kunciFitur) {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className="kp-lock" aria-label="Kembali" onClick={() => setKunciFitur(null)}>←</button>
          <div className="kp-chip">🔒 {kunciFitur}</div>
          <div className="kp-coin">🪙 {koin}</div>
        </div>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 16 }}>
          <Terkunci fitur={kunciFitur} />
        </div>
      </div>
    );
  }

  if (layar === 'istirahat') {
    return (
      <div className={s.wrap}>
        <div className="kp-splash" style={{ borderRadius: 24, gap: 10 }}>
          <Pewi size={120} />
          <div className={s.emo} style={{ fontSize: 44 }}>😴🌙</div>
          <h2>Waktunya istirahat</h2>
          <p style={{ color: 'var(--abu)' }}>Sampai jumpa besok ya!</p>
          <button className="kp-btn" aria-label="Untuk orang tua" onClick={() => setPinUntuk('keluar')}>🔒 Lanjut (izin ortu)</button>
        </div>
        {pinUntuk && (
          <PinGate pinTersimpan={pinTersimpan}
            onSukses={() => { localStorage.setItem(kunci, '0'); setTerpakai(0); setPinUntuk(null); setLayar('menu'); }}
            onBatal={() => setPinUntuk(null)} />
        )}
      </div>
    );
  }

  if (layar === 'main' && aktif && temaTerpilih) {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className="kp-lock" aria-label="Kembali" onClick={() => setLayar('daftar')}>←</button>
          <div className="kp-coin">🪙 {koin}</div>
        </div>
        <GameRunner paket={aktif} anakId={anak.id} temaId={temaTerpilih.tema.id}
          onKeluar={() => setLayar('daftar')} onKoin={setKoin} onGamifikasi={terapkanGami} />
      </div>
    );
  }

  if (layar === 'video') {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className="kp-lock" aria-label="Kembali" onClick={() => setLayar('menu')}>←</button>
          <div className="kp-chip">📺 Pojok Video</div>
          <div className="kp-coin">🪙 {koin}</div>
        </div>
        <VideoPojok video={video} batasi={batasi} onKeluar={() => setLayar('menu')} onTerkunci={() => setKunciFitur('Pojok Video')} />
      </div>
    );
  }

  if (layar === 'kelas') {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className="kp-lock" aria-label="Kembali" onClick={() => setLayar('menu')}>←</button>
          <div className="kp-chip">🎈 Main Hari Ini</div>
          <div className="kp-coin">🪙 {koin}</div>
        </div>
        {kelasList.length === 0 ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '6px 2px' }}>
            <p style={{ color: 'var(--abu)', textAlign: 'center' }}>Belum ada ide bermain.</p>
          </div>
        ) : (
          <div className={s.menu}>
            {kelasList.map((k, i) => {
              const kunci = terkunci(k.boleh_trial);
              const buka = () => { if (kunci) { setKunciFitur('Materi Ide Bermain'); return; } setKelasDipilih(k); setLayar('kelas-detail'); catatRiwayatKelas(k.id).catch(() => {}); };
              return (
                <div key={k.id} className={`kp-tile ${['mint', 'lavender', 'biru'][i % 3]}`}
                  role="button" tabIndex={0} onClick={buka}
                  onKeyDown={(e) => { if (e.key === 'Enter') buka(); }}
                  style={{ position: 'relative', cursor: 'pointer', opacity: kunci ? 0.7 : 1 }}>
                  <span className="emo">{kunci ? '🔒' : '🎈'}</span>
                  <div>{k.judul}</div>
                  {!kunci && <span style={{ position: 'absolute', top: 6, right: 8 }}><FavoritBtn kelasId={k.id} awal={favIds.includes(k.id)} /></span>}
                </div>
              );
            })}
          </div>
        )}
        <div className={s.foot}>Sisa waktu hari ini: {sisaMnt} menit</div>
      </div>
    );
  }

  if (layar === 'kelas-detail' && kelasDipilih) {
    const kelas = kelasDipilih;
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className="kp-lock" aria-label="Kembali" onClick={() => setLayar('kelas')}>←</button>
          <div className="kp-chip">🎈 {kelas.judul}</div>
          <div className="kp-coin">🪙 {koin}</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 2px' }}>
          <h2 style={{ marginBottom: 10 }}>{kelas.judul}</h2>
          <KelasIsi kelas={kelas} labelArea={labelArea} bagikanUrl={`/coba/kelas/${kelas.id}`} />
        </div>
      </div>
    );
  }

  if (layar === 'pustaka') {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className="kp-lock" aria-label="Kembali" onClick={() => setLayar('menu')}>←</button>
          <div className="kp-chip">📚 Game Edukasi</div>
          <div className="kp-coin">🪙 {koin}</div>
        </div>
        {pustaka.length === 0 ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '6px 2px' }}>
            <p style={{ color: 'var(--abu)', textAlign: 'center' }}>Belum ada game.</p>
          </div>
        ) : (
        <div className={s.menu}>
          {pustaka.map((t, i) => {
            const kunci = terkunci(t.tema.boleh_trial);
            return (
              <button key={t.tema.id} className={`kp-tile ${['mint', 'lavender', 'biru'][i % 3]}`} style={{ opacity: kunci ? 0.7 : 1 }}
                onClick={() => { if (kunci) { setKunciFitur('Game Edukasi'); return; } setTemaTerpilih(t); setLayar('daftar'); }}>
                <span className="emo">{kunci ? '🔒' : <Sampul value={t.tema.sampul} size={40} />}</span><div>{t.tema.nama}<small>{kunci ? 'khusus pelanggan' : `${t.paket.length} permainan`}</small></div>
              </button>
            );
          })}
        </div>
        )}
        <div className={s.foot}>Sisa waktu hari ini: {sisaMnt} menit</div>
      </div>
    );
  }

  if (layar === 'daftar' && temaTerpilih) {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className="kp-lock" aria-label="Kembali" onClick={() => setLayar('menu')}>←</button>
          <div className="kp-chip"><Sampul value={temaTerpilih.tema.sampul} size={20} /> {temaTerpilih.tema.nama}</div>
          <div className="kp-coin">🪙 {koin}</div>
        </div>
        <div className={s.menu}>
          {temaTerpilih.paket.map((p, i) => (
            <button key={p.id} className={`kp-tile ${['mint', 'lavender', 'biru'][i % 3]}`} onClick={() => mulaiGame(p, temaTerpilih)}>
              <span className="emo">🎯</span><div>{p.judul}</div>
            </button>
          ))}
        </div>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
          <ShareButton url={`/coba/tema/${temaTerpilih.tema.id}`} title={temaTerpilih.tema.nama} text={`Main game "${temaTerpilih.tema.nama}" di KidzPlayful`} jenis="game" gambar={temaTerpilih.tema.sampul ?? undefined} label="Bagikan tema" />
        </div>
        <div className={s.foot}>Sisa waktu hari ini: {sisaMnt} menit</div>
      </div>
    );
  }

  // menu utama
  return (
    <div className={s.wrap}>
      <div className={s.top}>
        <div className="kp-chip"><Sampul value={mingguIni?.tema.sampul} size={20} /> {mingguIni?.tema.nama ?? 'KidzPlayful'}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="kp-coin">🪙 {koin}</div>
          <button className="kp-lock" aria-label="Untuk orang tua" onClick={() => setPinUntuk('keluar')}>🔒</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
        <Logo height={40} />
        <h2 style={{ color: 'var(--lavender-d)', margin: '10px 0 2px' }}>Hai, {anak.nama}! 👋</h2>
      </div>

      {/* Gamifikasi: streak + tantangan harian + lencana */}
      <div style={{ margin: '8px 0 2px' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span className="kp-coin" style={{ color: '#d1660a' }}>🔥 {gami.streak} hari</span>
          <span className="kp-coin" style={{ color: '#7c5cd6' }}>🏅 {gami.jumlahLencana}/{gami.lencana.length}</span>
        </div>
        <div className="kp-card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>{gami.tantangan.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--abu)', fontWeight: 700 }}>TANTANGAN HARI INI</div>
            <div style={{ fontWeight: 700, color: 'var(--tinta)', fontSize: 14 }}>{gami.tantangan.judul}</div>
          </div>
          {gami.tantangan.selesai
            ? <span className="kp-coin" style={{ color: '#1c7a43' }}>✓</span>
            : <span style={{ fontWeight: 800, color: 'var(--lavender-d)' }}>{gami.tantangan.progress}/{gami.tantangan.target}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          {gami.lencana.map((l) => (
            <span key={l.kode} title={l.dapat ? l.judul : `${l.judul} — ${l.syarat}`}
              style={{ fontSize: 22, filter: l.dapat ? 'none' : 'grayscale(1)', opacity: l.dapat ? 1 : 0.35 }}>{l.emoji}</span>
          ))}
        </div>
        {gami.kustom.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--abu)', marginBottom: 4 }}>🏆 MISI</div>
            {gami.kustom.map((k) => (
              <div key={k.id} role="button" tabIndex={0} onClick={() => setMisi(k)}
                onKeyDown={(e) => { if (e.key === 'Enter') setMisi(k); }}
                className="kp-card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, opacity: k.selesai ? 0.7 : 1, cursor: 'pointer' }}>
                <span style={{ fontSize: 22 }}>{k.emoji}</span>
                <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13, color: 'var(--tinta)' }}>{k.judul} <span style={{ color: 'var(--abu)' }}>ℹ️</span></div>
                {k.selesai
                  ? <span className="kp-coin" style={{ color: '#1c7a43' }}>✓</span>
                  : <span style={{ fontWeight: 800, color: 'var(--lavender-d)' }}>{k.done}/{k.total}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={s.menu}>
        <button className="kp-tile mint" onClick={() => setLayar('kelas')}>
          <span className="emo">🎈</span><div>Main Hari Ini<small>Yuk main!</small></div>
        </button>
        <button className="kp-tile lavender" onClick={() => setLayar('pustaka')}><span className="emo">📚</span><div>Game Edukasi<small>{pustaka.length} tema</small></div></button>
        <button className="kp-tile biru" onClick={() => setLayar('video')}><span className="emo">📺</span><div>Pojok Video</div></button>
      </div>
      <button className="kp-btn putih" onClick={() => setPinUntuk('keluar')}
        style={{ display: 'block', margin: '4px auto 0' }}>👨‍👩‍👧 Mode Orang Tua</button>
      <div className={s.foot}>Sisa waktu hari ini: {sisaMnt} menit</div>
      {misi && (
        <div onClick={() => setMisi(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(43,36,64,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 85 }}>
          <div onClick={(e) => e.stopPropagation()} className="kp-card" style={{ maxWidth: 360, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 34 }}>{misi.emoji}</span>
              <h3 style={{ color: 'var(--lavender-d)', fontSize: 18, flex: 1 }}>{misi.judul}</h3>
            </div>
            <p style={{ color: 'var(--tinta)', lineHeight: 1.6, fontSize: 14, whiteSpace: 'pre-wrap' }}>{misi.deskripsi || 'Ayo selesaikan misi ini untuk dapat hadiah! 🎁'}</p>
            <div style={{ marginTop: 10, fontSize: 13, color: misi.selesai ? '#1c7a43' : 'var(--abu)', fontWeight: 700 }}>
              {misi.selesai ? '✓ Sudah selesai!' : `Progres: ${misi.done}/${misi.total} syarat`}
            </div>
            <button className="kp-btn" style={{ width: '100%', marginTop: 14 }} onClick={() => setMisi(null)}>Tutup</button>
          </div>
        </div>
      )}
      {pinUntuk && (
        <PinGate pinTersimpan={pinTersimpan}
          onSukses={() => { setPinUntuk(null); router.push('/pilih-anak'); }}
          onBatal={() => setPinUntuk(null)} />
      )}
    </div>
  );
}
