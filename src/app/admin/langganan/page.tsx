// src/app/admin/langganan/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan } from '@/lib/domain/trial';
import { getPengaturanBayar } from '@/lib/data/pengaturan-bayar';
import { linkWa } from '@/lib/format';
import AktifkanForm from './AktifkanForm';
import Pager from '../Pager';
import s from '../admin.module.css';

const PER_HAL = 30;
// Batas id anak yang ikut dijadikan klausa pencarian (lihat komentar di bawah).
const BATAS_ANAK = 1000;
// Ingatkan perpanjangan bila langganan tinggal ≤ AMBANG_HARI lagi, atau sudah lewat.
const AMBANG_HARI = 7;

type Row = {
  id: string; email: string; created_at: string;
  nama_tampilan: string | null; no_wa: string | null;
  anak: { nama: string }[];
  langganan: { status: string; nominal: number; trial_mulai: string; aktif_sampai: string | null } | null;
};

function tglJam(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
}

function tglSingkat(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// Selisih hari dari hari ini (UTC) ke tanggal aktif_sampai (negatif = sudah lewat).
function sisaHari(aktifSampai: string): number {
  const now = new Date();
  const hariIniUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = new Date(aktifSampai + 'T00:00:00Z').getTime();
  return Math.round((target - hariIniUtc) / 86_400_000);
}

function labelSisa(sisa: number): string {
  return sisa < 0 ? `lewat ${Math.abs(sisa)} hari` : sisa === 0 ? 'berakhir hari ini' : `sisa ${sisa} hari`;
}

// Pesan pengingat perpanjangan untuk member berbayar.
function pesanReminder(nama: string | null, anakNama: string[], aktifSampai: string): string {
  const sisa = sisaHari(aktifSampai);
  const sapa = nama?.trim() || 'Bunda/Ayah';
  const anak = anakNama.join(' & ');
  const kabar = sisa < 0
    ? `masa langganan KidzPlayful Ananda sudah berakhir sejak ${tglSingkat(aktifSampai)}`
    : sisa === 0
      ? `masa langganan KidzPlayful Ananda berakhir hari ini (${tglSingkat(aktifSampai)})`
      : `masa langganan KidzPlayful Ananda akan berakhir dalam ${sisa} hari lagi (${tglSingkat(aktifSampai)})`;
  return `Halo ${sapa} 🌿\n\nKami ingin mengingatkan bahwa ${kabar}. Yuk perpanjang lagi supaya ${anak || 'si kecil'} tetap bisa lanjut belajar & bermain bersama KidzPlayful 🎈\n\nSilakan balas pesan ini untuk info perpanjangan ya. Terima kasih 🙏\n— Admin KidzPlayful`;
}

type Jatuh = { ortu_id: string; email: string; nama_tampilan: string | null; no_wa: string | null; anak: string[]; aktif_sampai: string };

export default async function Langganan({ searchParams }: { searchParams: Promise<{ hal?: string; q?: string }> }) {
  const { hal, q: qRaw } = await searchParams;
  const q = (qRaw ?? '').trim();
  // Karakter yang punya arti khusus di filter PostgREST (`or=(...)`) dan di pola ILIKE
  // DIBUANG, bukan di-escape: kata kunci nama tak pernah membutuhkannya, sedangkan
  // membiarkannya lewat bisa mengubah bentuk query (mis. koma memecah klausa `or`).
  const cari = q.replace(/[%_,()"*\\]/g, ' ').replace(/\s+/g, ' ').trim();
  const halNum = Math.max(1, Number(hal) || 1);
  const from = (halNum - 1) * PER_HAL;
  const supabase = await createClient();

  // Ambang tanggal (hari ini + AMBANG_HARI) untuk daftar jatuh tempo.
  const t = new Date();
  const cutoff = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + AMBANG_HARI)).toISOString().slice(0, 10);

  // Pencarian nama ortu / anak dijalankan di SERVER karena daftar ini dipaginasi
  // (30/halaman): menyaring di klien hanya akan mencari di halaman yang sedang terbuka.
  // Nama anak ada di tabel lain, dan PostgREST tak bisa meng-OR-kan syarat pada tabel
  // induk dengan syarat pada tabel anak di satu query — jadi id ortu yang anaknya cocok
  // dicari lebih dulu, lalu digabung sebagai klausa `id.in.(...)`.
  let idOrtuDariAnak: string[] = [];
  let anakTerpotong = false;
  if (cari) {
    const { data: anakCocok } = await supabase
      .from('anak').select('ortu_id').ilike('nama', `%${cari}%`).limit(BATAS_ANAK);
    anakTerpotong = (anakCocok ?? []).length >= BATAS_ANAK;   // jangan diam-diam memotong
    idOrtuDariAnak = [...new Set((anakCocok ?? []).map((r) => r.ortu_id as string).filter(Boolean))];
  }

  let qMember = supabase
    .from('profiles')
    .select('id,email,created_at,nama_tampilan,no_wa,anak(nama),langganan(status,nominal,trial_mulai,aktif_sampai)', { count: 'exact' });
  if (cari) {
    const klausa = [`nama_tampilan.ilike.%${cari}%`, `email.ilike.%${cari}%`];
    if (idOrtuDariAnak.length) klausa.push(`id.in.(${idOrtuDariAnak.join(',')})`);
    qMember = qMember.or(klausa.join(','));
  }

  const [{ data, count }, bayar, jatuhRes] = await Promise.all([
    qMember.order('created_at', { ascending: false }).range(from, from + PER_HAL - 1),
    getPengaturanBayar(),
    supabase
      .from('langganan')
      .select('ortu_id,aktif_sampai,ortu:ortu_id(email,nama_tampilan,no_wa,anak(nama))')
      .not('aktif_sampai', 'is', null)
      .lte('aktif_sampai', cutoff)
      .order('aktif_sampai', { ascending: true }),
  ]);

  const rows = (data ?? []) as unknown as Row[];
  const total = count ?? 0;
  const totalHal = Math.max(1, Math.ceil(total / PER_HAL));
  const now = new Date();

  // Normalisasi daftar jatuh tempo (embed ortu bisa object/array tergantung PostgREST).
  const jatuh: Jatuh[] = ((jatuhRes.data ?? []) as unknown as { ortu_id: string; aktif_sampai: string; ortu: { email: string; nama_tampilan: string | null; no_wa: string | null; anak: { nama: string }[] } | { email: string; nama_tampilan: string | null; no_wa: string | null; anak: { nama: string }[] }[] | null }[])
    .map((r) => {
      const o = Array.isArray(r.ortu) ? r.ortu[0] : r.ortu;
      return o ? { ortu_id: r.ortu_id, email: o.email, nama_tampilan: o.nama_tampilan, no_wa: o.no_wa, anak: (o.anak ?? []).map((a) => a.nama), aktif_sampai: r.aktif_sampai } : null;
    })
    .filter((x): x is Jatuh => x !== null);

  // Daftar jatuh tempo ikut disaring memakai kata kunci yang sama supaya hasil pencarian
  // konsisten di kedua bagian halaman (daftar ini kecil & sudah termuat penuh → saring di JS).
  const kunci = cari.toLowerCase();
  const jatuhTampil = kunci
    ? jatuh.filter((j) => [j.nama_tampilan ?? '', j.email, ...j.anak].some((t) => t.toLowerCase().includes(kunci)))
    : jatuh;

  function statusEfektif(l: Row['langganan']) {
    if (!l) return 'kadaluarsa';
    return statusLangganan(
      { trialMulai: new Date(l.trial_mulai + 'T00:00:00Z'), aktifSampai: l.aktif_sampai ? new Date(l.aktif_sampai + 'T00:00:00Z') : null },
      now,
    );
  }
  const warna: Record<string, string> = { aktif: s.tagOk, trial: s.tagDraf, tenggang: s.tagDraf, kadaluarsa: s.danger };

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>💳 Kelola Langganan</h1><Link href="/admin/laporan" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>📊 Laporan</Link></div>
      <p className={s.muted}>Setelah member transfer/QRIS, klik Aktifkan (langganan +1 bulan).</p>

      {/* Form GET biasa (bukan komponen klien): pencariannya server-side, dan menekan
          Cari otomatis membuang `hal` sehingga hasil selalu mulai dari halaman 1. */}
      <form method="get" className={s.row} style={{ gap: 8, margin: '10px 0 14px', flexWrap: 'wrap' }}>
        <input className={s.inp} type="search" name="q" defaultValue={q}
          placeholder="🔎 Cari nama orang tua / nama anak / email…"
          style={{ flex: 1, minWidth: 200, marginBottom: 0 }} />
        <button type="submit" className={s.btnSm} style={{ background: 'var(--lavender-d)', color: '#fff' }}>Cari</button>
        {q && <Link href="/admin/langganan" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>✕ Reset</Link>}
      </form>
      {cari && (
        <p className={s.muted} style={{ marginTop: -6 }}>
          <b>{total}</b> member cocok dengan &quot;{cari}&quot; (nama orang tua, nama anak, atau email).
          {anakTerpotong && ' Kata kuncinya terlalu umum — pencocokan nama anak dibatasi 1.000 data teratas, persempit kata kuncinya.'}
        </p>
      )}

      {/* ==== Jatuh tempo / perlu diingatkan (semua halaman) ==== */}
      <details className={s.card} open style={{ borderLeft: '4px solid #25D366' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--lavender-d)' }}>
          🔔 Perlu diingatkan ({jatuhTampil.length}) · jatuh tempo ≤ {AMBANG_HARI} hari / sudah lewat{cari ? ' · hasil pencarian' : ''}
        </summary>
        {jatuhTampil.length === 0 && <p className={s.muted} style={{ marginTop: 10 }}>{cari ? 'Tidak ada yang cocok dengan pencarian.' : 'Tidak ada langganan yang mendekati jatuh tempo. 🎉'}</p>}
        {jatuhTampil.map((j) => {
          const sisa = sisaHari(j.aktif_sampai);
          const href = linkWa(j.no_wa, pesanReminder(j.nama_tampilan, j.anak, j.aktif_sampai));
          return (
            <div key={j.ortu_id} className={s.row} style={{ marginTop: 10, gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ flex: 1, minWidth: 180 }}>
                <b>{j.nama_tampilan?.trim() || j.email}</b>
                <br /><small className={s.muted}>{j.anak.join(', ') || 'belum ada anak'} · aktif s/d {tglSingkat(j.aktif_sampai)} · <b style={{ color: sisa < 0 ? '#c0392b' : sisa <= 2 ? '#d35400' : 'inherit' }}>{labelSisa(sisa)}</b></small>
              </span>
              {href ? (
                <a href={href} target="_blank" rel="noopener" className={s.btnSm} style={{ background: '#25D366', color: '#fff', textDecoration: 'none' }}>💬 Ingatkan via WA</a>
              ) : (
                <span className={s.muted} style={{ fontSize: 12 }}>no. WA kosong</span>
              )}
            </div>
          );
        })}
      </details>

      {/* ==== Semua member (per halaman) ==== */}
      {rows.map((m) => {
        const st = statusEfektif(m.langganan);
        const as = m.langganan?.aktif_sampai ?? null;
        const sisa = as != null ? sisaHari(as) : null;
        const perluIngat = as != null && sisa != null && sisa <= AMBANG_HARI;
        const href = perluIngat ? linkWa(m.no_wa, pesanReminder(m.nama_tampilan, m.anak.map((a) => a.nama), as!)) : null;
        return (
          <div key={m.id} className={s.card}>
            <div className={s.row}>
              <span style={{ flex: 1 }}><b>{m.email}</b><br /><span className={s.muted}>{m.anak.map((a) => a.nama).join(', ') || 'belum ada anak'}</span></span>
              <span className={`${s.tag} ${warna[st] ?? ''}`}>{st}</span>
            </div>
            <div className={s.muted} style={{ marginTop: 6 }}>🗓️ Daftar: {tglJam(m.created_at)}</div>
            {as && <div className={s.muted} style={{ marginTop: 4 }}>⏳ Aktif s/d: {tglSingkat(as)}{sisa != null ? ` · ${labelSisa(sisa)}` : ''}</div>}
            {perluIngat && (
              <div style={{ marginTop: 8 }}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener" className={s.btnSm} style={{ background: '#25D366', color: '#fff', textDecoration: 'none' }}>💬 Ingatkan perpanjangan via WA</a>
                ) : (
                  <span className={s.muted} style={{ fontSize: 12 }}>💬 Perlu diingatkan, tapi nomor WA member belum terisi.</span>
                )}
              </div>
            )}
            {st !== 'aktif' && <div style={{ marginTop: 8 }}><AktifkanForm ortuId={m.id} nominalDefault={String(bayar.harga_langganan_nominal)} /></div>}
          </div>
        );
      })}
      {rows.length === 0 && <p className={s.muted}>{cari ? 'Tidak ada member yang cocok dengan pencarian.' : 'Belum ada member.'}</p>}
      <Pager hal={halNum} totalHal={totalHal} total={total} basePath={cari ? `/admin/langganan?q=${encodeURIComponent(q)}` : '/admin/langganan'} />
    </div>
  );
}
