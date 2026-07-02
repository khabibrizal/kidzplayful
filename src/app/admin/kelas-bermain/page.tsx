// src/app/admin/kelas-bermain/page.tsx
import { getKelasSemua } from '@/lib/data/kelas-bermain';
import { getProdukSemua } from '@/lib/data/admin-store';
import KelasAdmin from './KelasAdmin';
import s from '../admin.module.css';

export default async function AdminKelasBermain() {
  const list = await getKelasSemua();
  const produk = await getProdukSemua();
  const produkOpsi = produk.map((p) => ({ id: p.id, nama: p.nama }));
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🎈 Kelas Bermain</h1></div>
      <KelasAdmin awal={list} produkOpsi={produkOpsi} />
    </div>
  );
}
