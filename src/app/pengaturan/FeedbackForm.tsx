// src/app/pengaturan/FeedbackForm.tsx — survei masukan aplikasi (8 pertanyaan)
'use client';
import { useState } from 'react';
import { kirimFeedback } from '@/lib/data/feedback-actions';
import { FITUR_OPSI, BERSEDIA_OPSI, HARGA_OPSI, type JawabanFeedback } from '@/lib/feedback-tipe';

function Pil({ opsi, nilai, set }: { opsi: string[]; nilai: string; set: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {opsi.map((o) => (
        <button key={o} type="button" onClick={() => set(nilai === o ? '' : o)}
          style={{
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 700,
            background: nilai === o ? 'var(--lavender-d)' : '#f3f3f8', color: nilai === o ? '#fff' : 'var(--tinta)',
          }}>{o}</button>
      ))}
    </div>
  );
}

function Q({ n, teks, tujuan, children }: { n: number; teks: string; tujuan: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, color: 'var(--tinta)', fontSize: 14 }}>{n}. {teks}</div>
      <div style={{ fontSize: 11, color: 'var(--abu)', margin: '2px 0 8px' }}>🎯 {tujuan}</div>
      {children}
    </div>
  );
}

const KOSONG: JawabanFeedback = { apa: '', fitur: '', fiturLain: '', bingung: '', kurang: '', bersedia: '', harga: '', nps: null, saran: '' };

export default function FeedbackForm() {
  const [buka, setBuka] = useState(false);
  const [j, setJ] = useState<JawabanFeedback>(KOSONG);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [sukses, setSukses] = useState(false);
  const ubah = (patch: Partial<JawabanFeedback>) => setJ((x) => ({ ...x, ...patch }));

  async function kirim() {
    setMsg('');
    if (!j.apa.trim() && !j.saran.trim()) { setMsg('Isi minimal pertanyaan 1 atau 8 ya.'); return; }
    setLoading(true);
    try { await kirimFeedback(j); setSukses(true); setJ(KOSONG); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Gagal mengirim.'); }
    finally { setLoading(false); }
  }

  if (sukses) {
    return (
      <div className="kp-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 34 }}>🙏</div>
        <p style={{ marginTop: 6, color: 'var(--tinta)' }}>Terima kasih atas masukannya! Sangat membantu kami mengembangkan KidzPlayful.</p>
        <button className="kp-btn putih" style={{ marginTop: 10 }} onClick={() => { setSukses(false); setBuka(false); }}>Selesai</button>
      </div>
    );
  }

  if (!buka) {
    return (
      <div className="kp-card">
        <p style={{ fontSize: 13, color: 'var(--abu)', marginBottom: 10 }}>Bantu kami jadi lebih baik — isi survei singkat (±2 menit). 🌿</p>
        <button className="kp-btn mint" style={{ width: '100%' }} onClick={() => setBuka(true)}>💬 Beri Masukan</button>
      </div>
    );
  }

  return (
    <div className="kp-card">
      <Q n={1} teks="Setelah mencoba KidzPlayful, menurut Anda KidzPlayful itu apa?" tujuan="Mengukur apakah positioning sudah jelas.">
        <textarea className="kp-input" rows={2} value={j.apa} onChange={(e) => ubah({ apa: e.target.value })} placeholder="Jawaban singkat…" style={{ resize: 'vertical', marginBottom: 0 }} />
      </Q>

      <Q n={2} teks="Fitur apa yang paling menarik menurut Anda?" tujuan="Menentukan prioritas pengembangan.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FITUR_OPSI.map((f) => (
            <button key={f.v} type="button" onClick={() => ubah({ fitur: j.fitur === f.v ? '' : f.v })}
              style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 700, background: j.fitur === f.v ? 'var(--lavender-d)' : '#f3f3f8', color: j.fitur === f.v ? '#fff' : 'var(--tinta)' }}>{f.l}</button>
          ))}
        </div>
        {j.fitur === 'lainnya' && <input className="kp-input" value={j.fiturLain} onChange={(e) => ubah({ fiturLain: e.target.value })} placeholder="Sebutkan…" style={{ marginTop: 8, marginBottom: 0 }} />}
      </Q>

      <Q n={3} teks="Apakah ada bagian yang membingungkan atau sulit digunakan?" tujuan="Menemukan masalah UI/UX.">
        <textarea className="kp-input" rows={2} value={j.bingung} onChange={(e) => ubah({ bingung: e.target.value })} placeholder="Jawaban singkat…" style={{ resize: 'vertical', marginBottom: 0 }} />
      </Q>

      <Q n={4} teks="Menurut Anda, apa yang masih kurang dari KidzPlayful?" tujuan="Mendapatkan ide pengembangan.">
        <textarea className="kp-input" rows={2} value={j.kurang} onChange={(e) => ubah({ kurang: e.target.value })} placeholder="Jawaban singkat…" style={{ resize: 'vertical', marginBottom: 0 }} />
      </Q>

      <Q n={5} teks="Jika Anda orang tua, apakah bersedia menggunakan KidzPlayful?" tujuan="Mengukur ketertarikan terhadap produk.">
        <Pil opsi={BERSEDIA_OPSI} nilai={j.bersedia} set={(v) => ubah({ bersedia: v })} />
      </Q>

      <Q n={6} teks="Berapa harga langganan bulanan yang menurut Anda masih wajar?" tujuan="Validasi harga.">
        <Pil opsi={HARGA_OPSI} nilai={j.harga} set={(v) => ubah({ harga: v })} />
      </Q>

      <Q n={7} teks="Seberapa besar kemungkinan Anda merekomendasikan KidzPlayful ke teman/keluarga?" tujuan="Mengukur kepuasan & potensi word-of-mouth.">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" onClick={() => ubah({ nps: j.nps === n ? null : n })}
              style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 10, width: 34, height: 34, fontSize: 13, fontWeight: 800, background: j.nps === n ? 'var(--mint-d)' : '#f3f3f8', color: j.nps === n ? '#fff' : 'var(--tinta)' }}>{n}</button>
          ))}
        </div>
      </Q>

      <Q n={8} teks="Kalau hanya boleh memberi SATU masukan agar KidzPlayful lebih baik, apa saran Anda?" tujuan="Prioritas perbaikan utama.">
        <textarea className="kp-input" rows={4} value={j.saran} onChange={(e) => ubah({ saran: e.target.value })} placeholder="Tulis saran utama Anda…" style={{ resize: 'vertical', marginBottom: 0 }} />
      </Q>

      {msg && <div style={{ fontSize: 13, color: '#c0392b', marginBottom: 8 }}>{msg}</div>}
      <button className="kp-btn mint" style={{ width: '100%' }} onClick={kirim} disabled={loading}>{loading ? 'Mengirim…' : 'Kirim Masukan'}</button>
      <button className="kp-btn putih" style={{ width: '100%', marginTop: 8 }} onClick={() => setBuka(false)}>Batal</button>
    </div>
  );
}
