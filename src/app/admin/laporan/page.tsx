// src/app/admin/laporan/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ringkasanLangganan, type BarisLangganan } from '@/lib/domain/laporan';
import s from '../admin.module.css';

function rupiah(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }

function Stat({ b, l }: { b: string; l: string }) {
  return (
    <div className={s.card} style={{ flex: 1, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800 }}>{b}</div><div className={s.muted}>{l}</div></div>
  );
}

export default async function Laporan() {
  const supabase = await createClient();
  const [{ data: lang }, { data: hasil }, { data: tema }] = await Promise.all([
    supabase.from('langganan').select('trial_mulai,aktif_sampai,nominal'),
    supabase.from('hasil_main').select('mesin,durasi_detik,tema_id'),
    supabase.from('tema').select('id,nama'),
  ]);

  const r = ringkasanLangganan((lang ?? []) as unknown as BarisLangganan[], new Date());

  const rows = hasil ?? [];
  const totalSesi = rows.length;
  const rataMenit = totalSesi ? Math.round((rows.reduce((a, x) => a + (x.durasi_detik || 0), 0) / totalSesi / 60) * 10) / 10 : 0;
  const hitung = <T extends string>(arr: (T | null)[]) => {
    const m = new Map<string, number>();
    for (const v of arr) if (v) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
  };
  const mesinPopuler = hitung(rows.map((x) => x.mesin as string));
  const temaMap = new Map((tema ?? []).map((t) => [t.id, t.nama]));
  const temaPopulerId = hitung(rows.map((x) => x.tema_id as string | null));
  const temaPopuler = temaMap.get(temaPopulerId) ?? '-';

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>📊 Laporan Member</h1><Link href="/admin/langganan" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>💳 Kelola</Link></div>

      <div className={s.section}>Ringkasan Langganan & Pendapatan</div>
      <div className={s.row}><Stat b={String(r.aktif)} l="Aktif" /><Stat b={String(r.trial)} l="Trial" /><Stat b={String(r.kadaluarsa)} l="Kadaluarsa" /><Stat b={rupiah(r.mrr)} l="Estimasi MRR" /></div>

      <div className={s.section}>Keterlibatan</div>
      <div className={s.row}><Stat b={`${rataMenit} mnt`} l="Rata main/sesi" /><Stat b={String(totalSesi)} l="Total sesi main" /><Stat b={temaPopuler} l="Tema populer" /><Stat b={mesinPopuler} l="Game populer" /></div>
    </div>
  );
}
