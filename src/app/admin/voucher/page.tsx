// src/app/admin/voucher/page.tsx
import { getVoucherSemua } from '@/lib/data/voucher';
import VoucherAdmin from './VoucherAdmin';
import s from '../admin.module.css';

export default async function AdminVoucherPage() {
  const list = await getVoucherSemua();
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🎟️ Voucher</h1></div>
      <p className={s.muted} style={{ fontSize: 13, marginBottom: 10 }}>Kode voucher untuk potongan saat pendaftaran event / beli produk. Kuota total & per user, masa berlaku.</p>
      <VoucherAdmin awal={list} />
    </div>
  );
}
