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
  // agregasi hasil_main dihitung di DB via RPC (tak menarik semua baris ke app)
  const [{ data: lang }, { data: eng }] = await Promise.all([
    supabase.from('langganan').select('trial_mulai,aktif_sampai,nominal'),
    supabase.rpc('laporan_engagement'),
  ]);

  const r = ringkasanLangganan((lang ?? []) as unknown as BarisLangganan[], new Date());

  const e = (eng ?? {}) as { total_sesi?: number; total_detik?: number; mesin_populer?: string | null; tema_populer?: string | null };
  const totalSesi = e.total_sesi ?? 0;
  const rataMenit = totalSesi ? Math.round(((e.total_detik ?? 0) / totalSesi / 60) * 10) / 10 : 0;
  const mesinPopuler = e.mesin_populer ?? '-';
  const temaPopuler = e.tema_populer ?? '-';

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
