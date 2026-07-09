// src/app/admin/keuangan/pajak/page.tsx — omzet per bulan + estimasi PPh final 0,5% (info)
import { getPerBulan } from '@/lib/data/keuangan';
import { formatRupiah } from '@/lib/format';
import KeuanganNav from '../KeuanganNav';
import s from '../../admin.module.css';

export default async function PajakPage() {
  const perBulan = await getPerBulan(12);
  const totalOmzet = perBulan.reduce((a, b) => a + b.masuk, 0);

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🧾 Pajak / Omzet</h1></div>
      <KeuanganNav />
      <p className={s.muted}>Ringkasan omzet (pendapatan bruto) per bulan + estimasi PPh Final UMKM 0,5% (PP 55/2022) sebagai referensi. Belum otomatis dilaporkan — untuk perhitungan awal.</p>

      <div className={s.section}>Omzet 12 bulan · total {formatRupiah(totalOmzet)}</div>
      {perBulan.map((b) => (
        <div key={b.ym} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
          <span><b>{b.label}</b><br /><small className={s.muted}>Estimasi pajak 0,5%: {formatRupiah(Math.round(b.masuk * 0.005))}</small></span>
          <b style={{ color: 'var(--lavender-d)' }}>{formatRupiah(b.masuk)}</b>
        </div>
      ))}
      <p className={s.muted} style={{ fontSize: 11, marginTop: 10 }}>Catatan: tarif & kewajiban pajak dapat berbeda sesuai status usaha. Konsultasikan dengan konsultan pajak untuk pelaporan resmi.</p>
    </div>
  );
}
