// src/components/AktivitasTema.tsx — daftar aktivitas sebuah tema, LENGKAP dengan
// tombol game & checklist evaluasi DI DALAM kartu aktivitasnya masing-masing.
//
// Versi sebelumnya menaruh seluruh checklist di satu blok di bawah semua aktivitas.
// Pemilik mengoreksinya: evaluasi & tautan game harus berada di bagian aktivitas yang
// bersangkutan — orang tua membaca satu aktivitas lalu menilainya, bukan menggulung ke
// bawah dan mencocokkan judul. Yang tetap di paling bawah hanyalah TOMBOL SIMPAN, karena
// satu tema tersimpan sebagai satu baris.
//
// Karena centang seluruh aktivitas berbagi satu state (satu tombol simpan), rendering
// kartu aktivitas ikut pindah ke sini — bukan disebar jadi banyak pulau client.
'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { simpanEvaluasi } from '@/lib/data/kurikulum-actions';
import { ringkasEvaluasi, type ButirEvaluasi } from '@/lib/domain/kurikulum';
import type { AktivitasItem } from '@/lib/game/tipe';

type Centang = Record<string, number[]>;

/**
 * Keadaan awal centang dari hasil TERSIMPAN, dicocokkan lewat **kalimat butir** — bukan
 * indeks. Hasil tersimpan adalah snapshot, dan admin bisa menyisipkan/menghapus butir
 * sesudahnya; pencocokan per indeks akan memindahkan centang ke butir yang salah tanpa ada
 * yang menyadarinya.
 */
function awalDari(aktivitas: AktivitasItem[], tersimpan: ButirEvaluasi[]): Centang {
  const sudah = new Set(tersimpan.filter((b) => b.tercapai).map((b) => `${b.aktivitas} ${b.butir}`));
  const out: Centang = {};
  aktivitas.forEach((a, ai) => {
    const judul = (a.judul ?? '').trim() || `Aktivitas ${ai + 1}`;
    const idx: number[] = [];
    (a.evaluasi ?? []).forEach((butir, bi) => {
      if (sudah.has(`${judul} ${(butir ?? '').trim()}`)) idx.push(bi);
    });
    if (idx.length) out[String(ai)] = idx;
  });
  return out;
}

const kunci = (c: Centang) =>
  JSON.stringify(Object.entries(c).map(([k, v]) => [k, [...v].sort((a, b) => a - b)]).sort());

export default function AktivitasTema({
  kelasId, aktivitas, anakId, anakNama, kembaliUrl, tersimpan = [], peranTersimpan, waktuTersimpan,
}: {
  kelasId: string;
  aktivitas: AktivitasItem[];
  anakId?: string | null;
  anakNama?: string | null;
  kembaliUrl?: string;
  tersimpan?: ButirEvaluasi[];
  peranTersimpan?: string | null;
  waktuTersimpan?: string | null;
}) {
  const router = useRouter();
  const [centang, setCentang] = useState<Centang>(() => awalDari(aktivitas, tersimpan));
  const [awal] = useState<string>(() => kunci(awalDari(aktivitas, tersimpan)));
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');

  const adaEvaluasi = aktivitas.some((a) => (a.evaluasi?.length ?? 0) > 0);
  const ringkas = useMemo(() => {
    const semua: ButirEvaluasi[] = [];
    aktivitas.forEach((a, ai) => {
      (a.evaluasi ?? []).forEach((butir, bi) => {
        semua.push({
          aktivitas: a.judul || `Aktivitas ${ai + 1}`,
          butir,
          tercapai: (centang[String(ai)] ?? []).includes(bi),
        });
      });
    });
    return ringkasEvaluasi(semua);
  }, [aktivitas, centang]);

  const belumTersimpan = kunci(centang) !== awal;

  function toggle(ai: number, bi: number) {
    setPesan('');
    setCentang((c) => {
      const kini = c[String(ai)] ?? [];
      return { ...c, [String(ai)]: kini.includes(bi) ? kini.filter((x) => x !== bi) : [...kini, bi] };
    });
  }

  async function simpan() {
    if (!anakId) return;
    setSibuk(true); setPesan('');
    const r = await simpanEvaluasi(anakId, kelasId, centang);
    setSibuk(false);
    if (!r.ok) { setPesan(r.error ?? 'Gagal menyimpan.'); return; }
    setPesan(`Tersimpan ✓ ${r.tercapai} dari ${r.total} butir tercapai`);
    router.refresh();
  }

  return (
    <>
      {aktivitas.map((a, ai) => (
        <div key={ai} className="kp-card" style={{ marginBottom: 10 }}>
          <b>🎯 {a.judul || `Aktivitas ${ai + 1}`}</b>
          {a.cara_membuat && (
            <>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🛠️ CARA MEMBUAT</div>
              <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.cara_membuat}</p>
            </>
          )}
          {a.langkah?.length > 0 && (
            <>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--abu)' }}>🎲 CARA BERMAIN</div>
              <ol style={{ margin: '4px 0 0 18px', lineHeight: 1.7 }}>
                {a.langkah.map((l, i) => <li key={i}>{l}</li>)}
              </ol>
            </>
          )}
          {a.catatan_ortu && (
            <div style={{ marginTop: 10, background: '#fff3d6', borderRadius: 12, padding: '8px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#b88600' }}>💡 CATATAN UNTUK ORANG TUA</div>
              <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{a.catatan_ortu}</p>
            </div>
          )}

          {/* Game pilihan admin untuk aktivitas INI. Skor game dicatat per anak, jadi tanpa
              anak terpilih tombolnya tak ditampilkan ketimbang menebak siapa yang bermain. */}
          {a.game_paket_id && anakId && (
            <a className="kp-btn putih no-print" style={{ display: 'inline-block', marginTop: 10, fontSize: 13 }}
              href={`/main/${anakId}?paket=${a.game_paket_id}&kembali=${encodeURIComponent(kembaliUrl ?? `/kelas/${kelasId}?anak=${anakId}`)}`}>
              🎮 Mainkan game aktivitas ini
            </a>
          )}

          {/* Evaluasi aktivitas INI — di dalam kartunya, bukan di blok terpisah. */}
          {(a.evaluasi?.length ?? 0) > 0 && (
            <div className="no-print" style={{ marginTop: 10, background: '#faf8ff', borderRadius: 12, padding: '8px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lavender-d)' }}>
                📋 EVALUASI{anakNama ? ` — ${anakNama}` : ''}
              </div>
              {!anakId && (
                <div style={{ fontSize: 12, color: 'var(--abu)', marginTop: 4 }}>Pilih anak dulu untuk menilai.</div>
              )}
              {a.evaluasi!.map((butir, bi) => (
                <label key={bi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 6, fontSize: 14, cursor: anakId ? 'pointer' : 'default' }}>
                  <input type="checkbox" disabled={!anakId} style={{ marginTop: 3 }}
                    checked={(centang[String(ai)] ?? []).includes(bi)} onChange={() => toggle(ai, bi)} />
                  <span>{butir}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* SATU tombol simpan untuk seluruh tema — satu tema tersimpan sebagai satu baris. */}
      {adaEvaluasi && (
        <div className="kp-card no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          {anakId && (
            <button className="kp-btn mint" onClick={simpan} disabled={sibuk}>
              {sibuk ? 'Menyimpan…' : '💾 Simpan evaluasi tema ini'}
            </button>
          )}
          <span style={{ fontSize: 12, color: belumTersimpan ? '#b88600' : 'var(--abu)' }}>
            {ringkas.tercapai} dari {ringkas.total} butir tercapai
            {/* Penanda ini WAJIB ada: checklist yang tampak tersimpan padahal belum adalah
                cara tercepat kehilangan kepercayaan orang tua. */}
            {anakId && (belumTersimpan
              ? ' · belum tersimpan'
              : waktuTersimpan
                ? ` · tersimpan ${new Date(waktuTersimpan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}${peranTersimpan && peranTersimpan !== 'ortu' ? ` oleh ${peranTersimpan}` : ''}`
                : '')}
          </span>
          {pesan && (
            <span style={{ fontSize: 12, color: pesan.includes('✓') ? 'var(--mint-d)' : '#c0392b' }}>{pesan}</span>
          )}
        </div>
      )}
    </>
  );
}
