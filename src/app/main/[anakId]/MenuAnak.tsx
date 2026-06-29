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
import BeliBtn from '@/components/BeliBtn';
import { catatRiwayatKelas } from '@/lib/data/riwayat-actions';
import { waktuHabis, kunciHari, sisaDetik } from '@/lib/domain/waktu';
import Pewi from '@/components/ui/Pewi';
import s from './main.module.css';

type Layar = 'menu' | 'kelas' | 'kelas-detail' | 'daftar' | 'pustaka' | 'video' | 'main' | 'istirahat';

export default function MenuAnak({
  anak, pustaka, pinTersimpan, video, paketAwal, kelasList, favIds,
}: {
  anak: { id: string; nama: string; koin: number; batas_menit: number };
  pustaka: TemaLengkap[]; pinTersimpan: string | null; video: Video[]; paketAwal?: string; kelasList: KelasBermain[]; favIds: string[];
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
            <p style={{ color: 'var(--abu)', textAlign: 'center' }}>Belum ada kelas bermain.</p>
          </div>
        ) : (
          <div className={s.menu}>
            {kelasList.map((k, i) => (
              <div key={k.id} className={`kp-tile ${['mint', 'lavender', 'biru'][i % 3]}`}
                role="button" tabIndex={0}
                onClick={() => { setKelasDipilih(k); setLayar('kelas-detail'); catatRiwayatKelas(k.id).catch(() => {}); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setKelasDipilih(k); setLayar('kelas-detail'); catatRiwayatKelas(k.id).catch(() => {}); } }}
                style={{ position: 'relative', cursor: 'pointer' }}>
                <span className="emo">🎈</span>
                <div>{k.judul}</div>
                <span style={{ position: 'absolute', top: 6, right: 8 }}>
                  <FavoritBtn kelasId={k.id} awal={favIds.includes(k.id)} />
                </span>
              </div>
            ))}
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
          {kelas.bahan?.length > 0 && (
            <div className="kp-card" style={{ marginBottom: 10, background: '#fff3d6' }}>
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
          {kelas.aktivitas?.map((a, ai) => (
            <div key={ai} className="kp-card" style={{ marginBottom: 10 }}>
              <b>🎯 {a.judul || `Aktivitas ${ai + 1}`}</b>
              {a.cara_membuat && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>🛠️ {a.cara_membuat}</p>}
              {a.langkah?.length > 0 && (
                <ol style={{ margin: '8px 0 0 18px', lineHeight: 1.7 }}>{a.langkah.map((l, i) => <li key={i}>{l}</li>)}</ol>
              )}
            </div>
          ))}
          {kelas.link_ide && <a className="kp-btn" style={{ display: 'inline-block', marginRight: 8 }} href={kelas.link_ide} target="_blank">Lihat ide ▶</a>}
          {kelas.worksheet_url && <a className="kp-btn putih" style={{ display: 'inline-block' }} href={kelas.worksheet_url} target="_blank">📄 Worksheet</a>}
          <Link className="kp-btn putih" style={{ display: 'inline-block', marginTop: 8, marginRight: 8 }} href={`/kelas/${kelas.id}`}>⬇ Unduh PDF</Link>
          <Link className="kp-btn putih" style={{ display: 'inline-block', marginTop: 8 }} href="/komunitas">💬 Bagikan pengalaman</Link>
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
        <Pewi size={84} />
        <h2 style={{ color: 'var(--lavender-d)', margin: '6px 0 2px' }}>Hai, {anak.nama}! 👋</h2>
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
      {pinUntuk && (
        <PinGate pinTersimpan={pinTersimpan}
          onSukses={() => { setPinUntuk(null); router.push('/pilih-anak'); }}
          onBatal={() => setPinUntuk(null)} />
      )}
    </div>
  );
}
