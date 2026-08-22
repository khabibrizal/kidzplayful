// src/components/PemilihAnak.tsx — pemilih anak untuk halaman yang tak punya anakId di rutenya.
//
// Kurikulum & evaluasi SELALU milik satu anak (0098): kakak di bulan ke-3 tidak membuka
// tema itu untuk bayi yang masih bulan ke-1. Karena itu halaman kurikulum wajib menyebut
// anak siapa yang sedang dibuka, dan pemilihnya SELALU terlihat — bukan tersembunyi di
// menu — supaya "kok temanya terkunci?" langsung ada jawabannya di layar yang sama.
'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export default function PemilihAnak({ anak, terpilih, label = 'Kurikulum' }: {
  anak: { id: string; nama: string }[];
  terpilih: string | null;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  if (anak.length === 0) return null;

  function ganti(id: string) {
    const q = new URLSearchParams(sp.toString());
    q.set('anak', id);
    router.push(`${pathname}?${q.toString()}`);
  }

  return (
    <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '4px 0 10px' }}>
      <span style={{ fontSize: 12, color: 'var(--abu)' }}>{label} untuk:</span>
      <select className="kp-input" value={terpilih ?? ''} onChange={(e) => ganti(e.target.value)}
        style={{ width: 'auto', minWidth: 150, marginBottom: 0 }}>
        {!terpilih && <option value="">— pilih anak —</option>}
        {anak.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
      </select>
    </div>
  );
}
