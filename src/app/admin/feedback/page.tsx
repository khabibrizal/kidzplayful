// src/app/admin/feedback/page.tsx — masukan/feedback dari orang tua (admin)
import { getFeedbackAdmin } from '@/lib/data/feedback';
import s from '../admin.module.css';

function tglJam(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
}

export default async function AdminFeedbackPage() {
  const list = await getFeedbackAdmin();
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>⭐ Masukan</h1></div>
      <p className={s.muted}>Masukan/feedback aplikasi dari orang tua (terbaru di atas).</p>
      {list.length === 0 && <p className={s.muted}>Belum ada masukan.</p>}
      {list.map((f) => (
        <div key={f.id} className={s.card}>
          <div className={s.row}>
            <span style={{ flex: 1 }}>{f.rating ? '⭐'.repeat(f.rating) : <span className={s.muted}>tanpa rating</span>}</span>
            <span className={s.muted}>{tglJam(f.dibuat_at)}</span>
          </div>
          <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', color: 'var(--tinta)' }}>{f.pesan}</p>
          <div className={s.muted} style={{ marginTop: 6 }}>{f.email ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}
