// src/app/main/[anakId]/MenuAnak.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Paket, TemaLengkap, Video } from '@/lib/game/tipe';
import GameRunner from '@/components/game/GameRunner';
import PinGate from '@/components/game/PinGate';
import VideoPojok from '@/components/game/VideoPojok';
import { waktuHabis, kunciHari, sisaDetik } from '@/lib/domain/waktu';
import Pewi from '@/components/ui/Pewi';
import s from './main.module.css';

type Layar = 'menu' | 'daftar' | 'pustaka' | 'video' | 'main' | 'istirahat';

export default function MenuAnak({
  anak, pustaka, pinTersimpan, video, paketAwal,
}: {
  anak: { id: string; koin: number; batas_menit: number };
  pustaka: TemaLengkap[]; pinTersimpan: string | null; video: Video[]; paketAwal?: string;
}) {
  const router = useRouter();
  const mingguIni = pustaka.find((t) => t.tema.is_minggu_ini) ?? pustaka[0] ?? null;
  // Deep-link: jika datang dari "Pilih Game" dengan ?paket=<id>, langsung mainkan game itu.
  const findAwal = () =>
    paketAwal
      ? pustaka.flatMap((t) => t.paket.map((p) => ({ p, t }))).find((x) => x.p.id === paketAwal) ?? null
      : null;
  const [layar, setLayar] = useState<Layar>(() => (findAwal() ? 'main' : 'menu'));
  const [koin, setKoin] = useState(anak.koin);
  const [aktif, setAktif] = useState<Paket | null>(() => findAwal()?.p ?? null);
  const [temaTerpilih, setTemaTerpilih] = useState<TemaLengkap | null>(() => findAwal()?.t ?? mingguIni);
  const [pinUntuk, setPinUntuk] = useState<null | 'keluar'>(null);
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
          onKeluar={() => setLayar('daftar')} onKoin={setKoin} />
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
        <VideoPojok video={video} onKeluar={() => setLayar('menu')} />
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
        <div className={s.menu}>
          {pustaka.map((t, i) => (
            <button key={t.tema.id} className={`kp-tile ${['mint', 'lavender', 'biru'][i % 3]}`}
              onClick={() => { setTemaTerpilih(t); setLayar('daftar'); }}>
              <span className="emo">{t.tema.sampul ?? '🎈'}</span><div>{t.tema.nama}<small>{t.paket.length} permainan</small></div>
            </button>
          ))}
        </div>
        <div className={s.foot}>Sisa waktu hari ini: {sisaMnt} menit</div>
      </div>
    );
  }

  if (layar === 'daftar' && temaTerpilih) {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className="kp-lock" aria-label="Kembali" onClick={() => setLayar('menu')}>←</button>
          <div className="kp-chip">{temaTerpilih.tema.sampul ?? '🎈'} {temaTerpilih.tema.nama}</div>
          <div className="kp-coin">🪙 {koin}</div>
        </div>
        <div className={s.menu}>
          {temaTerpilih.paket.map((p, i) => (
            <button key={p.id} className={`kp-tile ${['mint', 'lavender', 'biru'][i % 3]}`} onClick={() => mulaiGame(p, temaTerpilih)}>
              <span className="emo">🎯</span><div>{p.judul}</div>
            </button>
          ))}
        </div>
        <div className={s.foot}>Sisa waktu hari ini: {sisaMnt} menit</div>
      </div>
    );
  }

  // menu utama
  return (
    <div className={s.wrap}>
      <div className={s.top}>
        <div className="kp-chip">{mingguIni?.tema.sampul ?? '🎈'} {mingguIni?.tema.nama ?? 'KidzPlayful'}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="kp-coin">🪙 {koin}</div>
          <button className="kp-lock" aria-label="Untuk orang tua" onClick={() => setPinUntuk('keluar')}>🔒</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
        <Pewi size={84} />
      </div>
      <div className={s.menu}>
        <button className="kp-tile mint" onClick={() => { setTemaTerpilih(mingguIni); setLayar('daftar'); }} disabled={!mingguIni}>
          <span className="emo">🎯</span><div>Main Minggu Ini<small>{mingguIni?.paket.length ?? 0} permainan</small></div>
        </button>
        <button className="kp-tile lavender" onClick={() => setLayar('pustaka')}><span className="emo">📚</span><div>Game Edukasi<small>{pustaka.length} tema</small></div></button>
        <button className="kp-tile biru" onClick={() => setLayar('video')}><span className="emo">📺</span><div>Pojok Video</div></button>
      </div>
      <div className={s.foot}>Sisa waktu hari ini: {sisaMnt} menit</div>
      {pinUntuk && (
        <PinGate pinTersimpan={pinTersimpan}
          onSukses={() => { setPinUntuk(null); router.push('/pilih-anak'); }}
          onBatal={() => setPinUntuk(null)} />
      )}
    </div>
  );
}
