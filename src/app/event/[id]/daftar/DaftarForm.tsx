// src/app/event/[id]/daftar/DaftarForm.tsx
'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { daftarEvent } from '@/lib/data/event-actions';
import TombolKembali from '@/components/TombolKembali';
import type { EventKelas } from '@/lib/game/tipe';
import { formatTanggal, formatRupiah, linkWa } from '@/lib/format';
import { hargaEventUntuk, persenEventUntuk } from '@/lib/domain/harga';

export default function DaftarForm({ ev, anak, status = 'kadaluarsa', waNomor, bankTeks, qrisUrl }: { ev: EventKelas; anak: { id: string; nama: string }[]; status?: string; waNomor?: string; bankTeks?: string; qrisUrl?: string }) {
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [pendamping, setPendamping] = useState(0);
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const hargaAnak = hargaEventUntuk(ev, status);
  const pctEv = persenEventUntuk(ev, status);
  const adaDiskon = hargaAnak < ev.harga_per_anak;
  const hargaPendamping = ev.harga_pendamping ?? 0;
  const totalPendamping = hargaPendamping * pendamping;
  const total = hargaAnak * pilih.size + totalPendamping;

  // Opsi kelas (Baby/Toddler) bila event dikonfigurasi terpisah
  const fmtJadwal = (tgl?: string | null, jm?: string | null, js?: string | null) =>
    [tgl ? formatTanggal(tgl) : '', (jm || js) ? `${jm ?? ''}${js ? `-${js}` : ''} WIB` : ''].filter(Boolean).join(' · ');
  const kelasOpsi: { key: string; label: string; jadwal: string }[] = [];
  if (ev.baby_jam_mulai || ev.baby_tanggal) kelasOpsi.push({ key: 'baby', label: '👶 Baby Class', jadwal: fmtJadwal(ev.baby_tanggal ?? ev.tanggal, ev.baby_jam_mulai, ev.baby_jam_selesai) });
  if (ev.toddler_jam_mulai || ev.toddler_tanggal) kelasOpsi.push({ key: 'toddler', label: '🧒 Toddler Class', jadwal: fmtJadwal(ev.toddler_tanggal ?? ev.tanggal, ev.toddler_jam_mulai, ev.toddler_jam_selesai) });
  const [kelas, setKelas] = useState<string>(kelasOpsi[0]?.key ?? '');
  const kelasTerpilih = kelasOpsi.find((o) => o.key === kelas);

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
    if (kelasOpsi.length > 0 && !kelas) { setErr('Pilih kelas dulu.'); return; }
    if (ev.harga_per_anak > 0 && !buktiUrl) { setErr('Unggah bukti pembayaran dulu.'); return; }
    setSubmitting(true); setErr('');
    try {
      await daftarEvent(ev.id, [...pilih], buktiUrl, kelasOpsi.length > 0 ? kelas : null, pendamping);
      setSukses(true); // tampilkan invoice + tombol konfirmasi WA
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal mendaftar');
      setSubmitting(false);
    }
  }

  if (sukses) {
    const waMsg = `Halo Admin KidzPlayful 🙏 Saya baru mendaftar event "${ev.judul}" untuk ${pilih.size} anak (total ${formatRupiah(total)})${buktiUrl ? ' dan sudah upload bukti bayar' : ''}. Mohon diproses ya. Terima kasih.`;
    const wa = linkWa(waNomor, waMsg);
    return (
      <main className="kp-page-narrow" style={{ padding: 16, marginTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>✅</div>
        <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '6px 0' }}>Pendaftaran terkirim!</h1>
        <div className="kp-card" style={{ textAlign: 'left', marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🧾 RINGKASAN</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><span>{ev.judul}</span></div>
          {kelasTerpilih && <div style={{ fontSize: 13, marginTop: 4 }}>{kelasTerpilih.label} · <span style={{ color: 'var(--abu)' }}>{kelasTerpilih.jadwal}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--abu)', marginTop: 4 }}><span>{pilih.size} anak × {formatRupiah(hargaAnak)}</span></div>
          {pendamping > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--abu)', marginTop: 2 }}><span>{pendamping} pendamping × {formatRupiah(hargaPendamping)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, borderTop: '1px dashed #e2dbf0', marginTop: 8, paddingTop: 8 }}><span>Total</span><span>{formatRupiah(total)}</span></div>
        </div>
        <p style={{ color: 'var(--abu)', fontSize: 13, margin: '12px 0' }}>Beri tahu admin agar pendaftaran & pembayaranmu segera diproses ya 🙏</p>
        {wa && <a className="kp-btn mint" href={wa} target="_blank" style={{ display: 'block' }}>💬 Konfirmasi ke Admin via WhatsApp</a>}
        <button className="kp-btn putih" style={{ width: '100%', marginTop: 8 }} onClick={() => { router.push('/pilih-anak'); router.refresh(); }}>Selesai</button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16 }}>
      <TombolKembali fallback="/event" style={{ color: 'var(--abu)', fontSize: 13 }} />
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 22, margin: '10px 0 12px' }}>Daftar: {ev.judul}</h1>

      {ev.gambar_url && (
        <Image src={ev.gambar_url} alt={ev.judul} width={480} height={160} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 16, marginBottom: 10 }} />
      )}
      <div className="kp-card" style={{ marginBottom: 12 }}>
        {ev.tanggal && <div>📅 {formatTanggal(ev.tanggal)}</div>}
        {(ev.jam_mulai || ev.jam_selesai) && <div>🕐 {ev.jam_mulai}{ev.jam_selesai ? ` - ${ev.jam_selesai}` : ''} WIB</div>}
        {ev.lokasi && <div>📍 {ev.lokasi}</div>}
        {ev.deskripsi && <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{ev.deskripsi}</p>}
        <div style={{ marginTop: 8, fontWeight: 700 }}>
          {adaDiskon && <span style={{ textDecoration: 'line-through', color: 'var(--abu)', fontWeight: 500, marginRight: 6 }}>{formatRupiah(ev.harga_per_anak)}</span>}
          {formatRupiah(hargaAnak)} / anak
          {adaDiskon && <span style={{ color: 'var(--mint-d)', fontSize: 12, marginLeft: 6 }}>diskon berlangganan -{pctEv}% 🎉</span>}
        </div>
      </div>

      {kelasOpsi.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Pilih kelas:</div>
          {kelasOpsi.map((o) => (
            <label key={o.key} className="kp-card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
              <input type="radio" name="kelas" checked={kelas === o.key} onChange={() => setKelas(o.key)} style={{ width: 18, height: 18 }} />
              <span><b>{o.label}</b><br /><small style={{ color: 'var(--abu)' }}>🕐 {o.jadwal || 'jadwal menyusul'}</small></span>
            </label>
          ))}
        </div>
      )}

      <div style={{ fontWeight: 700, marginBottom: 6 }}>Pilih anak yang ikut:</div>
      {anak.length === 0 && <p style={{ color: 'var(--abu)' }}>Belum ada profil anak. Tambahkan dulu di dashboard.</p>}
      {anak.map((a) => (
        <label key={a.id} className="kp-card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={pilih.has(a.id)} onChange={() => toggle(a.id)} style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 24 }}>🧒</span><b>{a.nama}</b>
        </label>
      ))}

      {hargaPendamping > 0 && (
        <div className="kp-card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span><b>➕ Tambah pendamping</b><br /><small style={{ color: 'var(--abu)' }}>{formatRupiah(hargaPendamping)} / pendamping</small></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={() => setPendamping((p) => Math.max(0, p - 1))} style={{ width: 32, height: 32, borderRadius: 99, border: '1px solid #ddd', background: '#fff', fontSize: 18, cursor: 'pointer' }}>−</button>
            <b style={{ minWidth: 16, textAlign: 'center' }}>{pendamping}</b>
            <button type="button" onClick={() => setPendamping((p) => p + 1)} style={{ width: 32, height: 32, borderRadius: 99, border: 'none', background: 'var(--lavender-d)', color: '#fff', fontSize: 18, cursor: 'pointer' }}>+</button>
          </div>
        </div>
      )}

      <div className="kp-card" style={{ marginBottom: 12, background: '#fff3d6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total pembayaran</span><b>{formatRupiah(total)}</b></div>
        <small style={{ color: 'var(--abu)' }}>{pilih.size} anak × {formatRupiah(hargaAnak)}{pendamping > 0 ? ` + ${pendamping} pendamping × ${formatRupiah(hargaPendamping)}` : ''}</small>
      </div>

      {ev.harga_per_anak > 0 && (bankTeks || qrisUrl) && (
        <div className="kp-card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>💳 PEMBAYARAN</div>
          {bankTeks && <div style={{ marginTop: 6, whiteSpace: 'pre-wrap', fontSize: 14 }}>🏦 {bankTeks}</div>}
          {qrisUrl && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--abu)', marginBottom: 4 }}>atau scan QRIS:</div>
              <Image src={qrisUrl} alt="QRIS pembayaran" width={200} height={200} style={{ width: 180, height: 'auto', borderRadius: 12 }} />
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--abu)', marginTop: 8 }}>Transfer sesuai total <b>{formatRupiah(total)}</b>, lalu unggah bukti bayar di bawah.</div>
        </div>
      )}

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
