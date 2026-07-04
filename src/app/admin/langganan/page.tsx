// src/app/admin/langganan/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan } from '@/lib/domain/trial';
import { getPengaturanBayar } from '@/lib/data/pengaturan-bayar';
import AktifkanForm from './AktifkanForm';
import s from '../admin.module.css';

type Row = {
  id: string; email: string;
  anak: { nama: string }[];
  langganan: { status: string; nominal: number; trial_mulai: string; aktif_sampai: string | null } | null;
};

export default async function Langganan() {
  const supabase = await createClient();
  const [{ data }, bayar] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,email,anak(nama),langganan(status,nominal,trial_mulai,aktif_sampai)')
      .order('created_at', { ascending: false }),
    getPengaturanBayar(),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const now = new Date();

  function statusEfektif(l: Row['langganan']) {
    if (!l) return 'kadaluarsa';
    return statusLangganan(
      { trialMulai: new Date(l.trial_mulai + 'T00:00:00Z'), aktifSampai: l.aktif_sampai ? new Date(l.aktif_sampai + 'T00:00:00Z') : null },
      now,
    );
  }
  const warna: Record<string, string> = { aktif: s.tagOk, trial: s.tagDraf, tenggang: s.tagDraf, kadaluarsa: s.danger };

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>💳 Kelola Langganan</h1><Link href="/admin/laporan" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>📊 Laporan</Link></div>
      <p className={s.muted}>Setelah member transfer/QRIS, klik Aktifkan (langganan +1 bulan).</p>

      {rows.map((m) => {
        const st = statusEfektif(m.langganan);
        return (
          <div key={m.id} className={s.card}>
            <div className={s.row}>
              <span style={{ flex: 1 }}><b>{m.email}</b><br /><span className={s.muted}>{m.anak.map((a) => a.nama).join(', ') || 'belum ada anak'}</span></span>
              <span className={`${s.tag} ${warna[st] ?? ''}`}>{st}</span>
            </div>
            {st !== 'aktif' && <div style={{ marginTop: 8 }}><AktifkanForm ortuId={m.id} nominalDefault={String(bayar.harga_langganan_nominal)} /></div>}
          </div>
        );
      })}
      {rows.length === 0 && <p className={s.muted}>Belum ada member.</p>}
    </div>
  );
}
