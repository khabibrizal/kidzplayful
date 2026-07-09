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

export default async function Langganan({ searchParams }: { searchParams: Promise<{ hal?: string }> }) {
  const { hal } = await searchParams;
  const halNum = Math.max(1, Number(hal) || 1);
  const from = (halNum - 1) * PER_HAL;
  const supabase = await createClient();
  const [{ data, count }, bayar] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,email,created_at,nama_tampilan,no_wa,anak(nama),langganan(status,nominal,trial_mulai,aktif_sampai)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PER_HAL - 1),
    getPengaturanBayar(),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const total = count ?? 0;
  const totalHal = Math.max(1, Math.ceil(total / PER_HAL));
  const now = new Date();

  function statusEfektif(l: Row['langganan']) {
    if (!l) return 'kadaluarsa';
    return statusLangganan(
      { trialMulai: new Date(l.trial_mulai + 'T00:00:00Z'), aktifSampai: l.aktif_sampai ? new Date(l.aktif_sampai + 'T00:00:00Z') : null },
      now,
    );
  }
  const warna: Record<string, string> = { aktif: s.tagOk, trial: s.tagDraf, tenggang: s.tagDraf, kadaluarsa: s.danger };

  // Pesan pengingat perpanjangan untuk member berbayar (punya aktif_sampai).
  function pesanReminder(m: Row): string | null {
    const l = m.langganan;
    if (!l?.aktif_sampai) return null; // hanya member yang pernah berlangganan (bukan trial)
    const sisa = sisaHari(l.aktif_sampai);
    if (sisa > AMBANG_HARI) return null; // masih jauh, belum perlu diingatkan
    const nama = m.nama_tampilan?.trim() || 'Bunda/Ayah';
    const anak = m.anak.map((a) => a.nama).join(' & ');
    const kabar = sisa < 0
      ? `masa langganan KidzPlayful Ananda sudah berakhir sejak ${tglSingkat(l.aktif_sampai)}`
      : sisa === 0
        ? `masa langganan KidzPlayful Ananda berakhir hari ini (${tglSingkat(l.aktif_sampai)})`
        : `masa langganan KidzPlayful Ananda akan berakhir dalam ${sisa} hari lagi (${tglSingkat(l.aktif_sampai)})`;
    return `Halo ${nama} 🌿\n\nKami ingin mengingatkan bahwa ${kabar}. Yuk perpanjang lagi supaya ${anak || 'si kecil'} tetap bisa lanjut belajar & bermain bersama KidzPlayful 🎈\n\nSilakan balas pesan ini untuk info perpanjangan ya. Terima kasih 🙏\n— Admin KidzPlayful`;
  }

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>💳 Kelola Langganan</h1><Link href="/admin/laporan" className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>📊 Laporan</Link></div>
      <p className={s.muted}>Setelah member transfer/QRIS, klik Aktifkan (langganan +1 bulan).</p>

      {rows.map((m) => {
        const st = statusEfektif(m.langganan);
        const pesan = pesanReminder(m);
        const waHref = pesan ? linkWa(m.no_wa, pesan) : null;
        const sisa = m.langganan?.aktif_sampai != null ? sisaHari(m.langganan.aktif_sampai) : null;
        return (
          <div key={m.id} className={s.card}>
            <div className={s.row}>
              <span style={{ flex: 1 }}><b>{m.email}</b><br /><span className={s.muted}>{m.anak.map((a) => a.nama).join(', ') || 'belum ada anak'}</span></span>
              <span className={`${s.tag} ${warna[st] ?? ''}`}>{st}</span>
            </div>
            <div className={s.muted} style={{ marginTop: 6 }}>🗓️ Daftar: {tglJam(m.created_at)}</div>
            {m.langganan?.aktif_sampai && (
              <div className={s.muted} style={{ marginTop: 4 }}>
                ⏳ Aktif s/d: {tglSingkat(m.langganan.aktif_sampai)}
                {sisa != null && (sisa < 0 ? ` · lewat ${Math.abs(sisa)} hari` : sisa === 0 ? ' · berakhir hari ini' : ` · sisa ${sisa} hari`)}
              </div>
            )}
            {pesan && (
              <div style={{ marginTop: 8 }}>
                {waHref ? (
                  <a href={waHref} target="_blank" rel="noopener" className={s.btnSm} style={{ background: '#25D366', color: '#fff', textDecoration: 'none' }}>
                    💬 Ingatkan perpanjangan via WA
                  </a>
                ) : (
                  <span className={s.muted} style={{ fontSize: 12 }}>💬 Perlu diingatkan, tapi nomor WA member belum terisi.</span>
                )}
              </div>
            )}
            {st !== 'aktif' && <div style={{ marginTop: 8 }}><AktifkanForm ortuId={m.id} nominalDefault={String(bayar.harga_langganan_nominal)} /></div>}
          </div>
        );
      })}
      {rows.length === 0 && <p className={s.muted}>Belum ada member.</p>}
      <Pager hal={halNum} totalHal={totalHal} total={total} basePath="/admin/langganan" />
    </div>
  );
}
