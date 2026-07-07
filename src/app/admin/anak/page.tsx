// src/app/admin/anak/page.tsx — panel gamifikasi anak (admin)
import { getAnakUntukAdmin } from '@/lib/data/admin-anak';
import { LENCANA } from '@/lib/domain/gamifikasi';
import AnakGamiForm from './AnakGamiForm';
import s from '../admin.module.css';

export default async function AdminAnakPage() {
  const list = await getAnakUntukAdmin();
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🧒 Anak & Gamifikasi</h1></div>
      <p className={s.muted}>Atur streak, koin, dan lencana tiap anak. Streak & lencana biasanya otomatis dari aktivitas main — ubah di sini untuk koreksi atau apresiasi.</p>
      {list.map((a) => <AnakGamiForm key={a.id} anak={a} lencanaSemua={LENCANA} />)}
      {list.length === 0 && <p className={s.muted}>Belum ada anak.</p>}
    </div>
  );
}
