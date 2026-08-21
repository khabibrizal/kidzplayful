// src/app/langganan/PilihPaketForm.tsx — pilih paket per anak, lihat rincian, bayar.
//
// Rincian di layar ini memakai `hitungTagihan` — modul murni yang SAMA dengan yang dipakai
// server saat tagihan dibuat. Jadi tak ada dua rumus yang bisa lepas sinkron; angka di sini
// tetap hanya pratinjau, karena yang tersimpan adalah hitungan server.
'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { kompresGambar } from '@/lib/img';
import { formatRupiah, linkWa } from '@/lib/format';
import { hitungTagihan } from '@/lib/domain/langganan-harga';
import { buatTagihan, unggahBuktiTagihan, batalkanTagihan, setPaketBerikutnya } from '@/lib/data/tagihan-actions';
import { cekVoucher } from '@/lib/data/voucher-actions';
import type { PaketLangganan } from '@/lib/game/tipe';
import type { Tagihan } from '@/lib/data/tagihan';

export interface AnakPaket {
  id: string; nama: string;
  paketId: string | null; paketNama: string | null;
  aktifSampai: string | null; paketBerikutnyaId: string | null;
}

// Nama berkas bukti dibuat di LUAR komponen: aturan lint React menandai `Date.now()` di
// dalam badan komponen sebagai pemanggilan tak murni, walaupun di sini letaknya di dalam
// penangan async.
function jalurBukti(ext: string): string {
  return `bukti/${Date.now()}-${Math.floor(Math.random() * 1_000_000)}.${ext}`;
}

const STATUS_TEKS: Record<Tagihan['status'], string> = {
  menunggu_bayar: 'Menunggu pembayaran',
  menunggu_verifikasi: 'Menunggu verifikasi admin',
  diterima: 'Lunas',
  ditolak: 'Ditolak',
};

export default function PilihPaketForm({ anak, paket, tagihan, bank, qris, waAdmin, hariIni }: {
  anak: AnakPaket[]; paket: PaketLangganan[]; tagihan: Tagihan[];
  bank: string; qris: string; waAdmin: string;
  /** tanggal hari ini (WIB, 'YYYY-MM-DD') — dihitung di SERVER, bukan dari jam browser */
  hariIni: string;
}) {
  const router = useRouter();
  const [pilihan, setPilihan] = useState<Record<string, string>>({});
  const [bulan, setBulan] = useState('1');
  const [kodeVoucher, setKodeVoucher] = useState('');
  const [voucher, setVoucher] = useState<{ kode: string; potongan: number } | null>(null);
  const [vMsg, setVMsg] = useState('');
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [pesan, setPesan] = useState('');

  const petaPaket = useMemo(() => new Map(paket.map((p) => [p.id, p])), [paket]);
  const nBulan = Math.max(1, Number(bulan) || 1);

  // Item terpilih → dipakai untuk pratinjau rincian.
  const item = useMemo(() => Object.entries(pilihan)
    .filter(([, pid]) => pid)
    .map(([anakId, pid]) => ({ anakId, paket: petaPaket.get(pid)! }))
    .filter((x) => x.paket), [pilihan, petaPaket]);

  const rincian = useMemo(() => hitungTagihan({
    item, bulan: nBulan,
    voucher: voucher ? { tipe: 'nominal', nilai: voucher.potongan } : null,
  }), [item, nBulan, voucher]);

  const tagihanTerbuka = tagihan.find((t) => t.status === 'menunggu_bayar' || t.status === 'menunggu_verifikasi');

  async function terapkanVoucher() {
    setVMsg('');
    if (!kodeVoucher.trim()) { setVMsg('Masukkan kode voucher.'); return; }
    const dasar = Math.max(0, rincian.subtotal - rincian.diskonKeluarga);
    if (dasar <= 0) { setVMsg('Pilih paket dulu.'); return; }
    const r = await cekVoucher(kodeVoucher, 'langganan', dasar);
    if (!r.ok) { setVoucher(null); setVMsg(r.error ?? 'Voucher tidak valid.'); return; }
    setVoucher({ kode: r.kode ?? kodeVoucher.toUpperCase(), potongan: r.potongan ?? 0 });
    setVMsg(`Voucher ${r.kode} diterapkan −${formatRupiah(r.potongan ?? 0)}`);
  }

  async function buat() {
    if (item.length === 0) { setPesan('Pilih paket untuk minimal satu anak.'); return; }
    setSibuk('buat'); setPesan('');
    const r = await buatTagihan({ pilihan, bulan: nBulan, kodeVoucher: voucher ? kodeVoucher : '' });
    setSibuk(null);
    if (r.ok) { setPesan(`Tagihan dibuat: ${formatRupiah(r.total ?? 0)}. Silakan transfer lalu unggah buktinya.`); router.refresh(); }
    else setPesan(r.error ?? 'Gagal membuat tagihan.');
  }

  async function unggah(tagihanId: string, file: File) {
    setSibuk(tagihanId); setPesan('');
    try {
      const sb = createClient();
      const { blob, ext } = await kompresGambar(file, { maksDim: 1280, kualitas: 0.8 });
      const path = jalurBukti(ext);
      const { error } = await sb.storage.from('aset').upload(path, blob, { upsert: false, contentType: blob.type || undefined });
      if (error) throw new Error(error.message);
      const url = sb.storage.from('aset').getPublicUrl(path).data.publicUrl;
      const r = await unggahBuktiTagihan(tagihanId, url);
      if (!r.ok) throw new Error(r.error ?? 'Gagal menyimpan bukti');
      setPesan('Bukti terkirim — menunggu verifikasi admin ✓');
      router.refresh();
    } catch (e) {
      setPesan(e instanceof Error ? e.message : 'Gagal mengunggah bukti.');
    } finally { setSibuk(null); }
  }

  async function batal(tagihanId: string) {
    if (!confirm('Batalkan tagihan ini?')) return;
    setSibuk(tagihanId);
    const r = await batalkanTagihan(tagihanId);
    setSibuk(null);
    if (r.ok) { setPesan('Tagihan dibatalkan.'); router.refresh(); }
    else setPesan(r.error ?? 'Gagal');
  }

  async function simpanBerikutnya(anakId: string, paketId: string) {
    setSibuk(anakId);
    const r = await setPaketBerikutnya(anakId, paketId || null);
    setSibuk(null);
    if (r.ok) { setPesan('Pilihan paket bulan depan disimpan ✓'); router.refresh(); }
    else setPesan(r.error ?? 'Gagal');
  }

  return (
    <div>
      {/* ——— Kartu paket ——— */}
      <div className="kp-grid-kartu" style={{ marginBottom: 16 }}>
        {paket.map((p) => (
          <div key={p.id} className="kp-card" style={{ padding: 14 }}>
            <b style={{ color: 'var(--lavender-d)' }}>{p.nama}</b>
            <div style={{ fontSize: 20, fontWeight: 800, margin: '4px 0' }}>{formatRupiah(p.harga_bulanan)}
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--abu)' }}> / anak / bulan</span></div>
            {p.deskripsi && <div style={{ fontSize: 12, color: 'var(--abu)', marginBottom: 6 }}>{p.deskripsi}</div>}
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
              {p.benefit.map((b, i) => <li key={i} style={{ margin: '2px 0' }}>{b}</li>)}
            </ul>
            {(p.diskon_keluarga?.length ?? 0) > 0 && (
              <div style={{ fontSize: 12, color: 'var(--mint-d)', marginTop: 8, fontWeight: 700 }}>
                👨‍👩‍👧‍👦 {p.diskon_keluarga.map((r) => `${r.min_anak}+ anak: ${r.persen ? `hemat ${r.persen}%` : `hemat ${formatRupiah(r.nominal ?? 0)}`}`).join(' · ')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ——— Pilih per anak ———
          Anak yang MASIH AKTIF tidak diberi dropdown pemilihan paket (permintaan pemilik):
          paketnya sudah berjalan, jadi yang relevan hanya "mau paket apa mulai periode
          berikutnya". Untuk membayar periode berikutnya lebih awal ada centang "Perpanjang",
          yang memakai paket berikutnya bila sudah dipilih — kalau tidak, paket yang sekarang.
          Tanpa centang itu, orang tua yang masih aktif tak punya cara memperpanjang dan
          langganannya akan sempat terputus dulu. */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '8px 0' }}>PAKET TIAP ANAK</div>
      {anak.map((a) => {
        const aktif = !!a.aktifSampai && a.aktifSampai >= hariIni;
        const paketPerpanjangan = a.paketBerikutnyaId ?? a.paketId;
        const namaPerpanjangan = paket.find((p) => p.id === paketPerpanjangan)?.nama ?? a.paketNama;
        return (
        <div key={a.id} className="kp-card" style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 140 }}>
              <b>🧒 {a.nama}</b>
              <br /><small style={{ color: 'var(--abu)' }}>
                {aktif
                  ? `${a.paketNama ?? 'Paket'} · aktif s/d ${a.aktifSampai}`
                  : a.aktifSampai ? `masa aktif berakhir ${a.aktifSampai}` : 'belum berlangganan'}
              </small>
            </span>

            {aktif ? (
              <span className="kp-chip" style={{ background: 'var(--mint)' }}>✓ Sedang aktif</span>
            ) : (
              <select className="kp-input" value={pilihan[a.id] ?? ''} style={{ width: 170 }}
                onChange={(e) => setPilihan({ ...pilihan, [a.id]: e.target.value })}>
                <option value="">— tidak ikut —</option>
                {paket.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            )}
          </div>

          {aktif && (
            <>
              <div style={{ marginTop: 8, borderTop: '1px dashed #eee', paddingTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <small style={{ color: 'var(--abu)', flex: 1, minWidth: 150 }}>
                  Paket mulai periode berikutnya
                  {a.paketBerikutnyaId && <> — <b>{paket.find((p) => p.id === a.paketBerikutnyaId)?.nama}</b></>}
                </small>
                <select className="kp-input" value={a.paketBerikutnyaId ?? ''} style={{ width: 170 }}
                  disabled={sibuk === a.id}
                  onChange={(e) => simpanBerikutnya(a.id, e.target.value)}>
                  <option value="">lanjut paket sekarang</option>
                  {paket.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
              </div>
              {paketPerpanjangan && (
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, fontSize: 12, color: 'var(--abu)' }}>
                  <input type="checkbox" checked={!!pilihan[a.id]}
                    onChange={(e) => setPilihan({ ...pilihan, [a.id]: e.target.checked ? paketPerpanjangan : '' })} />
                  Perpanjang sekarang ({namaPerpanjangan}) — masa aktif ditambah dari {a.aktifSampai}
                </label>
              )}
            </>
          )}
        </div>
        );
      })}

      {/* ——— Rincian ——— */}
      {item.length > 0 && (
        <div className="kp-card" style={{ padding: 14, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>🧾 Rincian</span>
            <span style={{ fontSize: 12, color: 'var(--abu)' }}>Bayar untuk</span>
            <input className="kp-input" type="number" min={1} max={12} value={bulan}
              onChange={(e) => setBulan(e.target.value)} style={{ width: 70 }} />
            <span style={{ fontSize: 12, color: 'var(--abu)' }}>bulan</span>
          </div>
          {item.map((it) => {
            const a = anak.find((x) => x.id === it.anakId);
            return (
              <div key={it.anakId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '2px 0' }}>
                <span>{a?.nama} · {it.paket.nama}</span><span>{formatRupiah(it.paket.harga_bulanan * nBulan)}</span>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 6, paddingTop: 6, borderTop: '1px solid #eee' }}>
            <span>Subtotal</span><span>{formatRupiah(rincian.subtotal)}</span>
          </div>
          {rincian.diskonKeluarga > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--mint-d)' }}>
              <span>Diskon keluarga ({item.length} anak{rincian.paketAcuan ? `, aturan ${rincian.paketAcuan.nama}` : ''})</span>
              <span>−{formatRupiah(rincian.diskonKeluarga)}</span>
            </div>
          )}
          {rincian.potonganVoucher > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--mint-d)' }}>
              <span>🎟️ {voucher?.kode}</span><span>−{formatRupiah(rincian.potonganVoucher)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: 6, paddingTop: 6, borderTop: '1px solid #eee' }}>
            <span>Total</span><span>{formatRupiah(rincian.total)}</span>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🎟️ Punya kode voucher?</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="kp-input" placeholder="Kode voucher" value={kodeVoucher} style={{ flex: 1 }}
                onChange={(e) => { setKodeVoucher(e.target.value.toUpperCase()); setVoucher(null); }} />
              <button type="button" className="kp-btn putih" onClick={terapkanVoucher}>Terapkan</button>
            </div>
            {vMsg && <div style={{ fontSize: 12, marginTop: 4, color: voucher ? 'var(--mint-d)' : '#c0392b' }}>{vMsg}</div>}
          </div>

          {tagihanTerbuka ? (
            <p style={{ fontSize: 12, color: '#b88600', marginTop: 10 }}>
              Masih ada tagihan yang belum selesai di bawah. Selesaikan atau batalkan dulu ya 🙏
            </p>
          ) : (
            <button className="kp-btn" style={{ marginTop: 10, width: '100%' }} onClick={buat} disabled={sibuk === 'buat'}>
              {sibuk === 'buat' ? 'Membuat tagihan…' : `Buat tagihan ${formatRupiah(rincian.total)}`}
            </button>
          )}
          <p style={{ fontSize: 11, color: 'var(--abu)', marginTop: 8, marginBottom: 0 }}>
            Menaikkan paket di tengah periode dibayar <b>satu bulan penuh</b> — sisa hari paket lama tidak dikonversi.
            Menurunkan paket dipilih di bagian &quot;paket mulai periode berikutnya&quot; dan berlaku saat perpanjangan.
          </p>
        </div>
      )}

      {/* ——— Tagihan saya ——— */}
      {tagihan.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--abu)', margin: '18px 0 8px' }}>TAGIHAN SAYA</div>
          {tagihan.map((t) => (
            <div key={t.id} className="kp-card" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ flex: 1, minWidth: 160 }}>
                  <b>{formatRupiah(t.total)}</b>{t.bulan > 1 ? ` · ${t.bulan} bln` : ''}
                  <br /><small style={{ color: 'var(--abu)' }}>{t.item.map((i) => `${i.anak_nama} (${i.paket_nama ?? '—'})`).join(', ')}</small>
                  {t.status === 'ditolak' && t.alasan_tolak && <><br /><small style={{ color: '#c0392b' }}>❌ {t.alasan_tolak}</small></>}
                </span>
                <span className="kp-chip" style={{ background: t.status === 'diterima' ? 'var(--mint)' : '#f3f0fb', height: 'fit-content' }}>
                  {STATUS_TEKS[t.status]}
                </span>
              </div>

              {t.status === 'menunggu_bayar' && (
                <div style={{ marginTop: 10, borderTop: '1px dashed #eee', paddingTop: 10 }}>
                  <div style={{ fontSize: 13 }}>💳 Transfer <b>{formatRupiah(t.total)}</b> ke:</div>
                  <div style={{ fontSize: 13, margin: '4px 0' }}>{bank}</div>
                  {qris && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qris} alt="QRIS" style={{ width: 180, maxWidth: '100%', borderRadius: 12, margin: '6px 0' }} />
                  )}
                  <label className="kp-btn putih" style={{ display: 'inline-block', cursor: 'pointer' }}>
                    {sibuk === t.id ? 'Mengunggah…' : '⬆ Unggah bukti transfer'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) unggah(t.id, f); }} />
                  </label>
                  <button className="kp-btn putih" style={{ display: 'inline-block', marginLeft: 8 }}
                    onClick={() => batal(t.id)} disabled={sibuk === t.id}>Batalkan</button>
                </div>
              )}

              {t.status === 'menunggu_verifikasi' && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--abu)' }}>
                  {t.total <= 0
                    ? 'Tidak ada yang perlu ditransfer — diskon menutup seluruh tagihan. Menunggu verifikasi admin 🌿'
                    : 'Bukti sudah kami terima. Admin akan memverifikasi, biasanya di hari yang sama 🌿'}
                  {linkWa(waAdmin, `Halo Admin KidzPlayful 🙏 Saya sudah transfer ${formatRupiah(t.total)} untuk langganan (${t.item.map((i) => i.anak_nama).join(', ')}) dan sudah unggah buktinya. Mohon diproses ya, terima kasih.`) && (
                    <><br /><a className="kp-btn putih" style={{ display: 'inline-block', marginTop: 6 }}
                      href={linkWa(waAdmin, `Halo Admin KidzPlayful 🙏 Saya sudah transfer ${formatRupiah(t.total)} untuk langganan (${t.item.map((i) => i.anak_nama).join(', ')}) dan sudah unggah buktinya. Mohon diproses ya, terima kasih.`)!}
                      target="_blank" rel="noopener noreferrer">💬 Konfirmasi via WhatsApp</a></>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {pesan && (
        <div style={{ position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', background: '#2b2440', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 13, zIndex: 80, maxWidth: '92%' }}>
          {pesan}
        </div>
      )}
    </div>
  );
}
