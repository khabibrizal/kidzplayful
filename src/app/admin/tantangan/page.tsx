// src/app/admin/tantangan/page.tsx — stok tantangan kustom (admin)
import { getTantanganAdmin, getOpsiTantangan } from '@/lib/data/tantangan-kustom';
import { LENCANA } from '@/lib/domain/gamifikasi';
import TantanganForm from './TantanganForm';
import TantanganList from './TantanganList';
import s from '../admin.module.css';

export default async function AdminTantanganPage() {
  const [list, opsi] = await Promise.all([getTantanganAdmin(), getOpsiTantangan()]);
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🏆 Stok Tantangan</h1></div>
      <p className={s.muted}>Buat misi kustom: pilih syarat game + skor, tentukan hadiah lencana, aktif/nonaktifkan. Berjalan berdampingan dengan tantangan harian &amp; lencana otomatis.</p>

      <div className={s.section}>Buat Tantangan Baru</div>
      <TantanganForm opsi={opsi} lencana={LENCANA} />

      <div className={s.section}>Tantangan ({list.length})</div>
      <TantanganList list={list} opsi={opsi} lencana={LENCANA} />
    </div>
  );
}
