// src/app/anak/[anakId]/laporan/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { laporanAnak, type BarisHasil } from '@/lib/domain/laporan-anak';

const LABEL: Record<string, string> = { 'kognitif': 'Kognitif', 'motorik-halus': 'Motorik Halus', 'sensorik': 'Sensorik', 'kemandirian': 'Kemandirian' };

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
  const { data: rows } = await supabase.from('hasil_main').select('area_skill,bintang,durasi_detik,selesai').eq('anak_id', anakId);
  const r = laporanAnak((rows ?? []) as unknown as BarisHasil[]);

  const maxArea = Math.max(1, ...Object.values(r.perArea));

  return (
    <main style={{ maxWidth: 440, margin: '20px auto', padding: 16 }}>
      <Link href={`/anak/${anakId}`} style={{ color: 'var(--abu)', fontSize: 13 }}>← kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '8px 0 14px' }}>📊 Perkembangan {anak.nama}</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <Stat b={String(r.totalSesi)} l="Total main" /><Stat b={`⭐${r.totalBintang}`} l="Bintang" /><Stat b={`${r.totalMenit}m`} l="Total waktu" />
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
    </main>
  );
}
