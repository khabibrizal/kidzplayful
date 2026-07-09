// src/app/investor/page.tsx — Investor Dashboard (read-only)
import type { Metadata } from 'next';
import { getInvestorTerjamin } from '@/lib/data/investor';
import { getDashboardKeuangan, getPerBulan } from '@/lib/data/keuangan';
import { formatRupiah } from '@/lib/format';
import Logo from '@/components/Logo';

export const metadata: Metadata = { title: 'Investor Dashboard', robots: { index: false, follow: false } };

function K({ b, l, warna }: { b: string; l: string; warna?: string }) {
  return (
    <div className="kp-card" style={{ flex: 1, minWidth: 150, textAlign: 'center', padding: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: warna ?? 'var(--lavender-d)' }}>{b}</div>
      <div style={{ fontSize: 12, color: 'var(--abu)' }}>{l}</div>
    </div>
  );
}

export default async function InvestorPage() {
  await getInvestorTerjamin();
  const [d, perBulan] = await Promise.all([getDashboardKeuangan(), getPerBulan(6)]);
  // runway = saldo / rata-rata pengeluaran 3 bulan terakhir
  const exp3 = perBulan.slice(-3);
  const avgExpense = exp3.length ? exp3.reduce((a, b) => a + b.keluar, 0) / exp3.length : 0;
  const runway = avgExpense > 0 ? (d.saldoKas / avgExpense) : null;

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '18px 20px 50px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <Logo height={38} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>Investor Dashboard · read-only</span>
      </header>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 'clamp(22px,4vw,30px)', marginBottom: 14 }}>Ringkasan Bisnis KidzPlayful</h1>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <K b={formatRupiah(d.revenueBulanIni)} l="Revenue bulan ini" />
        <K b={formatRupiah(d.mrr)} l="MRR" />
        <K b={d.growthPersen === null ? '—' : `${d.growthPersen > 0 ? '+' : ''}${d.growthPersen}%`} l="Growth MoM" warna={(d.growthPersen ?? 0) >= 0 ? '#1c7a43' : '#c0392b'} />
        <K b={formatRupiah(d.netProfitBulanIni)} l="Net profit bulan ini" warna={d.netProfitBulanIni >= 0 ? '#1c7a43' : '#c0392b'} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        <K b={formatRupiah(d.saldoKas)} l="Saldo kas" warna={d.saldoKas >= 0 ? '#1c7a43' : '#c0392b'} />
        <K b={String(d.activeMember)} l="Member aktif" />
        <K b={String(d.eventBulanIni)} l="Event bulan ini" />
        <K b={String(d.storeOrderBulanIni)} l="Store order bulan ini" />
        <K b={runway === null ? '—' : `${runway.toFixed(1)} bln`} l="Runway (estimasi)" />
      </div>

      <h2 style={{ color: 'var(--lavender-d)', fontSize: 18, margin: '22px 0 10px' }}>Tren 6 Bulan</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420, fontSize: 14 }}>
          <thead><tr style={{ textAlign: 'left', color: 'var(--abu)', fontSize: 12 }}><th style={{ padding: 8 }}>Bulan</th><th style={{ padding: 8, textAlign: 'right' }}>Revenue</th><th style={{ padding: 8, textAlign: 'right' }}>Expense</th><th style={{ padding: 8, textAlign: 'right' }}>Net</th></tr></thead>
          <tbody>
            {perBulan.map((b) => (
              <tr key={b.ym} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{b.label}</td>
                <td style={{ padding: 8, textAlign: 'right', color: '#1c7a43' }}>{formatRupiah(b.masuk)}</td>
                <td style={{ padding: 8, textAlign: 'right', color: '#c0392b' }}>{formatRupiah(b.keluar)}</td>
                <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>{formatRupiah(b.masuk - b.keluar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: 'var(--abu)', fontSize: 11, marginTop: 14 }}>Data real-time dari sistem. Untuk PDF, gunakan Cetak browser.</p>
    </main>
  );
}
