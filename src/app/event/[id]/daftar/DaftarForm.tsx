// src/app/event/[id]/daftar/DaftarForm.tsx
'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { daftarEvent } from '@/lib/data/event-actions';
import type { EventKelas } from '@/lib/game/tipe';
import { formatTanggal, formatRupiah } from '@/lib/format';

export default function DaftarForm({ ev, anak }: { ev: EventKelas; anak: { id: string; nama: string }[] }) {
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const total = ev.harga_per_anak * pilih.size;

  function toggle(id: string) {
    setPilih((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function unggah(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setLoading(true); setErr('');
    try {
      const sb = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `bukti/${Date.now()}-${Math.floor(performance.now())}.${ext}`;
      const { error } = await sb.storage.from('aset').upload(path, file, { upsert: false });
      if (error) throw error;
      setBuktiUrl(sb.storage.from('aset').getPublicUrl(path).data.publicUrl);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Gagal unggah'); }
    finally { setLoading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function kirim() {
    if (pilih.size === 0) { setErr('Pilih minimal 1 anak.'); return; }
    if (ev.harga_per_anak > 0 && !buktiUrl) { setErr('Unggah bukti pembayaran dulu.'); return; }
    setSubmitting(true); setErr('');
    try {
      await daftarEvent(ev.id, [...pilih], buktiUrl);
      // sukses → kembali ke dashboard (status muncul sebagai badge di kartu event)
      router.push('/pilih-anak');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal mendaftar');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <Link href="/event" style={{ color: 'var(--abu)', fontSize: 13 }}>← Kembali</Link>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '10px 0 12px' }}>Daftar: {ev.judul}</h1>

      {ev.gambar_url && (
        <Image src={ev.gambar_url} alt={ev.judul} width={480} height={160} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 16, marginBottom: 10 }} />
      )}
      <div className="kp-card" style={{ marginBottom: 12 }}>
        {ev.tanggal && <div>📅 {formatTanggal(ev.tanggal)}</div>}
        {(ev.jam_mulai || ev.jam_selesai) && <div>🕐 {ev.jam_mulai}{ev.jam_selesai ? ` - ${ev.jam_selesai}` : ''} WIB</div>}
        {ev.lokasi && <div>📍 {ev.lokasi}</div>}
        {ev.deskripsi && <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{ev.deskripsi}</p>}
        <div style={{ marginTop: 8, fontWeight: 700 }}>{formatRupiah(ev.harga_per_anak)} / anak</div>
      </div>

      <div style={{ fontWeight: 700, marginBottom: 6 }}>Pilih anak yang ikut:</div>
      {anak.length === 0 && <p style={{ color: 'var(--abu)' }}>Belum ada profil anak. Tambahkan dulu di dashboard.</p>}
      {anak.map((a) => (
        <label key={a.id} className="kp-card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={pilih.has(a.id)} onChange={() => toggle(a.id)} style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 24 }}>🧒</span><b>{a.nama}</b>
        </label>
      ))}

      <div className="kp-card" style={{ marginBottom: 12, background: '#fff3d6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total pembayaran</span><b>{formatRupiah(total)}</b></div>
        <small style={{ color: 'var(--abu)' }}>{pilih.size} anak × {formatRupiah(ev.harga_per_anak)}</small>
      </div>

      {ev.harga_per_anak > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button type="button" className="kp-btn putih" onClick={() => fileRef.current?.click()} disabled={loading}>
            {loading ? 'Mengunggah…' : (buktiUrl ? '✓ Ganti bukti bayar' : '⬆ Unggah bukti bayar')}
          </button>
          {buktiUrl && <a href={buktiUrl} target="_blank" style={{ marginLeft: 10, color: 'var(--biru-d)', fontSize: 13 }}>lihat</a>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={unggah} />
        </div>
      )}

      {err && <div className="kp-error" style={{ marginBottom: 10 }}>{err}</div>}
      <button className="kp-btn" onClick={kirim} disabled={submitting} style={{ width: '100%' }}>
        {submitting ? 'Mengirim…' : 'Daftar Sekarang'}
      </button>
    </main>
  );
}
