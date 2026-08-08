// src/app/sertifikat/[id]/page.tsx — halaman e-sertifikat (view + Unduh PDF)
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSertifikat } from '@/lib/data/sertifikat';
import SertifikatView from '@/components/SertifikatView';
import UnduhSertifikatBtn from '@/components/UnduhSertifikatBtn';
import { formatTanggal } from '@/lib/format';
import TombolKembali from '@/components/TombolKembali';

export default async function SertifikatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const sert = await getSertifikat(id);
  if (!sert) redirect('/pilih-anak');

  return (
    <main style={{ maxWidth: 940, margin: '20px auto', padding: 16 }}>
      {/* Cetak PDF dalam orientasi landscape */}
      <style>{`@media print{@page{size:A4 landscape;margin:8mm}}`}</style>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <TombolKembali fallback={`/anak/${sert.anak_id}/laporan`} style={{ color: 'var(--abu)', fontSize: 13 }} />
        <UnduhSertifikatBtn isi={{
          anakNama: sert.anak_nama,
          eventJudul: sert.event_judul,
          tanggalLokasi: [formatTanggal(sert.event_tanggal), sert.lokasi].filter(Boolean).join(' · '),
          bgUrl: sert.bg_url,
          diterbitkanOleh: sert.diterbitkan_oleh,
        }} />
      </div>
      <SertifikatView s={sert} />
      {sert.dokumentasi_url && (
        <div className="no-print" style={{ textAlign: 'center', marginTop: 14 }}>
          <a className="kp-btn" href={sert.dokumentasi_url} target="_blank" rel="noopener noreferrer">📷 Lihat Dokumentasi Kegiatan</a>
        </div>
      )}
    </main>
  );
}
