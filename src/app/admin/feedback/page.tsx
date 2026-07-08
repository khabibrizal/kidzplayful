// src/app/admin/feedback/page.tsx — survei masukan dari orang tua (admin)
import { getFeedbackAdmin } from '@/lib/data/feedback';
import { labelFiturFeedback } from '@/lib/feedback-tipe';
import s from '../admin.module.css';

function tglJam(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
}

function Baris({ q, children }: { q: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === '' ) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--abu)' }}>{q}</div>
      <div style={{ fontSize: 14, color: 'var(--tinta)', whiteSpace: 'pre-wrap' }}>{children}</div>
    </div>
  );
}

export default async function AdminFeedbackPage() {
  const list = await getFeedbackAdmin();

  // ringkasan cepat
  const nps = list.map((f) => f.jawaban.nps).filter((n): n is number => typeof n === 'number');
  const rataNps = nps.length ? (nps.reduce((a, b) => a + b, 0) / nps.length).toFixed(1) : '—';

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>⭐ Masukan</h1></div>
      <p className={s.muted}>Survei masukan aplikasi dari orang tua (terbaru di atas). Total: {list.length} · Rata-rata rekomendasi (NPS 1–10): <b>{rataNps}</b></p>
      {list.length === 0 && <p className={s.muted}>Belum ada masukan.</p>}
      {list.map((f) => {
        const j = f.jawaban;
        const fitur = j.fitur === 'lainnya' ? `Lainnya: ${j.fiturLain || '-'}` : (j.fitur ? labelFiturFeedback(j.fitur) : '');
        return (
          <div key={f.id} className={s.card}>
            <div className={s.row}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><b>{f.email ?? '—'}</b></span>
              <span className={s.muted}>{tglJam(f.dibuat_at)}</span>
            </div>
            <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {typeof j.nps === 'number' && <span className={s.tag} style={{ background: '#dff5e6', color: '#1c7a43' }}>Rekomendasi {j.nps}/10</span>}
              {j.bersedia && <span className={s.tag} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>Bersedia: {j.bersedia}</span>}
              {j.harga && <span className={s.tag} style={{ background: '#fff3d6', color: '#b88600' }}>Harga: {j.harga}</span>}
            </div>
            <Baris q="1. KidzPlayful itu apa">{j.apa}</Baris>
            <Baris q="2. Fitur paling menarik">{fitur}</Baris>
            <Baris q="3. Bagian membingungkan/sulit">{j.bingung}</Baris>
            <Baris q="4. Yang masih kurang">{j.kurang}</Baris>
            <Baris q="8. Satu saran utama">{j.saran}</Baris>
          </div>
        );
      })}
    </div>
  );
}
