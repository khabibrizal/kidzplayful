// src/app/konsultasi/BookingForm.tsx — customer daftar konsultasi.
//
// SUMBER DATA (sengaja dipisah, sesuai permintaan pemilik):
//   • Nama, foto, pendidikan, no. STR, pengalaman → master `psikolog_profil` (diisi ADMIN)
//   • Jadwal tersedia & durasi sesi               → `jadwal_psikolog` (diisi PSIKOLOG sendiri)
// Bila master belum terisi (atau migrasi 0087 belum jalan), kartu profil otomatis menyusut
// ke nama dari jadwal — form tetap bisa dipakai.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { daftarKonsultasi } from '@/lib/data/konsultasi-actions';
import { formatTanggal, formatRupiah } from '@/lib/format';
import { cekVoucher } from '@/lib/data/voucher-actions';
import { hitungBiayaKonsultasi } from '@/lib/domain/konsultasi-biaya';
import type { PratinjauKonsultasi } from '@/lib/data/konsultasi-tarif';
import type { JadwalPsikolog } from '@/lib/game/tipe';
import type { ProfilPsikolog } from '@/lib/data/psikolog-profil';

const HARI_S = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const toMin = (t?: string | null) => { const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? '').trim()); return m ? (+m[1]) * 60 + (+m[2]) : NaN; };
const toHHMM = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
function buatSlot(mulai?: string | null, selesai?: string | null, durasi?: number): string[] {
  const a = toMin(mulai), b = toMin(selesai);
  if (isNaN(a) || isNaN(b) || !durasi || durasi <= 0) return [];
  const out: string[] = [];
  for (let t = a; t + durasi <= b; t += durasi) out.push(toHHMM(t));
  return out;
}
/** Daftar tanggal (30 hari ke depan, WIB) yang jatuh pada hari buka psikolog. */
function tanggalTersedia(hariBuka: number[]): string[] {
  if (!hariBuka?.length) return [];
  const out: string[] = [];
  const base = Date.now() + 7 * 3600 * 1000; // WIB
  for (let i = 0; i < 30; i++) {
    const d = new Date(base + i * 86400000);
    if (hariBuka.includes(d.getUTCDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
/** "Min – Sab" bila hari buka berurutan, selain itu daftar singkat "Min, Sen, Rab". */
function ringkasHari(hari: number[]): string {
  const h = [...new Set(hari ?? [])].sort((a, b) => a - b);
  if (!h.length) return '—';
  const berurutan = h.every((v, i) => i === 0 || v === h[i - 1] + 1);
  return berurutan && h.length > 2 ? `${HARI_S[h[0]]} – ${HARI_S[h[h.length - 1]]}` : h.map((x) => HARI_S[x]).join(', ');
}

const Avatar = ({ url, ukuran = 40 }: { url?: string | null; ukuran?: number }) =>
  url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt="" style={{ width: ukuran, height: ukuran, borderRadius: ukuran / 3.2, objectFit: 'cover', flexShrink: 0 }} />
    : <span style={{ width: ukuran, height: ukuran, borderRadius: ukuran / 3.2, background: '#efe7fb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: ukuran * 0.5, flexShrink: 0 }}>🧠</span>;

const Badge = ({ teks }: { teks?: string | null }) =>
  teks ? <span style={{ background: '#e9e3fb', color: 'var(--lavender-d)', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>{teks}</span> : null;

function BarisInfo({ ikon, judul, isi }: { ikon: string; judul: string; isi: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ width: 38, height: 38, borderRadius: 12, background: '#efe9fb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{ikon}</span>
      <span style={{ minWidth: 0 }}>
        <b style={{ fontSize: 13 }}>{judul}</b>
        <br /><small style={{ color: 'var(--abu)' }}>{isi}</small>
      </span>
    </div>
  );
}

function Baris({ ket, nilai, hijau }: { ket: string; nilai: string; hijau?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: hijau ? 'var(--mint-d)' : undefined }}>
      <span>{ket}</span><span>{nilai}</span>
    </div>
  );
}

export default function BookingForm({ psikolog, anak, profil = {}, pratinjau }: {
  psikolog: JadwalPsikolog[];
  anak: { id: string; nama: string }[];
  profil?: Record<string, ProfilPsikolog>;
  /** tarif per psikolog + sisa kuota gratis per anak (dibaca di server) */
  pratinjau: PratinjauKonsultasi;
}) {
  const router = useRouter();
  const [psikologId, setPsikologId] = useState('');
  const [anakId, setAnakId] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');
  const [keluhan, setKeluhan] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [bukaPilih, setBukaPilih] = useState(false);
  const [lengkap, setLengkap] = useState(false);
  const [kodeVoucher, setKodeVoucher] = useState('');
  const [voucher, setVoucher] = useState<{ id: string; kode: string; potongan: number } | null>(null);
  const [vMsg, setVMsg] = useState('');

  const dipilih = psikolog.find((p) => p.psikolog_id === psikologId);
  const pr = psikologId ? profil[psikologId] : undefined;
  const dates = dipilih ? tanggalTersedia(dipilih.hari_buka) : [];
  const slots = dipilih ? buatSlot(dipilih.jam_mulai, dipilih.jam_selesai, dipilih.durasi_menit) : [];
  const adaWindow = !!(dipilih && dipilih.jam_mulai && dipilih.jam_selesai);
  const namaDari = (id: string) => profil[id]?.nama || psikolog.find((p) => p.psikolog_id === id)?.nama || 'Psikolog';

  // Pratinjau biaya memakai modul yang MENIRU perhitungan RPC. Angka finalnya tetap
  // dihitung server saat mendaftar — di sini hanya supaya orang tua tahu sebelum menekan
  // Daftar, dan supaya kode voucher punya konteks nominal.
  const tarifPsi = psikologId ? pratinjau.tarif[psikologId] : undefined;
  const kuotaAnak = anakId ? pratinjau.anak[anakId] : undefined;
  const biaya = hitungBiayaKonsultasi({
    tarif: tarifPsi?.harga ?? 0,
    diskonPersen: tarifPsi?.diskonPersen ?? 0,
    member: kuotaAnak?.member ?? false,
    sisaKuota: kuotaAnak?.sisaKuota ?? 0,
    potonganVoucher: voucher?.potongan ?? 0,
  });
  // Voucher hanya masuk akal bila ada yang harus dibayar.
  const bolehVoucher = !!psikologId && !!anakId && !biaya.dariKuota && biaya.subtotal > 0;

  async function terapkanVoucher() {
    setVMsg('');
    if (!kodeVoucher.trim()) { setVMsg('Masukkan kode voucher.'); return; }
    const r = await cekVoucher(kodeVoucher, 'konsultasi', biaya.subtotal);
    if (!r.ok || !r.voucher_id) { setVoucher(null); setVMsg(r.error ?? 'Voucher tidak valid.'); return; }
    setVoucher({ id: r.voucher_id, kode: r.kode ?? kodeVoucher.toUpperCase(), potongan: r.potongan ?? 0 });
    setVMsg(`Voucher ${r.kode} diterapkan -${formatRupiah(r.potongan ?? 0)}`);
  }

  function gantiPsikolog(id: string) {
    setPsikologId(id); setTanggal(''); setJam(''); setMsg(''); setLengkap(false); setBukaPilih(false);
  }

  async function submit() {
    if (!psikologId || !anakId || !tanggal) { setOk(false); setMsg('Lengkapi psikolog, anak, dan tanggal.'); return; }
    if (adaWindow && !jam) { setOk(false); setMsg('Pilih jam konsultasi dulu.'); return; }
    setBusy(true); setMsg(''); setOk(false);
    // Hanya ID-nya yang dikirim; potongannya dihitung ulang di dalam RPC.
    const r = await daftarKonsultasi({ psikologId, anakId, tanggal, jam, keluhan, voucherId: bolehVoucher ? voucher?.id ?? null : null });
    setBusy(false);
    if (r.ok) {
      setOk(true);
      // Pesannya harus jujur: sesi berbayar BELUM terdaftar sampai dibayar (0096).
      setMsg(biaya.dariKuota || biaya.total === 0
        ? 'Pendaftaran terkirim ✓ Menunggu persetujuan psikolog.'
        : 'Pendaftaran terkirim ✓ Lanjutkan pembayaran di daftar bawah — slot baru aman setelah bukti transfer diunggah.');
      setTanggal(''); setJam(''); setKeluhan(''); setKodeVoucher(''); setVoucher(null); setVMsg('');
      router.refresh();
    }
    else { setOk(false); setMsg(r.error ?? 'Gagal mendaftar.'); }
  }

  if (psikolog.length === 0) return <p style={{ color: 'var(--abu)', fontSize: 13 }}>Belum ada psikolog yang membuka jadwal konsultasi. Silakan cek lagi nanti.</p>;
  if (anak.length === 0) return <p style={{ color: 'var(--abu)', fontSize: 13 }}>Tambahkan data anak dulu di Beranda sebelum mendaftar konsultasi.</p>;

  const kotak: React.CSSProperties = { width: '100%', background: '#f4f4f8', border: 'none', borderRadius: 14, padding: '13px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 0 };

  return (
    <div className="kp-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Pilih psikolog (menampilkan foto + badge, tak bisa dengan <select> biasa) ── */}
      <div>
        <b style={{ fontSize: 14 }}>Pilih Psikolog</b>
        <div style={{ position: 'relative', marginTop: 8 }}>
          <button type="button" onClick={() => setBukaPilih((v) => !v)} aria-expanded={bukaPilih}
            style={{ ...kotak, background: '#fff', border: '1px solid #e6e1f2', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
            {psikologId ? <Avatar url={pr?.foto_url} /> : <span style={{ fontSize: 20 }}>🧠</span>}
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 14 }}>{psikologId ? namaDari(psikologId) : '— Pilih psikolog —'}</b>
            </span>
            {psikologId && <Badge teks={pr?.badge} />}
            <span style={{ color: 'var(--abu)' }}>⌄</span>
          </button>

          {bukaPilih && (
            <div role="listbox" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: '#fff', borderRadius: 14, boxShadow: '0 10px 28px rgba(91,81,112,.18)', padding: 6, zIndex: 30, maxHeight: 280, overflowY: 'auto' }}>
              {psikolog.map((p) => {
                const q = profil[p.psikolog_id];
                return (
                  <button key={p.psikolog_id} type="button" role="option" aria-selected={p.psikolog_id === psikologId}
                    onClick={() => gantiPsikolog(p.psikolog_id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', background: p.psikolog_id === psikologId ? '#f3f0fb' : 'transparent', padding: '8px 10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <Avatar url={q?.foto_url} ukuran={34} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700 }}>{q?.nama || p.nama || 'Psikolog'}</span>
                    <Badge teks={q?.badge} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Ringkasan jadwal (dari jadwal_psikolog) ── */}
      {dipilih && (
        <div style={{ fontSize: 12.5, color: 'var(--abu)', background: '#f7f5fc', borderRadius: 12, padding: '9px 12px' }}>
          🕐 Buka: {dipilih.hari_buka.length ? dipilih.hari_buka.slice().sort((a, b) => a - b).map((h) => HARI_S[h]).join(', ') : '—'}
          {dipilih.jam_mulai && ` · ${dipilih.jam_mulai}–${dipilih.jam_selesai} WIB`}
          {dipilih.durasi_menit > 0 && ` · ${dipilih.durasi_menit} mnt/sesi`}
          {dipilih.catatan && <><br />{dipilih.catatan}</>}
        </div>
      )}

      {/* ── Kartu profil: kiri = master psikolog, kanan = info dari jadwal ── */}
      {dipilih && (
        <div style={{ background: '#faf9fe', borderRadius: 18, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Avatar url={pr?.foto_url} ukuran={112} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 16 }}>{namaDari(dipilih.psikolog_id)}</b>
                <Badge teks={pr?.badge} />
              </div>
              {pr?.spesialisasi && <div style={{ fontSize: 13, color: 'var(--abu)', marginTop: 2 }}>{pr.spesialisasi}</div>}

              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                {pr?.pendidikan_s1 && <span>🎓 {pr.pendidikan_s1}</span>}
                {pr?.pendidikan_profesi && <span>🏅 {pr.pendidikan_profesi}</span>}
                {pr?.no_str && <span>✅ STR Psikolog: {pr.no_str}</span>}
              </div>

              {pr?.pengalaman && (
                <p style={{ fontSize: 13, color: 'var(--abu)', marginTop: 10, marginBottom: 0, ...(lengkap ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }) }}>
                  {pr.pengalaman}
                </p>
              )}
              {(pr?.pengalaman || pr?.no_str) && (
                <button type="button" onClick={() => setLengkap((v) => !v)}
                  style={{ marginTop: 10, border: '1px solid #ddd6f0', background: '#fff', color: 'var(--lavender-d)', fontWeight: 700, fontSize: 12.5, padding: '7px 14px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {lengkap ? '▴ Tutup profil' : 'ⓘ Lihat Profil Lengkap'}
                </button>
              )}
              {!pr && <p style={{ fontSize: 12.5, color: 'var(--abu)', marginTop: 8, marginBottom: 0 }}>Profil lengkap psikolog ini belum diisi admin.</p>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '1px solid #ece7f7', paddingLeft: 18 }}>
            <BarisInfo ikon="📅" judul="Jadwal Tersedia"
              isi={`${ringkasHari(dipilih.hari_buka)}${dipilih.jam_mulai ? `, ${dipilih.jam_mulai} – ${dipilih.jam_selesai} WIB` : ''}`} />
            <BarisInfo ikon="⏰" judul="Durasi Sesi"
              isi={dipilih.durasi_menit > 0 ? `${dipilih.durasi_menit} menit / sesi` : 'Belum diatur psikolog'} />
            <BarisInfo ikon="💬" judul="Konsultasi via Chat" isi="Balasan menyesuaikan jam praktik" />
            <BarisInfo ikon="📄" judul="Laporan Tersimpan" isi="Tersimpan di laporan tumbuh kembang" />
          </div>
        </div>
      )}

      <select className="kp-input" value={anakId} onChange={(e) => setAnakId(e.target.value)} style={{ ...kotak }}>
        <option value="">— Pilih anak —</option>
        {anak.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}
      </select>

      {dipilih && (
        dates.length === 0
          ? <span style={{ fontSize: 12, color: '#c0392b' }}>Psikolog belum mengatur hari buka.</span>
          : (
            <select value={tanggal} onChange={(e) => setTanggal(e.target.value)} style={kotak}>
              <option value="">— Pilih tanggal (hari buka) —</option>
              {dates.map((d) => <option key={d} value={d}>{formatTanggal(d)}</option>)}
            </select>
          )
      )}

      {dipilih && adaWindow && (
        slots.length > 0
          ? (
            <select value={jam} onChange={(e) => setJam(e.target.value)} style={kotak}>
              <option value="">— Pilih jam —</option>
              {slots.map((sl) => <option key={sl} value={sl}>{sl} - {toHHMM(toMin(sl) + (dipilih.durasi_menit || 0))} WIB</option>)}
            </select>
          )
          : (
            <label style={{ fontSize: 12, color: 'var(--abu)' }}>Jam ({dipilih.jam_mulai}–{dipilih.jam_selesai})
              <input type="time" min={dipilih.jam_mulai ?? undefined} max={dipilih.jam_selesai ?? undefined} value={jam} onChange={(e) => setJam(e.target.value)} style={{ ...kotak, display: 'block', marginTop: 4 }} />
            </label>
          )
      )}

      <textarea placeholder="Keluhan / hal yang ingin dikonsultasikan (opsional)" rows={4} value={keluhan} onChange={(e) => setKeluhan(e.target.value)} style={{ ...kotak, resize: 'vertical' }} />

      {psikologId && anakId && (
        <div style={{ background: '#faf8ff', borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>💳 Biaya sesi</div>
          {biaya.dariKuota ? (
            <div style={{ fontSize: 13, color: 'var(--mint-d)' }}>
              🎁 <b>Gratis</b> — memakai kuota konsultasi dari paket {kuotaAnak?.paketNama ?? 'langganan'}
              {typeof kuotaAnak?.sisaKuota === 'number' && ` (sisa ${kuotaAnak.sisaKuota} sesi)`}.
              Voucher tidak dipakai, jadi tetap tersimpan untuk lain waktu.
            </div>
          ) : (
            <>
              <Baris ket="Tarif konsultasi" nilai={formatRupiah(tarifPsi?.harga ?? 0)} />
              {biaya.diskonDipakai > 0 && (
                <Baris ket={`Diskon member ${biaya.diskonDipakai}%`} nilai={`-${formatRupiah((tarifPsi?.harga ?? 0) - biaya.subtotal)}`} hijau />
              )}
              {voucher && bolehVoucher && <Baris ket={`Voucher ${voucher.kode}`} nilai={`-${formatRupiah(biaya.potongan)}`} hijau />}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid #ece7f7', marginTop: 6, paddingTop: 6 }}>
                <span>Total</span><span>{formatRupiah(biaya.total)}</span>
              </div>
              {(tarifPsi?.harga ?? 0) === 0 && (
                <div style={{ fontSize: 11, color: 'var(--abu)', marginTop: 4 }}>Tarif belum diatur admin — nominal final dihitung ulang saat pendaftaran.</div>
              )}
            </>
          )}

          {bolehVoucher && (
            <div style={{ marginTop: 10, borderTop: '1px dashed #e6e1f2', paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🎟️ Punya kode voucher?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="kp-input" placeholder="Kode voucher" value={kodeVoucher}
                  onChange={(e) => { setKodeVoucher(e.target.value.toUpperCase()); setVoucher(null); setVMsg(''); }}
                  style={{ flex: 1 }} />
                <button type="button" className="kp-btn putih" onClick={terapkanVoucher}>Terapkan</button>
              </div>
              {vMsg && <div style={{ fontSize: 12, color: voucher ? 'var(--mint-d)' : '#c0392b', marginTop: 4 }}>{vMsg}</div>}
              <div style={{ fontSize: 11, color: 'var(--abu)', marginTop: 4 }}>Potongan dihitung ulang di server saat pendaftaran — angka di atas pratinjau.</div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="kp-btn mint" onClick={submit} disabled={busy}>{busy ? 'Mengirim…' : '📅 Daftar Konsultasi'}</button>
        {msg && <span style={{ fontSize: 13, fontWeight: 700, color: ok ? '#1c7a43' : '#c0392b' }}>{msg}</span>}
      </div>
    </div>
  );
}
