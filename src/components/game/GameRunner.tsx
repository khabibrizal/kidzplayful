// src/components/game/GameRunner.tsx
'use client';
import { useState } from 'react';
import type { Paket, HasilSelesai, DataTekan, DataSeret, DataCocok, DataMewarnai, DataDekode } from '@/lib/game/tipe';
import ManaYa from './ManaYa';
import BeresBeres from './BeresBeres';
import CariPasangan from './CariPasangan';
import MewarnaiGame from './MewarnaiGame';
import Dekode from './Dekode';
import Reward from './Reward';
import { catatHasil } from '@/lib/data/skor';
import { hitungBintang } from '@/lib/domain/skor';

export default function GameRunner({
  paket, anakId, temaId, onKeluar, onKoin,
}: { paket: Paket; anakId: string; temaId: string; onKeluar: () => void; onKoin: (k: number) => void }) {
  const [run, setRun] = useState(0);              // remount engine untuk "main lagi"
  const [hasil, setHasil] = useState<HasilSelesai | null>(null);

  async function selesai(h: HasilSelesai) {
    setHasil(h);
    try {
      const r = await catatHasil({
        anakId, temaId, mesin: paket.mesin, areaSkill: paket.area_skill,
        benar: h.benar, total: h.total, durasiDetik: h.durasiDetik,
      });
      onKoin(r.koin);
    } catch { /* offline/Tahap berikut: antrikan; untuk M2 abaikan diam */ }
  }

  if (hasil) {
    return (
      <Reward
        bintang={hitungBintang(hasil.benar, hasil.total)}
        benar={hasil.benar} total={hasil.total}
        onLagi={() => { setHasil(null); setRun(run + 1); }}
        onSelesai={onKeluar}
      />
    );
  }

  const key = `${paket.id}-${run}`;
  if (paket.mesin === 'tekan-sesuai') return <ManaYa key={key} data={paket.butir as DataTekan} onSelesai={selesai} />;
  if (paket.mesin === 'seret-wadah') return <BeresBeres key={key} data={paket.butir as DataSeret} onSelesai={selesai} />;
  if (paket.mesin === 'cari-pasangan') return <CariPasangan key={key} data={paket.butir as DataCocok} onSelesai={selesai} />;
  if (paket.mesin === 'mewarnai') return <MewarnaiGame key={key} data={paket.butir as DataMewarnai} onSelesai={selesai} />;
  if (paket.mesin === 'dekode') return <Dekode key={key} data={paket.butir as DataDekode} onSelesai={selesai} />;
  return <div>Mesin belum didukung.</div>;
}
