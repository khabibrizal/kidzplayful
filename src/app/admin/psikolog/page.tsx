// src/app/admin/psikolog/page.tsx
import { getDaftarPsikolog } from '@/lib/data/admin-psikolog';
import PsikologAdmin from './PsikologAdmin';
import s from '../admin.module.css';

export default async function AdminPsikologPage() {
  const psikolog = await getDaftarPsikolog();
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🧠 Kelola Psikolog</h1></div>
      <p className={s.muted} style={{ marginBottom: 10 }}>Psikolog harus <b>daftar dulu</b> di halaman Daftar, lalu aktifkan di sini dengan emailnya. Setelah aktif, ia bisa mengatur jadwal & menjawab konsultasi di area Psikolog.</p>
      <PsikologAdmin awal={psikolog} />
    </div>
  );
}
