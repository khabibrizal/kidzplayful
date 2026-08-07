// src/app/admin/event/[id]/cetak-peserta/page.tsx — daftar peserta siap cetak/simpan PDF.
// Memakai pola cetak yang sudah dipakai sertifikat & stiker: halaman ber-CSS print +
// UnduhPdfBtn (window.print → "Save as PDF"), jadi tanpa library PDF tambahan.
// Sumber datanya SAMA dengan ekspor CSV (`getPesertaEkspor`) supaya kedua unduhan konsisten.
import { redirect } from 'next/navigation';
import { getAdminTerjamin } from '@/lib/data/admin';
import { getEventAdmin } from '@/lib/data/admin-event';
import { getPesertaEkspor } from '@/lib/data/admin-event-actions';
import UnduhPdfBtn from '@/components/UnduhPdfBtn';
import TombolKembali from '@/components/TombolKembali';

const KELAS_URUT = ['Baby Class', 'Toddler Class', 'Gabungan'];

export default async function CetakPesertaPage({ params }: { params: Promise<{ id: string }> }) {
  await getAdminTerjamin();
  const { id } = await params;
  const ev = await getEventAdmin(id);
  if (!ev) redirect('/admin/event');
  const rows = await getPesertaEkspor(id);   // hanya status 'diterima'

  const grup = new Map<string, typeof rows>();
  for (const r of rows) { const g = grup.get(r.kelas); if (g) g.push(r); else grup.set(r.kelas, [r]); }
  const urutan = [...KELAS_URUT.filter((k) => grup.has(k)), ...[...grup.keys()].filter((k) => !KELAS_URUT.includes(k))];

  const th: React.CSSProperties = { textAlign: 'left', fontSize: '9pt', fontWeight: 700, borderBottom: '1.5px solid #444', padding: '5px 6px', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { fontSize: '9.5pt', borderBottom: '1px solid #e2e2e2', padding: '5px 6px', verticalAlign: 'top' };

  return (
    <main style={{ maxWidth: '190mm', margin: '12px auto', padding: 12 }}>
      <style>{`@media print{
        @page{ size:A4 portrait; margin:12mm }
        html,body{ margin:0 !important; padding:0 !important }
        main{ margin:0 !important; padding:0 !important; max-width:none !important }
        /* judul kolom diulang di tiap halaman & baris tidak boleh terpenggal */
        thead{ display:table-header-group }
        tr{ break-inside:avoid }
        section{ break-inside:auto }
      }`}</style>

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <TombolKembali fallback={`/admin/event/${id}/pendaftar`} style={{ color: 'var(--abu)', fontSize: 13 }} />
        <b>🧾 Daftar Peserta</b>
        <span style={{ color: 'var(--abu)', fontSize: 13 }}>{rows.length} peserta diterima</span>
        <UnduhPdfBtn judul={`Peserta ${ev.judul}`} />
      </div>
      <div className="no-print" style={{ fontSize: 12, color: 'var(--abu)', marginBottom: 10 }}>
        Tombol di atas membuka dialog cetak — pilih <b>&quot;Save as PDF&quot;</b> sebagai tujuan untuk menyimpannya sebagai berkas PDF.
      </div>

      <h1 style={{ fontSize: '15pt', margin: '0 0 2px' }}>{ev.judul}</h1>
      <div style={{ fontSize: '9.5pt', color: '#555', marginBottom: 14 }}>
        Daftar peserta (status diterima) · {rows.length} anak
        {ev.tanggal ? ` · ${ev.tanggal}` : ''}
      </div>

      {rows.length === 0 && <p style={{ color: '#666' }}>Belum ada peserta berstatus diterima untuk event ini.</p>}

      {urutan.map((k) => {
        const list = grup.get(k)!;
        return (
          <section key={k} style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: '11pt', margin: '0 0 6px', background: '#f2f0f8', padding: '5px 8px', borderRadius: 6 }}>
              {k} <span style={{ fontWeight: 400, color: '#666' }}>({list.length} anak)</span>
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 28 }}>No</th>
                  <th style={th}>Nama Panggilan</th>
                  <th style={th}>Nama Lengkap</th>
                  <th style={th}>L/P</th>
                  <th style={th}>Tgl Lahir (Umur)</th>
                  <th style={th}>Orang Tua</th>
                  <th style={th}>Pendamping</th>
                  <th style={th}>Waktu Daftar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={i}>
                    <td style={td}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{r.namaPanggilan}</td>
                    <td style={td}>{r.namaLengkap}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.jenisKelamin}</td>
                    <td style={td}>{r.tglLahir}{r.umur ? ` (${r.umur})` : ''}</td>
                    <td style={td}>{r.namaOrtu}</td>
                    <td style={td}>{r.pendamping > 0 ? `+${r.pendamping}` : '-'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.waktuDaftar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </main>
  );
}
