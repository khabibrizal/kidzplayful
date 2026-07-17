// src/components/ChatKonsultasi.tsx — chat konsultasi (polling ~3 detik) — dipakai ortu & psikolog
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kirimPesan, tandaiDibaca, selesaikanKonsultasi } from '@/lib/data/konsultasi-actions';
import type { PesanKonsultasi } from '@/lib/game/tipe';

function mmss(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(t / 60), s = t % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ChatKonsultasi({ pendaftaranId, userId, awal, nonaktif = false, dimulaiPada = null, durasiMenit = 0 }: {
  pendaftaranId: string; userId: string; awal: PesanKonsultasi[]; nonaktif?: boolean;
  dimulaiPada?: string | null; durasiMenit?: number;
}) {
  const router = useRouter();
  const [pesan, setPesan] = useState<PesanKonsultasi[]>(awal);
  const [teks, setTeks] = useState('');
  const [kirim, setKirim] = useState(false);
  const bawahRef = useRef<HTMLDivElement>(null);
  const supa = useRef(createClient());

  // Hitung mundur durasi sesi (bila diatur & sesi sudah dimulai)
  const deadline = (!nonaktif && dimulaiPada && durasiMenit > 0) ? new Date(dimulaiPada).getTime() + durasiMenit * 60000 : null;
  const [sisaMs, setSisaMs] = useState<number | null>(deadline ? deadline - Date.now() : null);
  const selesaiRef = useRef(false);
  useEffect(() => {
    if (!deadline) { setSisaMs(null); return; }
    const tick = () => {
      const s = deadline - Date.now();
      setSisaMs(s);
      if (s <= 0 && !selesaiRef.current) {
        selesaiRef.current = true;
        selesaikanKonsultasi(pendaftaranId).finally(() => router.refresh());
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline, pendaftaranId, router]);

  const scrollBawah = useCallback(() => { bawahRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);

  const muat = useCallback(async () => {
    const { data } = await supa.current
      .from('pesan_konsultasi')
      .select('id,pendaftaran_id,pengirim_id,nama,teks,dibaca_at,created_at')
      .eq('pendaftaran_id', pendaftaranId)
      .order('created_at', { ascending: true });
    if (!data) return;
    setPesan((lama) => {
      if (data.length !== lama.length) {
        const adaBaruDariLawan = (data as PesanKonsultasi[]).some((m) => m.pengirim_id !== userId && !lama.find((x) => x.id === m.id));
        if (adaBaruDariLawan) tandaiDibaca(pendaftaranId).catch(() => {});
        return data as unknown as PesanKonsultasi[];
      }
      return lama;
    });
  }, [pendaftaranId, userId]);

  useEffect(() => {
    tandaiDibaca(pendaftaranId).catch(() => {});
    const t = setInterval(muat, 3000);
    return () => clearInterval(t);
  }, [muat, pendaftaranId]);

  useEffect(() => { scrollBawah(); }, [pesan, scrollBawah]);

  async function submit() {
    const t = teks.trim();
    if (!t || kirim) return;
    setKirim(true);
    try {
      const r = await kirimPesan(pendaftaranId, t);
      if (r.ok) { setTeks(''); await muat(); }
    } finally { setKirim(false); }
  }

  return (
    <div className="kp-card" style={{ padding: 12 }}>
      {sisaMs !== null && sisaMs > 0 && (
        <div style={{ textAlign: 'center', fontWeight: 800, marginBottom: 10, padding: '6px 10px', borderRadius: 10, background: sisaMs <= 60000 ? '#fde8e6' : '#efe7fb', color: sisaMs <= 60000 ? '#b3261e' : 'var(--lavender-d)' }}>
          ⏳ Sisa waktu {mmss(sisaMs)}{sisaMs <= 60000 ? ' · ⚠️ 1 menit terakhir!' : ''}
        </div>
      )}
      <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
        {pesan.length === 0 && <p style={{ color: 'var(--abu)', fontSize: 13, textAlign: 'center', margin: '18px 0' }}>Belum ada pesan. Mulai percakapan 👋</p>}
        {pesan.map((m) => {
          const saya = m.pengirim_id === userId;
          return (
            <div key={m.id} style={{ alignSelf: saya ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {!saya && <div style={{ fontSize: 11, color: 'var(--abu)', marginBottom: 2 }}>{m.nama || 'Lawan bicara'}</div>}
              <div style={{
                background: saya ? 'var(--lavender-d)' : '#f1eef8', color: saya ? '#fff' : 'var(--tinta)',
                borderRadius: 14, padding: '8px 12px', fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{m.teks}</div>
            </div>
          );
        })}
        <div ref={bawahRef} />
      </div>

      {nonaktif ? (
        <p style={{ fontSize: 12, color: 'var(--abu)', marginTop: 10, textAlign: 'center' }}>Sesi ini sudah tidak aktif.</p>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input className="kp-input" style={{ flex: 1, marginBottom: 0 }} placeholder="Tulis pesan…" value={teks}
            onChange={(e) => setTeks(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          <button className="kp-btn mint" onClick={submit} disabled={kirim}>{kirim ? '...' : 'Kirim'}</button>
        </div>
      )}
    </div>
  );
}
