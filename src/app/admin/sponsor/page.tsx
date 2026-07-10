// src/app/admin/sponsor/page.tsx — daftar sponsor & deal + ringkasan (admin)
import Link from 'next/link';
import { getSponsorSemua, getDealSemua, getRingkasanSponsor, LABEL_STATUS, JENIS_SPONSOR } from '@/lib/data/sponsor';
import { simpanSponsor, hapusSponsor, simpanDeal } from '@/lib/data/sponsor-actions';
import { formatRupiah } from '@/lib/format';
import InputRupiah from '@/components/InputRupiah';
import EksporCsvBtn from '../keuangan/EksporCsvBtn';
import s from '../admin.module.css';

export default async function SponsorPage() {
  const [sponsorList, deals, ringkas] = await Promise.all([getSponsorSemua(), getDealSemua(), getRingkasanSponsor()]);

  async function aksiHapusSponsor(fd: FormData) { 'use server'; await hapusSponsor(fd); }

  const csv: (string | number)[][] = [
    ['Sponsor', 'Event', 'Jenis', 'Nilai', 'Status', 'No Invoice', 'Tgl Bayar'],
    ...deals.map((d) => [d.sponsor?.nama_perusahaan ?? '-', d.nama_event ?? '-', d.jenis, d.nilai, LABEL_STATUS[d.status]?.teks ?? d.status, d.no_invoice ?? '-', d.bayar_tanggal ?? '-']),
  ];

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🤝 Sponsor</h1><Link href="/admin/keuangan" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>💼 Keuangan</Link></div>
      <p className={s.muted} style={{ fontSize: 13 }}>Kelola sponsor, deal, invoice, & pembayaran. Sponsor <b>uang</b> otomatis masuk pendapatan di Keuangan; sponsor <b>barang</b> dicatat terpisah.</p>

      {/* Ringkasan */}
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <div className={s.card} style={{ flex: 1, minWidth: 140, textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#1c7a43' }}>{formatRupiah(ringkas.tunaiMasuk)}</div><div className={s.muted} style={{ fontSize: 11 }}>Sponsor tunai masuk</div></div>
        <div className={s.card} style={{ flex: 1, minWidth: 140, textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#d1660a' }}>{formatRupiah(ringkas.inKind)}</div><div className={s.muted} style={{ fontSize: 11 }}>Nilai sponsor barang</div></div>
        <div className={s.card} style={{ flex: 1, minWidth: 140, textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#c0392b' }}>{formatRupiah(ringkas.outstanding)}</div><div className={s.muted} style={{ fontSize: 11 }}>Invoice belum dibayar</div></div>
      </div>

      {/* Tambah sponsor */}
      <details className={s.card} style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--lavender-d)' }}>➕ Tambah Sponsor (perusahaan)</summary>
        <form action={simpanSponsor} style={{ marginTop: 10 }}>
          <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
            <input className={s.inp} name="nama_perusahaan" placeholder="Nama perusahaan *" style={{ flex: 2, minWidth: 180 }} required />
            <input className={s.inp} name="pic" placeholder="PIC / narahubung" style={{ flex: 1, minWidth: 140 }} />
          </div>
          <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <input className={s.inp} name="email" type="email" placeholder="Email" style={{ flex: 1, minWidth: 140 }} />
            <input className={s.inp} name="telepon" placeholder="Telepon / WA" style={{ flex: 1, minWidth: 130 }} />
            <input className={s.inp} name="industri" placeholder="Industri" style={{ flex: 1, minWidth: 120 }} />
          </div>
          <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <input className={s.inp} name="website" placeholder="Website" style={{ flex: 1, minWidth: 140 }} />
            <input className={s.inp} name="npwp" placeholder="NPWP (opsional)" style={{ flex: 1, minWidth: 140 }} />
          </div>
          <input className={s.inp} name="alamat" placeholder="Alamat" style={{ width: '100%', marginTop: 6 }} />
          <div style={{ marginTop: 8 }}><button className={s.btn} type="submit">Simpan Sponsor</button></div>
        </form>
      </details>

      {/* Tambah deal */}
      <details className={s.card} style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--lavender-d)' }}>➕ Tambah Deal Sponsorship</summary>
        {sponsorList.length === 0 ? (
          <p className={s.muted} style={{ marginTop: 10 }}>Tambah sponsor dulu di atas.</p>
        ) : (
          <form action={simpanDeal} style={{ marginTop: 10 }}>
            <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }}>
              <select className={s.inp} name="sponsor_id" style={{ flex: 2, minWidth: 180 }} required>
                <option value="">— Pilih sponsor —</option>
                {sponsorList.map((sp) => <option key={sp.id} value={sp.id}>{sp.nama_perusahaan}</option>)}
              </select>
              <select className={s.inp} name="jenis" style={{ flex: 1, minWidth: 140 }} defaultValue="uang">
                {JENIS_SPONSOR.map((j) => <option key={j.v} value={j.v}>{j.l}</option>)}
              </select>
            </div>
            <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <input className={s.inp} name="nama_event" placeholder="Nama event/kegiatan" style={{ flex: 2, minWidth: 180 }} />
              <InputRupiah className={s.inp} name="nilai" placeholder="Nilai (Rp)" style={{ flex: 1, minWidth: 130, marginBottom: 0 }} />
            </div>
            <input className={s.inp} name="deskripsi_barang" placeholder="Deskripsi barang (khusus sponsor barang)" style={{ width: '100%', marginTop: 6 }} />
            <input className={s.inp} name="benefit" placeholder="Benefit untuk sponsor" style={{ width: '100%', marginTop: 6 }} />
            <div className={s.row} style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--abu)' }}>Mulai <input className={s.inp} type="date" name="tanggal_mulai" style={{ marginLeft: 4 }} /></label>
              <label style={{ fontSize: 12, color: 'var(--abu)' }}>Selesai <input className={s.inp} type="date" name="tanggal_selesai" style={{ marginLeft: 4 }} /></label>
            </div>
            <input className={s.inp} name="catatan" placeholder="Catatan" style={{ width: '100%', marginTop: 6 }} />
            <div style={{ marginTop: 8 }}><button className={s.btn} type="submit">Simpan Deal</button></div>
          </form>
        )}
      </details>

      {/* Daftar deal */}
      <div className={s.section} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Daftar Deal ({deals.length})
        {deals.length > 0 && <EksporCsvBtn nama="sponsor.csv" baris={csv} />}
      </div>
      {deals.length === 0 && <p className={s.muted}>Belum ada deal sponsorship.</p>}
      {deals.map((d) => {
        const st = LABEL_STATUS[d.status] ?? { teks: d.status, warna: 'var(--abu)', bg: '#eee' };
        return (
          <Link key={d.id} href={`/admin/sponsor/${d.id}`} className={s.card} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div className={s.row}>
              <span style={{ flex: 1 }}>
                <b>{d.sponsor?.nama_perusahaan ?? '(sponsor terhapus)'}</b>
                {d.jenis === 'barang' && <span className={s.muted} style={{ fontSize: 11 }}> · barang</span>}
                <br /><small className={s.muted}>{d.nama_event || 'tanpa event'} · {formatRupiah(d.nilai)}{d.no_invoice ? ` · ${d.no_invoice}` : ''}</small>
              </span>
              <span className={s.tag} style={{ background: st.bg, color: st.warna }}>{st.teks}</span>
            </div>
          </Link>
        );
      })}

      {/* Kelola sponsor */}
      <details className={s.card} style={{ marginTop: 14 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--lavender-d)', fontSize: 13 }}>🏢 Daftar Sponsor ({sponsorList.length})</summary>
        <div style={{ marginTop: 10 }}>
          {sponsorList.length === 0 && <p className={s.muted}>Belum ada sponsor.</p>}
          {sponsorList.map((sp) => (
            <div key={sp.id} className={s.row} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f5' }}>
              <span style={{ flex: 1 }}><b style={{ fontSize: 14 }}>{sp.nama_perusahaan}</b><br /><small className={s.muted}>{[sp.pic, sp.email, sp.telepon].filter(Boolean).join(' · ') || '—'}</small></span>
              <form action={aksiHapusSponsor}><input type="hidden" name="id" value={sp.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
