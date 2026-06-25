// src/app/main/[anakId]/MenuAnak.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Paket } from '@/lib/game/tipe';
import GameRunner from '@/components/game/GameRunner';
import PinGate from '@/components/game/PinGate';
import { waktuHabis, kunciHari, sisaDetik } from '@/lib/domain/waktu';
import s from './main.module.css';

type Layar = 'menu' | 'daftar' | 'main' | 'istirahat';

export default function MenuAnak({
  anak, temaNama, temaSampul, temaId, paket, pinTersimpan,
}: {
  anak: { id: string; koin: number; batas_menit: number };
  temaNama: string; temaSampul: string; temaId: string; paket: Paket[]; pinTersimpan: string | null;
}) {
  const router = useRouter();
  const [layar, setLayar] = useState<Layar>('menu');
  const [koin, setKoin] = useState(anak.koin);
  const [aktif, setAktif] = useState<Paket | null>(null);
  const [pinUntuk, setPinUntuk] = useState<null | 'keluar' | 'lanjut'>(null);
  const [terpakai, setTerpakai] = useState(0);
  // Lazy initializer: new Date() berjalan saat inisialisasi state (sekali), bukan saat render.
  // Memenuhi rule react-hooks/purity React Compiler (dilarang panggil fungsi impure saat render).
  const [kunci] = useState(() => kunciHari(anak.id, new Date()));

  // muat & jalankan timer harian
  useEffect(() => {
    const awal = Number(localStorage.getItem(kunci) ?? '0');
    // localStorage hanya ada di klien; baca awal harus di effect (bukan initializer state
    // karena komponen ikut SSR). Set sekali saat mount aman, bukan cascading render.
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

  if (layar === 'istirahat') {
    return (
      <div className={s.wrap}>
        <div className={s.rest}>
          <div className={s.emo}>😴🌙</div>
          <h2>Waktunya istirahat</h2>
          <p style={{ color: 'var(--abu)' }}>Sampai jumpa besok ya!</p>
          <button className="kp-btn" onClick={() => setPinUntuk('lanjut')}>🔒 Lanjut (izin ortu)</button>
        </div>
        {pinUntuk && (
          <PinGate pinTersimpan={pinTersimpan}
            onSukses={() => { localStorage.setItem(kunci, '0'); setTerpakai(0); setPinUntuk(null); setLayar('menu'); }}
            onBatal={() => setPinUntuk(null)} />
        )}
      </div>
    );
  }

  if (layar === 'main' && aktif) {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className={s.lock} onClick={() => setLayar('daftar')}>←</button>
          <div className={s.coin}>🪙 {koin}</div>
        </div>
        <GameRunner paket={aktif} anakId={anak.id} temaId={temaId}
          onKeluar={() => setLayar('daftar')} onKoin={setKoin} />
      </div>
    );
  }

  if (layar === 'daftar') {
    return (
      <div className={s.wrap}>
        <div className={s.top}>
          <button className={s.lock} onClick={() => setLayar('menu')}>←</button>
          <div className={s.chip}>{temaSampul} {temaNama}</div>
          <div className={s.coin}>🪙 {koin}</div>
        </div>
        <div className={s.menu}>
          {paket.map((p) => (
            <button key={p.id} className={`${s.tile} ${s.tMain}`} onClick={() => { setAktif(p); setLayar('main'); }}>
              <span>🎯</span><div>{p.judul}</div>
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
        <div className={s.chip}>{temaSampul} {temaNama}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className={s.coin}>🪙 {koin}</div>
          <button className={s.lock} onClick={() => setPinUntuk('keluar')}>🔒</button>
        </div>
      </div>
      <div className={s.menu}>
        <button className={`${s.tile} ${s.tMain}`} onClick={() => setLayar('daftar')}><span>🎯</span><div>Main Minggu Ini<br /><small style={{ fontWeight: 600, fontSize: 12 }}>{paket.length} permainan</small></div></button>
        <button className={`${s.tile} ${s.tLib}`} onClick={() => setLayar('daftar')}><span>📚</span><div>Game Edukasi</div></button>
        <button className={`${s.tile} ${s.tVid}`} onClick={() => setPinUntuk('keluar')}><span>📺</span><div>Pojok Video<br /><small style={{ fontWeight: 600, fontSize: 12 }}>segera</small></div></button>
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
