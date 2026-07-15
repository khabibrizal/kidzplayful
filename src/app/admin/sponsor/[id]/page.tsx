// src/app/admin/sponsor/[id]/page.tsx — detail deal sponsor: status, invoice, pembayaran, dokumen
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDeal, STATUS_SPONSOR, LABEL_STATUS } from '@/lib/data/sponsor';
import { setStatusDeal, generateInvoice, catatPembayaran, hapusDeal } from '@/lib/data/sponsor-actions';
import { METODE_BAYAR } from '@/lib/metode';
import { formatRupiah } from '@/lib/format';
import InputRupiah from '@/components/InputRupiah';
import UploadDok from '@/components/UploadDok';
import s from '../../admin.module.css';
import TombolKembali from '@/components/TombolKembali';

function tgl(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default async function DetailDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) notFound();
  const sp = deal.sponsor;
  const uang = deal.jenis === 'uang';
  const st = LABEL_STATUS[deal.status] ?? { teks: deal.status, warna: 'var(--abu)', bg: '#eee' };
  const sudahBayar = deal.status === 'dibayar' || deal.status === 'selesai';

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}>
        <h1>🤝 Detail Deal</h1>
        <TombolKembali fallback="/admin/sponsor" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }} />
      </div>

      {/* Info */}
      <div className={s.card}>
        <div className={s.row}>
          <span style={{ flex: 1 }}><b style={{ fontSize: 16 }}>{sp?.nama_perusahaan ?? '(sponsor terhapus)'}</b>
            <br /><small className={s.muted}>{[sp?.pic, sp?.email, sp?.telepon].filter(Boolean).join(' · ') || '—'}</small></span>
          <span className={s.tag} style={{ background: st.bg, color: st.warna }}>{st.teks}</span>
        </div>
        <div className={s.muted} style={{ marginTop: 8, fontSize: 13 }}>
          Jenis: <b>{uang ? 'Uang (tunai)' : 'Barang (in-kind)'}</b> · Nilai: <b>{formatRupiah(deal.nilai)}</b>
          {deal.nama_event ? ` · Event: ${deal.nama_event}` : ''}
        </div>
        {!uang && deal.deskripsi_barang && <div className={s.muted} style={{ fontSize: 13 }}>Barang: {deal.deskripsi_barang}</div>}
        {deal.benefit && <div className={s.muted} style={{ fontSize: 13 }}>Benefit: {deal.benefit}</div>}
        {(deal.tanggal_mulai || deal.tanggal_selesai) && <div className={s.muted} style={{ fontSize: 13 }}>Periode: {tgl(deal.tanggal_mulai)} – {tgl(deal.tanggal_selesai)}</div>}
        {deal.catatan && <div className={s.muted} style={{ fontSize: 13 }}>Catatan: {deal.catatan}</div>}
      </div>

      {/* Status pipeline */}
      <div className={s.section}>Status</div>
      <form action={setStatusDeal} className={s.card} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="hidden" name="id" value={deal.id} />
        <select className={s.inp} name="status" defaultValue={deal.status} style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
          {STATUS_SPONSOR.map((x) => <option key={x} value={x}>{LABEL_STATUS[x]?.teks ?? x}</option>)}
        </select>
        <button className={s.btnSm} style={{ background: 'var(--lavender-d)', color: '#fff' }}>Ubah status</button>
      </form>

      {/* Invoice (khusus uang) */}
      {uang && (
        <>
          <div className={s.section}>Invoice</div>
          <div className={s.card}>
            {deal.no_invoice ? (
              <div className={s.row} style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ flex: 1 }}><b>{deal.no_invoice}</b><br /><small className={s.muted}>Tgl {tgl(deal.invoice_tanggal)} · Jatuh tempo {tgl(deal.jatuh_tempo)}</small></span>
                <Link href={`/admin/sponsor/${deal.id}/invoice`} className={s.btnSm} style={{ background: 'var(--mint-d)', color: '#fff' }}>🧾 Lihat / Cetak</Link>
              </div>
            ) : deal.status === 'kesepakatan' ? (
              <form action={generateInvoice}>
                <input type="hidden" name="id" value={deal.id} />
                <button className={s.btn}>Generate Invoice (INV-SP-…)</button>
              </form>
            ) : (
              <p className={s.muted} style={{ fontSize: 13, margin: 0 }}>
                Tombol <b>Generate Invoice</b> muncul saat status deal = <b>Kesepakatan</b>. Status sekarang: <b>{st.teks}</b> — ubah status ke &quot;Kesepakatan&quot; di bagian Status di atas dulu.
              </p>
            )}
          </div>
        </>
      )}

      {/* Pembayaran / penerimaan */}
      <div className={s.section}>{uang ? 'Pembayaran' : 'Penerimaan Barang'}</div>
      <div className={s.card}>
        {sudahBayar && (
          <div style={{ marginBottom: 10, fontSize: 13, color: '#1c7a43' }}>
            ✓ {uang ? 'Dibayar' : 'Diterima'} {formatRupiah(deal.bayar_jumlah ?? deal.nilai)} pada {tgl(deal.bayar_tanggal)}{deal.bayar_metode ? ` via ${deal.bayar_metode}` : ''}{deal.bayar_referensi ? ` (ref ${deal.bayar_referensi})` : ''}.
          </div>
        )}
        <form action={catatPembayaran}>
          <input type="hidden" name="id" value={deal.id} />
          <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
            {uang ? (
              <select className={s.inp} name="metode" style={{ flex: 1, minWidth: 130 }} defaultValue="transfer">
                {METODE_BAYAR.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            ) : <input className={s.inp} name="metode" placeholder="Cara penerimaan (mis. diantar)" style={{ flex: 1, minWidth: 130 }} />}
            <input className={s.inp} type="date" name="tanggal" style={{ flex: 1, minWidth: 140 }} />
          </div>
          <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <InputRupiah className={s.inp} name="jumlah" placeholder={uang ? 'Jumlah diterima (Rp)' : 'Nilai barang (Rp)'} style={{ flex: 1, minWidth: 140, marginBottom: 0 }} />
            <input className={s.inp} name="referensi" placeholder="No. referensi (opsional)" style={{ flex: 1, minWidth: 140 }} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className={s.btn} type="submit">{uang ? '✓ Catat Pembayaran' : '✓ Catat Penerimaan'}</button>
            <UploadDok dealId={deal.id} field="bukti_url" label={uang ? 'Bukti bayar' : 'Foto barang'} urlAda={deal.bukti_url} />
          </div>
          {uang && <p className={s.muted} style={{ fontSize: 11, marginTop: 6 }}>Sponsor uang akan otomatis tercatat sebagai pendapatan di Keuangan.</p>}
        </form>
      </div>

      {/* Dokumen */}
      <div className={s.section}>Dokumen</div>
      <div className={s.card} style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <UploadDok dealId={deal.id} field="quotation_url" label="Quotation" urlAda={deal.quotation_url} />
        <UploadDok dealId={deal.id} field="agreement_url" label="Agreement/MoU" urlAda={deal.agreement_url} />
      </div>

      {/* Hapus */}
      <div style={{ marginTop: 16 }}>
        <form action={hapusDeal}>
          <input type="hidden" name="id" value={deal.id} />
          <button className={`${s.btnSm} ${s.danger}`}>Hapus deal ini</button>
        </form>
      </div>
    </div>
  );
}
