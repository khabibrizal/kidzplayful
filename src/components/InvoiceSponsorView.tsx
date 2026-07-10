// src/components/InvoiceSponsorView.tsx — tampilan invoice sponsor (kop ber-logo KidzPlayful)
import Logo from '@/components/Logo';
import { PROFIL } from '@/lib/profil';
import { formatRupiah } from '@/lib/format';
import type { Deal } from '@/lib/data/sponsor';

function tgl(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function InvoiceSponsorView({ deal }: { deal: Deal }) {
  const sp = deal.sponsor;
  const barang = deal.jenis === 'barang';
  const judul = barang ? 'TANDA TERIMA SPONSOR (BARANG)' : 'INVOICE SPONSORSHIP';
  const lunas = deal.status === 'dibayar' || deal.status === 'selesai';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', color: '#222', padding: 28, fontSize: 14 }}>
      {/* Kop */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, borderBottom: '2px solid #efe7fb', paddingBottom: 16 }}>
        <div>
          <Logo height={44} />
          <div style={{ fontSize: 12, color: '#6f6685', marginTop: 8, lineHeight: 1.5 }}>
            {PROFIL.nama}<br />{PROFIL.kota}, {PROFIL.provinsi}<br />{PROFIL.waTampil} · {PROFIL.situs}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--lavender-d, #5a2ca0)' }}>{judul}</div>
          <div style={{ fontSize: 13, marginTop: 6 }}><b>{deal.no_invoice ?? '(belum ada nomor)'}</b></div>
          <div style={{ fontSize: 12, color: '#6f6685', marginTop: 4 }}>Tanggal: {tgl(deal.invoice_tanggal)}</div>
          {!barang && <div style={{ fontSize: 12, color: '#6f6685' }}>Jatuh tempo: {tgl(deal.jatuh_tempo)}</div>}
          <div style={{ marginTop: 6, display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99, background: lunas ? '#e6f7ee' : '#fdf3d7', color: lunas ? '#1c7a43' : '#8a6d1f' }}>
            {lunas ? (barang ? 'DITERIMA' : 'LUNAS') : 'BELUM DIBAYAR'}
          </div>
        </div>
      </div>

      {/* Ditagihkan kepada */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8b8397', textTransform: 'uppercase' }}>Kepada</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{sp?.nama_perusahaan ?? '—'}</div>
        <div style={{ fontSize: 12, color: '#6f6685', lineHeight: 1.5 }}>
          {sp?.pic && <>u.p. {sp.pic}<br /></>}
          {sp?.alamat && <>{sp.alamat}<br /></>}
          {[sp?.email, sp?.telepon].filter(Boolean).join(' · ')}
          {sp?.npwp && <><br />NPWP: {sp.npwp}</>}
        </div>
      </div>

      {/* Rincian */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18, fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f6f2ff', textAlign: 'left' }}>
            <th style={{ padding: '8px 10px' }}>Deskripsi</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{barang ? 'Nilai estimasi' : 'Jumlah'}</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '10px' }}>
              <b>Sponsorship{deal.nama_event ? ` — ${deal.nama_event}` : ''}</b>
              {barang && deal.deskripsi_barang && <div style={{ fontSize: 12, color: '#6f6685', marginTop: 2 }}>Barang: {deal.deskripsi_barang}</div>}
              {deal.benefit && <div style={{ fontSize: 12, color: '#6f6685', marginTop: 2 }}>Benefit: {deal.benefit}</div>}
              {(deal.tanggal_mulai || deal.tanggal_selesai) && <div style={{ fontSize: 12, color: '#6f6685', marginTop: 2 }}>Periode: {tgl(deal.tanggal_mulai)} – {tgl(deal.tanggal_selesai)}</div>}
            </td>
            <td style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatRupiah(deal.nilai)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800 }}>Total</td>
            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, fontSize: 16, color: 'var(--lavender-d, #5a2ca0)' }}>{formatRupiah(deal.nilai)}</td>
          </tr>
        </tfoot>
      </table>

      {!barang && !lunas && (
        <div style={{ marginTop: 16, fontSize: 12, color: '#6f6685' }}>
          Mohon lakukan pembayaran sebelum jatuh tempo. Konfirmasi pembayaran ke {PROFIL.waTampil}.
        </div>
      )}
      {lunas && deal.bayar_tanggal && (
        <div style={{ marginTop: 16, fontSize: 12, color: '#1c7a43' }}>
          ✓ {barang ? 'Barang diterima' : 'Dibayar'} pada {tgl(deal.bayar_tanggal)}{deal.bayar_metode ? ` via ${deal.bayar_metode}` : ''}{deal.bayar_referensi ? ` (ref: ${deal.bayar_referensi})` : ''}.
        </div>
      )}

      <div style={{ marginTop: 28, fontSize: 11, color: '#9a92a8', borderTop: '1px solid #eee', paddingTop: 10, textAlign: 'center' }}>
        Terima kasih atas dukungan Anda untuk KidzPlayful 🌿
      </div>
    </div>
  );
}
