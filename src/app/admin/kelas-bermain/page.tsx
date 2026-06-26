// src/app/admin/kelas-bermain/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import s from '../admin.module.css';

export default async function KelasBermainHome() {
  const supabase = await createClient();
  const { data: tema } = await supabase
    .from('tema')
    .select('id,nama,sampul,is_minggu_ini')
    .eq('status', 'disetujui')
    .order('is_minggu_ini', { ascending: false })
    .order('created_at');

  return (
    <div>
      <Link href="/admin" className={s.muted}>← dashboard</Link>
      <div className={s.section} style={{ marginTop: 8 }}>🎈 Kelas Bermain</div>
      {(tema ?? []).map((t) => (
        <div key={t.id} className={s.card}>
          <div className={s.row}>
            <span style={{ fontSize: 26 }}>{t.sampul}</span>
            <span style={{ flex: 1, fontWeight: 700, color: 'var(--tinta)' }}>{t.nama}</span>
            {t.is_minggu_ini && <span className={`${s.tag} ${s.tagNow}`}>Minggu Ini</span>}
            <Link href={`/admin/kelas-bermain/${t.id}`} className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>Kelola materi</Link>
          </div>
        </div>
      ))}
      {(tema ?? []).length === 0 && <p className={s.muted}>Belum ada tema disetujui.</p>}
    </div>
  );
}
