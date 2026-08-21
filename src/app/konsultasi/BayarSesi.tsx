// src/app/konsultasi/BayarSesi.tsx — kartu pembayaran satu sesi konsultasi.
//
// Muncul setelah psikolog mengonfirmasi jadwal DAN sesinya berbayar. Sesi yang memakai kuota
// paket (atau berdiskon 100%) tak pernah sampai ke sini: statusnya langsung `diterima`.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kompresGambar } from '@/lib/img';
import { formatRupiah, linkWa } from '@/lib/format';
import { unggahBuktiKonsultasi } from '@/lib/data/konsultasi-actions';

function jalurBukti(ext: string): string {
  return `bukti/${Date.now()}-${Math.floor(Math.random() * 1_000_000)}.${ext}`;
}

export default function BayarSesi({ id, total, buktiUrl, batasBayar, bank, qris, waAdmin, namaAnak }: {
  id: string; total: number; buktiUrl: string | null; batasBayar: string | null;
  bank: string; qris: string; waAdmin: string; namaAnak: string;
}) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');
  const [bukti, setBukti] = useState<string | null>(buktiUrl);

  async function unggah(file: File) {
    setSibuk(true); setPesan('');
    try {
      const sb = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 1280, kualitas: 0.8 });
      const path = jalurBukti(ext);
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
      if (error) throw new Error(error.message);
      const url = sb.storage.from('aset').getPublicUrl(path).data.publicUrl;
      const r = await unggahBuktiKonsultasi(id, url);
      if (!r.ok) throw new Error(r.error ?? 'Gagal menyimpan bukti');
      setBukti(url);
      setPesan('Bukti terkirim — menunggu verifikasi 🌿');
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : 'Gagal mengunggah bukti.');
    } finally { setSibuk(false); }
  }

  const pesanWa = `Halo Admin KidzPlayful 🙏 Saya sudah transfer ${formatRupiah(total)} untuk sesi konsultasi psikolog (${namaAnak}) dan sudah unggah buktinya. Mohon diproses ya, terima kasih.`;
  const hrefWa = linkWa(waAdmin, pesanWa);

  return (
    <div style={{ marginTop: 8, borderTop: '1px dashed #eee', paddingTop: 8 }}>
      <div style={{ fontSize: 13 }}>💳 Transfer <b>{formatRupiah(total)}</b> untuk membuka ruang chat:</div>
      <div style={{ fontSize: 13, margin: '4px 0' }}>{bank}</div>
      {qris && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qris} alt="QRIS" style={{ width: 170, maxWidth: '100%', borderRadius: 12, margin: '6px 0' }} />
      )}
      {batasBayar && (
        <div style={{ fontSize: 12, color: '#b88600' }}>
          ⏳ Mohon diselesaikan sebelum {new Date(batasBayar).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB,
          setelah itu slotnya dilepas untuk orang tua lain.
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <label className="kp-btn putih" style={{ display: 'inline-block', cursor: 'pointer' }}>
          {sibuk ? 'Mengunggah…' : bukti ? '✓ Ganti bukti transfer' : '⬆ Unggah bukti transfer'}
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) unggah(f); }} />
        </label>
        {bukti && hrefWa && (
          <a className="kp-btn putih" style={{ display: 'inline-block' }} href={hrefWa} target="_blank" rel="noopener noreferrer">
            💬 Konfirmasi via WhatsApp
          </a>
        )}
      </div>
      {pesan && <div style={{ fontSize: 12, marginTop: 6, color: pesan.includes('🌿') ? 'var(--mint-d)' : '#c0392b' }}>{pesan}</div>}
    </div>
  );
}
