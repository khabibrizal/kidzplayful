// src/app/admin/kategori-usia/page.tsx — master data Kategori Usia
import { getKategoriUsiaSemua } from '@/lib/data/kategori-usia';
import KategoriUsiaAdmin from './KategoriUsiaAdmin';
import s from '../admin.module.css';

export default async function AdminKategoriUsiaPage() {
  const list = await getKategoriUsiaSemua();
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>👶 Master Kategori Usia</h1></div>
      <p className={s.muted} style={{ fontSize: 13, marginBottom: 10 }}>
        Kategori ini tampil sebagai <b>dropdown</b> saat tambah/edit Game. Game dikelompokkan berdasarkan kategori,
        dan rentang usianya dipakai untuk menyaring game sesuai umur anak. Nonaktifkan agar tak muncul di form (tanpa mengubah game lama).
      </p>
      <KategoriUsiaAdmin awal={list} />
    </div>
  );
}
