// src/components/game/GameRunner.tsx
'use client';
import { useEffect, useState } from 'react';
import type { Paket, HasilSelesai, DataTekan, DataSeret, DataCocok, DataMewarnai, DataDekode, DataUrutan, DataJalur, DataHitung, DataCocokkan } from '@/lib/game/tipe';
import ManaYa from './ManaYa';
import BeresBeres from './BeresBeres';
import CariPasangan from './CariPasangan';
import MewarnaiGame from './MewarnaiGame';
import Dekode from './Dekode';
import UrutanGame from './UrutanGame';
import JalurGame from './JalurGame';
import HitungGame from './HitungGame';
import CocokkanGame from './CocokkanGame';
import Reward from './Reward';
import { catatHasil } from '@/lib/data/skor';
import { hitungBintang } from '@/lib/domain/skor';

export default function GameRunner({
  paket, anakId, temaId, onKeluar, onKoin,
}: { paket: Paket; anakId: string; temaId: string; onKeluar: () => void; onKoin: (k: number) => void }) {
  const [run, setRun] = useState(0);              // remount engine untuk "main lagi"
  const [hasil, setHasil] = useState<HasilSelesai | null>(null);
  const [detik, setDetik] = useState(0);          // timer hidup saat bermain

  useEffect(() => {
    if (hasil) return;                            // berhenti saat selesai
    setDetik(0);
    const t = setInterval(() => setDetik((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [run, hasil]);
  const jam = (d: number) => `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`;

  async function selesai(h: HasilSelesai) {
    setHasil(h);
    try {
      const r = await catatHasil({
        anakId, temaId, mesin: paket.mesin, areaSkill: paket.area_skill,
        benar: h.benar, total: h.total, durasiDetik: h.durasiDetik, targetDetik: paket.target_detik ?? null,
      });
      onKoin(r.koin);
    } catch { /* offline/Tahap berikut: antrikan; untuk M2 abaikan diam */ }
  }

  if (hasil) {
    const target = paket.target_detik ?? 0;
    const bonus = target > 0 && hasil.durasiDetik > 0 && hasil.durasiDetik <= target;
    const bintang = Math.min(3, hitungBintang(hasil.benar, hasil.total) + (bonus ? 1 : 0));
    return (
      <Reward
        bintang={bintang} bonus={bonus} targetDetik={target || undefined}
        benar={hasil.benar} total={hasil.total} durasiDetik={hasil.durasiDetik}
        onLagi={() => { setHasil(null); setRun(run + 1); }}
        onSelesai={onKeluar}
      />
    );
  }

  const key = `${paket.id}-${run}`;
  let engine: React.ReactNode = <div>Mesin belum didukung.</div>;
  if (paket.mesin === 'tekan-sesuai') engine = <ManaYa key={key} data={paket.butir as DataTekan} onSelesai={selesai} />;
  else if (paket.mesin === 'seret-wadah') engine = <BeresBeres key={key} data={paket.butir as DataSeret} onSelesai={selesai} />;
  else if (paket.mesin === 'cari-pasangan') engine = <CariPasangan key={key} data={paket.butir as DataCocok} onSelesai={selesai} />;
  else if (paket.mesin === 'mewarnai') engine = <MewarnaiGame key={key} data={paket.butir as DataMewarnai} onSelesai={selesai} />;
  else if (paket.mesin === 'dekode') engine = <Dekode key={key} data={paket.butir as DataDekode} onSelesai={selesai} />;
  else if (paket.mesin === 'urutan') engine = <UrutanGame key={key} data={paket.butir as DataUrutan} onSelesai={selesai} />;
  else if (paket.mesin === 'jalur') engine = <JalurGame key={key} data={paket.butir as DataJalur} onSelesai={selesai} />;
  else if (paket.mesin === 'hitung') engine = <HitungGame key={key} data={paket.butir as DataHitung} onSelesai={selesai} />;
  else if (paket.mesin === 'cocokkan') engine = <CocokkanGame key={key} data={paket.butir as DataCocokkan} onSelesai={selesai} />;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ alignSelf: 'center', background: '#fff', borderRadius: 99, padding: '4px 16px', boxShadow: '0 3px 0 #e6def5', fontWeight: 800, color: paket.target_detik && detik > paket.target_detik ? 'var(--abu)' : 'var(--lavender-d)', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>⏱ {jam(detik)}{paket.target_detik ? ` ⚡${jam(paket.target_detik)}` : ''}</div>
      {engine}
    </div>
  );
}
