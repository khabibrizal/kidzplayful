// src/app/pesanan/[id]/page.tsx — detail pesanan + pembayaran
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPesanan } from '@/lib/data/pesanan';
import { formatRupiah, STATUS_PESANAN, linkWa } from '@/lib/format';
import { getPengaturanBayar } from '@/lib/data/pengaturan-bayar';
import BuktiUpload from './BuktiUpload';

export default async function PesananDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const o = await getPesanan(id);
  const cfg = await getPengaturanBayar();
  const BANK = cfg.bank_teks;
  if (!o || o.ortu_id !== user.id) redirect('/pesanan');
  const st = STATUS_PESANAN[o.status] ?? { teks: o.status, warna: 'var(--abu)', bg: '#eee' };
  const no8 = o.id.slice(0, 8);
  const waOngkir = linkWa(cfg.wa_nomor, `Halo Admin KidzPlayful 🙏 Saya sudah checkout pesanan #${no8} (barang ${formatRupiah(o.subtotal)}). Mohon dihitung ongkirnya ya. Terima kasih.`);
  const waBayar = linkWa(cfg.wa_nomor, `Halo Admin KidzPlayful 🙏 Saya sudah bayar & unggah bukti untuk pesanan #${no8} (total ${formatRupiah(o.total)}). Mohon diverifikasi ya. Terima kasih.`);

  return (
    <main className="kp-page-narrow" style={{ padding: 16, paddingBottom: 40, marginTop: 24 }}>
      <Link href="/pesanan" style={{ color: 'var(--abu)', fontSize: 13 }}>← Pesanan saya</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 14px' }}>
        <h1 style={{ color: 'var(--lavender-d)', fontSize: 20, margin: 0 }}>🧾 Invoice #{no8}</h1>
        <span style={{ fontSize: 12, fontWeight: 700, color: st.warna, background: st.bg, borderRadius: 99, padding: '4px 11px' }}>{st.teks}</span>
      </div>

      <div className="kp-card" style={{ marginBottom: 10 }}>
        {(o.item ?? []).map((it) => (
          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, margin: '5px 0' }}>
            <span>{it.nama} × {it.qty}</span><span>{formatRupiah(it.harga * it.qty)}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px dashed #e2dbf0', marginTop: 8, paddingTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6f6685' }}><span>Subtotal</span><span>{formatRupiah(o.subtotal)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6f6685' }}><span>Ongkir</span><span>{o.status === 'menunggu_ongkir' ? 'menunggu admin' : formatRupiah(o.ongkir)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, marginTop: 4 }}><span>Total</span><span>{formatRupiah(o.total)}{o.status === 'menunggu_ongkir' ? ' +' : ''}</span></div>
        </div>
      </div>

      <div className="kp-card" style={{ marginBottom: 10, fontSize: 13 }}>
        <b>Alamat pengiriman</b>
        <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{o.penerima} · {o.no_hp}<br />{o.alamat}</p>
        {o.catatan && <p style={{ margin: '6px 0 0', color: 'var(--abu)' }}>Catatan: {o.catatan}</p>}
        {o.no_resi && <p style={{ margin: '6px 0 0' }}>No. resi: <b>{o.no_resi}</b></p>}
      </div>

      {o.status === 'menunggu_ongkir' && (
        <div className="kp-card" style={{ background: '#fff3d6' }}>
          <p style={{ margin: 0, fontSize: 14 }}>Menunggu admin menghitung ongkir. Klik tombol di bawah agar admin segera memprosesnya.</p>
          {waOngkir && <a className="kp-btn mint" href={waOngkir} target="_blank" style={{ display: 'inline-block', marginTop: 10 }}>💬 Konfirmasi ongkir via WhatsApp</a>}
        </div>
      )}

      {o.status === 'menunggu_bayar' && (
        <div className="kp-card" style={{ background: '#fff3d6' }}>
          <b>Silakan bayar {formatRupiah(o.total)}</b>
          <p style={{ margin: '6px 0', fontSize: 13 }}>Transfer ke <b>{BANK}</b>, lalu unggah bukti pembayaran di bawah.</p>
          <BuktiUpload pesananId={o.id} />
        </div>
      )}

      {o.status === 'dibayar' && (
        <div className="kp-card" style={{ background: '#d6e6ff' }}>
          <p style={{ margin: 0 }}>Bukti diterima ✓ Menunggu verifikasi admin. {o.bukti_url && <a href={o.bukti_url} target="_blank" style={{ color: 'var(--biru-d)' }}>lihat bukti</a>}</p>
          {waBayar && <a className="kp-btn mint" href={waBayar} target="_blank" style={{ display: 'inline-block', marginTop: 10 }}>💬 Konfirmasi pembayaran via WhatsApp</a>}
        </div>
      )}
      {o.status === 'diproses' && <div className="kp-card" style={{ background: '#efe7fb' }}>Pembayaran terverifikasi. Pesanan sedang diproses 📦</div>}
      {o.status === 'dikirim' && <div className="kp-card" style={{ background: '#dff5e6' }}>Pesanan dikirim 🚚 {o.no_resi && <>Resi: <b>{o.no_resi}</b></>}</div>}
      {o.status === 'selesai' && <div className="kp-card" style={{ background: '#dff5e6' }}>Pesanan selesai. Terima kasih! 🎉</div>}
      {o.status === 'batal' && <div className="kp-card" style={{ background: '#fde8e6' }}>Pesanan dibatalkan.</div>}
    </main>
  );
}
