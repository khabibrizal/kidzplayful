// src/app/guru/[eventId]/GuruNilai.tsx
'use client';
import { useState } from 'react';
import { simpanCatatan } from '@/lib/data/guru-actions';
import type { CatatanPerkembangan } from '@/lib/game/tipe';
import { ASPEK_PAUD, SKALA_PAUD } from '@/lib/format';

type Peserta = { anak_id: string; nama: string; ortu_id: string };
type FormAnak = { aspek: Record<string, string>; catatan: string };

export default function GuruNilai({ eventId, peserta, catatanAwal }: {
  eventId: string; peserta: Peserta[]; catatanAwal: Record<string, CatatanPerkembangan>;
}) {
  const [form, setForm] = useState<Record<string, FormAnak>>(() => {
    const o: Record<string, FormAnak> = {};
    peserta.forEach((p) => { const c = catatanAwal[p.anak_id]; o[p.anak_id] = { aspek: c?.aspek ?? {}, catatan: c?.catatan ?? '' }; });
    return o;
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2200); }

  function setAspek(anakId: string, key: string, kode: string) {
    setForm((f) => ({ ...f, [anakId]: { ...f[anakId], aspek: { ...f[anakId].aspek, [key]: kode } } }));
  }
  function setCat(anakId: string, val: string) {
    setForm((f) => ({ ...f, [anakId]: { ...f[anakId], catatan: val } }));
  }
  async function simpan(p: Peserta) {
    setBusy(p.anak_id);
    try {
      await simpanCatatan({ eventId, anakId: p.anak_id, ortuId: p.ortu_id, aspek: form[p.anak_id].aspek, catatan: form[p.anak_id].catatan });
      flash(`Catatan ${p.nama} tersimpan ✓`);
    } catch (e) { flash(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setBusy(null); }
  }

  if (peserta.length === 0) return <p style={{ color: 'var(--abu)' }}>Belum ada peserta diterima untuk event ini.</p>;

  return (
    <div>
      {peserta.map((p) => {
        const fa = form[p.anak_id];
        return (
          <div key={p.anak_id} className="kp-card" style={{ marginBottom: 12 }}>
            <b>🧒 {p.nama}</b>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {ASPEK_PAUD.map((a) => (
                <div key={a.key}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{a.label}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {SKALA_PAUD.map((sk) => {
                      const on = fa.aspek[a.key] === sk.kode;
                      return (
                        <button key={sk.kode} type="button" onClick={() => setAspek(p.anak_id, a.key, sk.kode)}
                          title={sk.teks}
                          style={{
                            border: 'none', cursor: 'pointer', borderRadius: 99, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                            background: on ? sk.bg : '#f1eef8', color: on ? sk.warna : 'var(--abu)',
                            boxShadow: on ? `inset 0 0 0 2px ${sk.warna}` : 'none',
                          }}>{sk.kode}</button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <textarea className="kp-input" placeholder="Catatan untuk orang tua (opsional)" rows={2}
                value={fa.catatan} onChange={(e) => setCat(p.anak_id, e.target.value)} style={{ resize: 'vertical' }} />
              <button className="kp-btn" onClick={() => simpan(p)} disabled={busy === p.anak_id} style={{ alignSelf: 'flex-start' }}>
                {busy === p.anak_id ? 'Menyimpan…' : '💾 Simpan Catatan'}
              </button>
            </div>
          </div>
        );
      })}
      <p style={{ fontSize: 12, color: 'var(--abu)' }}>BB=Belum · MB=Mulai · BSH=Sesuai Harapan · BSB=Sangat Baik</p>
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 14, zIndex: 80 }}>{toast}</div>}
    </div>
  );
}
