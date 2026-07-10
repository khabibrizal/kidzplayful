// src/app/admin/keuangan/transaksi/[id]/page.tsx — detail satu transaksi ledger
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTransaksiDetail, LABEL_KATEGORI } from '@/lib/data/keuangan';
import { labelMetode } from '@/lib/metode';
import { formatRupiah } from '@/lib/format';
import s from '../../../admin.module.css';

function tgl(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
}
function tglHari(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function Baris({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #f0f0f5' }}>
      <span style={{ width: 130, flexShrink: 0, color: 'var(--abu)', fontSize: 13 }}>{k}</span>
      <span style={{ flex: 1, fontSize: 14, wordBreak: 'break-word' }}>{v}</span>
    </div>
  );
}

export default async function DetailTransaksi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getTransaksiDetail(id);
  if (!d) notFound();
  const t = d.trx;
  const warna = t.arah === 'masuk' ? '#1c7a43' : '#c0392b';

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}>
        <h1>🔎 Detail Transaksi</h1>
        <Link href="/admin/keuangan/transaksi" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>← Kembali</Link>
      </div>

      {/* Ringkasan ledger */}
      <div className={s.card}>
        <div style={{ fontSize: 22, fontWeight: 800, color: warna }}>{t.arah === 'masuk' ? '+' : '−'}{formatRupiah(t.jumlah)}</div>
        <div className={s.muted} style={{ marginBottom: 8 }}>{t.arah === 'masuk' ? 'Kas masuk' : 'Kas keluar'} · {LABEL_KATEGORI[t.kategori] ?? t.kategori}</div>
        <Baris k="Tanggal" v={tglHari(t.tanggal)} />
        <Baris k="Kategori" v={LABEL_KATEGORI[t.kategori] ?? t.kategori} />
        {t.metode && <Baris k="Metode" v={labelMetode(t.metode)} />}
        {t.keterangan && <Baris k="Keterangan" v={t.keterangan} />}
        {t.lampiran_url && <Baris k="Lampiran" v={<a href={t.lampiran_url} target="_blank" style={{ color: 'var(--biru-d)' }}>🧾 Lihat nota</a>} />}
        <Baris k="Dicatat" v={tgl(t.created_at)} />
      </div>

      {/* Pembeli / member */}
      {d.pembeli && (
        <>
          <div className={s.section}>{d.jenis === 'langganan' ? 'Member' : 'Pembeli'}</div>
          <div className={s.card}>
            <Baris k="Nama" v={d.pembeli.nama?.trim() || '—'} />
            <Baris k="Email" v={d.pembeli.email || '—'} />
            {d.pembeli.no_wa && <Baris k="No. WA" v={d.pembeli.no_wa} />}
          </div>
        </>
      )}

      {/* Detail STORE */}
      {d.pesanan && (
        <>
          <div className={s.section}>Pesanan Store</div>
          <div className={s.card}>
            {d.pesanan.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f5', fontSize: 14 }}>
                <span>{it.nama} <span className={s.muted}>× {it.qty}</span></span>
                <span style={{ fontWeight: 700 }}>{formatRupiah(it.harga * it.qty)}</span>
              </div>
            ))}
            {d.pesanan.items.length === 0 && <p className={s.muted}>Tidak ada item.</p>}
            <div style={{ marginTop: 8 }}>
              <Baris k="Subtotal" v={formatRupiah(d.pesanan.subtotal)} />
              <Baris k="Ongkir" v={formatRupiah(d.pesanan.ongkir) + ' (bukan pendapatan)'} />
              <Baris k="Total bayar" v={<b>{formatRupiah(d.pesanan.total)}</b>} />
              <Baris k="Status" v={d.pesanan.status} />
              <Baris k="Penerima" v={d.pesanan.penerima || '—'} />
              <Baris k="No. HP" v={d.pesanan.no_hp || '—'} />
              <Baris k="Alamat" v={d.pesanan.alamat || '—'} />
              {d.pesanan.no_resi && <Baris k="No. Resi" v={d.pesanan.no_resi} />}
              {d.pesanan.catatan && <Baris k="Catatan" v={d.pesanan.catatan} />}
              {d.pesanan.bukti_url && <Baris k="Bukti bayar" v={<a href={d.pesanan.bukti_url} target="_blank" style={{ color: 'var(--biru-d)' }}>🧾 Lihat bukti</a>} />}
              <Baris k="Dipesan" v={tgl(d.pesanan.created_at)} />
            </div>
            <Link href="/admin/store" className={s.btnSm} style={{ marginTop: 10, display: 'inline-block', background: '#efe7fb', color: 'var(--lavender-d)' }}>Buka di Kelola Store →</Link>
          </div>
        </>
      )}

      {/* Detail EVENT */}
      {d.event && (
        <>
          <div className={s.section}>Pendaftaran Event</div>
          <div className={s.card}>
            <Baris k="Event" v={<b>{d.event.judul}</b>} />
            <Baris k="Jadwal" v={tglHari(d.event.tanggal)} />
            {d.event.lokasi && <Baris k="Lokasi" v={d.event.lokasi} />}
            <Baris k="Anak" v={d.event.anak.join(', ') || '—'} />
            <Baris k="Jumlah anak" v={String(d.event.jumlah_anak)} />
            <Baris k="Total bayar" v={<b>{formatRupiah(d.event.total)}</b>} />
            <Baris k="Status" v={d.event.status} />
            {d.event.bukti_url && <Baris k="Bukti bayar" v={<a href={d.event.bukti_url} target="_blank" style={{ color: 'var(--biru-d)' }}>🧾 Lihat bukti</a>} />}
            <Baris k="Didaftar" v={tgl(d.event.created_at)} />
            <Link href="/admin/event" className={s.btnSm} style={{ marginTop: 10, display: 'inline-block', background: '#efe7fb', color: 'var(--lavender-d)' }}>Buka di Kelola Event →</Link>
          </div>
        </>
      )}

      {/* Detail LANGGANAN — riwayat pembayaran member */}
      {d.jenis === 'langganan' && (
        <>
          <div className={s.section}>Riwayat Pembayaran Langganan</div>
          {(!d.langganan || d.langganan.length === 0) && <p className={s.muted}>Belum ada riwayat pembayaran tercatat.</p>}
          {d.langganan?.map((b, i) => (
            <div key={i} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
              <span>
                <b style={{ color: '#1c7a43' }}>{formatRupiah(b.nominal)}</b>
                <br /><small className={s.muted}>{tgl(b.dibayar_pada)}{b.metode ? ` · ${labelMetode(b.metode)}` : ''}</small>
                {(b.periode_mulai || b.periode_sampai) && <><br /><small className={s.muted}>Periode: {tglHari(b.periode_mulai)} – {tglHari(b.periode_sampai)}</small></>}
              </span>
            </div>
          ))}
          <Link href="/admin/langganan" className={s.btnSm} style={{ marginTop: 10, display: 'inline-block', background: '#efe7fb', color: 'var(--lavender-d)' }}>Buka di Kelola Langganan →</Link>
        </>
      )}

      {/* Detail ASET */}
      {d.jenis === 'aset' && d.aset && (
        <>
          <div className={s.section}>Aset</div>
          <div className={s.card}>
            <Baris k="Nama" v={<b>{d.aset.nama}</b>} />
            {d.aset.kategori && <Baris k="Kategori" v={d.aset.kategori} />}
            <Baris k="Harga beli" v={formatRupiah(d.aset.harga_beli)} />
            {d.aset.tanggal_beli && <Baris k="Tgl beli" v={tglHari(d.aset.tanggal_beli)} />}
            {d.aset.lokasi && <Baris k="Lokasi" v={d.aset.lokasi} />}
            {d.aset.catatan && <Baris k="Catatan" v={d.aset.catatan} />}
            {d.aset.invoice_url && <Baris k="Nota" v={<a href={d.aset.invoice_url} target="_blank" style={{ color: 'var(--biru-d)' }}>🧾 Lihat nota</a>} />}
            <Link href="/admin/keuangan/aset" className={s.btnSm} style={{ marginTop: 10, display: 'inline-block', background: '#efe7fb', color: 'var(--lavender-d)' }}>Buka di Aset →</Link>
          </div>
        </>
      )}

      {/* Detail SPONSORSHIP */}
      {d.jenis === 'sponsorship' && d.sponsorship && (
        <>
          <div className={s.section}>Sponsor</div>
          <div className={s.card}>
            <Baris k="Sponsor" v={<b>{d.sponsorship.sponsor ?? '(sponsor terhapus)'}</b>} />
            {d.sponsorship.pic && <Baris k="PIC" v={d.sponsorship.pic} />}
            {d.sponsorship.nama_event && <Baris k="Event" v={d.sponsorship.nama_event} />}
            <Baris k="Jenis" v={d.sponsorship.jenis === 'barang' ? 'Barang (in-kind)' : 'Uang'} />
            <Baris k="Nilai" v={<b>{formatRupiah(d.sponsorship.nilai)}</b>} />
            {d.sponsorship.no_invoice && <Baris k="No. Invoice" v={d.sponsorship.no_invoice} />}
            <Baris k="Status" v={d.sponsorship.status} />
            <Link href={`/admin/sponsor/${d.sponsorship.id}`} className={s.btnSm} style={{ marginTop: 10, display: 'inline-block', background: '#efe7fb', color: 'var(--lavender-d)' }}>Buka di Sponsor →</Link>
          </div>
        </>
      )}

      {d.jenis === 'lainnya' && (
        <p className={s.muted} style={{ marginTop: 12 }}>
          {d.trx.arah === 'keluar' ? 'Pengeluaran manual — rincian ada di ringkasan di atas (kategori, keterangan, metode, lampiran).' : 'Transaksi manual — tidak terhubung ke sumber lain.'}
          {d.trx.arah === 'keluar' && <> <Link href="/admin/keuangan/expense" style={{ color: 'var(--biru-d)' }}>Buka di Pengeluaran →</Link></>}
        </p>
      )}
    </div>
  );
}
