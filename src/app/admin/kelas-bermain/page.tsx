// src/app/admin/kelas-bermain/page.tsx
import { getKelasSemua } from '@/lib/data/kelas-bermain';
import { getProdukSemua } from '@/lib/data/admin-store';
import { getFokusAreaAktif } from '@/lib/data/fokus-area';
import KelasAdmin from './KelasAdmin';
import s from '../admin.module.css';

export default async function AdminKelasBermain() {
  const [list, produk, area] = await Promise.all([getKelasSemua(), getProdukSemua(), getFokusAreaAktif()]);
  const produkOpsi = produk.map((p) => ({ id: p.id, nama: p.nama }));
  const areaOpsi = area.map((a) => ({ key: a.key, label: a.label }));
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🎈 Ide Bermain</h1></div>
      <KelasAdmin awal={list} produkOpsi={produkOpsi} areaOpsi={areaOpsi} />
    </div>
  );
}
