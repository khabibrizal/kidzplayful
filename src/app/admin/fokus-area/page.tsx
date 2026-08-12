// src/app/admin/fokus-area/page.tsx — master data Fokus Area Perkembangan
import { getFokusAreaSemua } from '@/lib/data/fokus-area';
import FokusAreaAdmin from './FokusAreaAdmin';
import s from '../admin.module.css';

export default async function AdminFokusAreaPage() {
  const list = await getFokusAreaSemua();
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🧩 Master Fokus Area Perkembangan</h1></div>
      <p className={s.muted} style={{ fontSize: 13, marginBottom: 10 }}>
        Daftar area ini tampil sebagai <b>pilihan chips</b> saat tambah/edit Ide Bermain, dan label-nya tampil di halaman user.
        Nonaktifkan area agar tak muncul di form (tanpa menghapus data kelas lama). <b>Key</b> tersimpan di kelas & tidak berubah saat label diedit.
      </p>
      <FokusAreaAdmin awal={list} />
    </div>
  );
}
