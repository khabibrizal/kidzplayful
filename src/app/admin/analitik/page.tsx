// src/app/admin/analitik/page.tsx — analitik user aktif & aktivitas (data dari Supabase)
import { createClient } from '@/lib/supabase/server';
import { getAktivitasRingkas, labelFitur } from '@/lib/data/aktivitas';
import s from '../admin.module.css';

function jam(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
}

const HARI = 864e5;
const isoLalu = (n: number) => new Date(Date.now() - n * HARI).toISOString();
const MESIN: Record<string, string> = { 'tekan-sesuai': 'Mana Ya', 'seret-wadah': 'Beres-Beres', 'cari-pasangan': 'Cari Pasangan', 'mewarnai': 'Mewarnai' };

function Kartu({ b, l, sub }: { b: string | number; l: string; sub?: string }) {
  return (
    <div className={s.card} style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--lavender-d)' }}>{b}</div>
      <div style={{ fontSize: 12, color: 'var(--abu)' }}>{l}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--abu)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default async function AnalitikPage() {
  const db = await createClient();
  const d1 = isoLalu(1), d7 = isoLalu(7), d30 = isoLalu(30);

  const [anak, hasil, pend, pesn, post, kom, profs, akt, aktEv] = await Promise.all([
    db.from('anak').select('id,ortu_id'),
    db.from('hasil_main').select('anak_id,tanggal,mesin').gte('tanggal', d30),
    db.from('pendaftaran_event').select('ortu_id,created_at').gte('created_at', d30),
    db.from('pesanan').select('ortu_id,created_at').gte('created_at', d30),
    db.from('postingan').select('ortu_id,created_at').gte('created_at', d30),
    db.from('komentar').select('ortu_id,created_at').gte('created_at', d30),
    db.from('profiles').select('id,nama_tampilan'),
    getAktivitasRingkas(),
    db.from('aktivitas').select('ortu_id,dibuat_at').gte('dibuat_at', d30),
  ]);

  const anakOrtu = new Map<string, string>((anak.data ?? []).map((a) => [a.id as string, a.ortu_id as string]));
  const nama = new Map<string, string>((profs.data ?? []).map((p) => [p.id as string, (p.nama_tampilan as string | null)?.trim() || 'Orang Tua']));

  // gabungkan semua aktivitas jadi {ortu, ts}
  type Ev = { ortu: string; ts: string };
  const ev: Ev[] = [];
  for (const r of hasil.data ?? []) { const o = anakOrtu.get(r.anak_id as string); if (o) ev.push({ ortu: o, ts: r.tanggal as string }); }
  for (const r of pend.data ?? []) ev.push({ ortu: r.ortu_id as string, ts: r.created_at as string });
  for (const r of pesn.data ?? []) ev.push({ ortu: r.ortu_id as string, ts: r.created_at as string });
  for (const r of post.data ?? []) ev.push({ ortu: r.ortu_id as string, ts: r.created_at as string });
  for (const r of kom.data ?? []) ev.push({ ortu: r.ortu_id as string, ts: r.created_at as string });
  for (const r of aktEv.data ?? []) ev.push({ ortu: r.ortu_id as string, ts: r.dibuat_at as string }); // buka menu (log aktivitas)

  const aktifSejak = (sejak: string) => new Set(ev.filter((e) => e.ts >= sejak).map((e) => e.ortu)).size;
  const dau = aktifSejak(d1), wau = aktifSejak(d7), mau = aktifSejak(d30);

  const cSesi = (hasil.data ?? []).length;
  const cEvent = (pend.data ?? []).length;
  const cPesanan = (pesn.data ?? []).length;
  const cPost = (post.data ?? []).length;
  const cKom = (kom.data ?? []).length;

  // game terpopuler (30 hari)
  const gm = new Map<string, number>();
  for (const r of hasil.data ?? []) gm.set(r.mesin as string, (gm.get(r.mesin as string) ?? 0) + 1);
  const topGame = [...gm.entries()].sort((a, b) => b[1] - a[1]);

  // user teraktif (30 hari, gabungan semua aktivitas)
  const cnt = new Map<string, number>();
  for (const e of ev) cnt.set(e.ortu, (cnt.get(e.ortu) ?? 0) + 1);
  const topUser = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div>
      <h2 style={{ margin: '4px 0 12px' }}>📈 Analitik</h2>

      <div className={s.section}>User aktif (akun orang tua)</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <Kartu b={dau} l="Aktif hari ini" sub="DAU" />
        <Kartu b={wau} l="Aktif 7 hari" sub="WAU" />
        <Kartu b={mau} l="Aktif 30 hari" sub="MAU" />
      </div>
      <div className={s.muted} style={{ fontSize: 11, marginTop: 4 }}>Aktif = akun yang membuka aplikasi (buka menu) / anaknya main / mendaftar event / memesan / posting / komentar pada periode itu.</div>

      <div className={s.section} style={{ marginTop: 16 }}>Total akun & anak</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <Kartu b={profs.data?.length ?? 0} l="Akun orang tua" />
        <Kartu b={anak.data?.length ?? 0} l="Profil anak" />
      </div>

      <div className={s.section} style={{ marginTop: 16 }}>Aktivitas (30 hari terakhir)</div>
      <div className={s.row} style={{ gap: 10, flexWrap: 'wrap' }}>
        <Kartu b={cSesi} l="Sesi main game" />
        <Kartu b={cEvent} l="Pendaftaran event" />
        <Kartu b={cPesanan} l="Pesanan" />
        <Kartu b={cPost} l="Postingan" />
        <Kartu b={cKom} l="Komentar" />
      </div>

      <div className={s.section} style={{ marginTop: 16 }}>Sedang aktif hari ini (buka menu apa)</div>
      {akt.perUser.length === 0
        ? <p className={s.muted}>Belum ada aktivitas hari ini.</p>
        : akt.perUser.slice(0, 20).map((u, i) => (
          <div key={i} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
            <span><b style={{ color: 'var(--lavender-d)' }}>{labelFitur(u.fitur)}</b> <span className={s.muted}>· {jam(u.waktu)}</span></span>
          </div>
        ))}

      <div className={s.section} style={{ marginTop: 16 }}>Fitur terpopuler hari ini</div>
      {akt.populerHariIni.length === 0
        ? <p className={s.muted}>Belum ada aktivitas hari ini.</p>
        : akt.populerHariIni.map((f) => (
          <div key={f.fitur} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}>
            <b>{labelFitur(f.fitur)}</b><span className={s.muted}>{f.n}x</span>
          </div>
        ))}

      <div className={s.section} style={{ marginTop: 16 }}>Fitur terpopuler (7 hari)</div>
      {akt.populer7h.length === 0
        ? <p className={s.muted}>Belum ada aktivitas.</p>
        : akt.populer7h.map((f) => (
          <div key={f.fitur} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}>
            <b>{labelFitur(f.fitur)}</b><span className={s.muted}>{f.n}x</span>
          </div>
        ))}

      <div className={s.section} style={{ marginTop: 16 }}>Game terpopuler (30 hari)</div>
      {topGame.length === 0
        ? <p className={s.muted}>Belum ada sesi main.</p>
        : topGame.map(([m, n]) => (
          <div key={m} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}>
            <b>{MESIN[m] ?? m}</b><span className={s.muted}>{n}x</span>
          </div>
        ))}

      <div className={s.section} style={{ marginTop: 16 }}>Orang tua teraktif (30 hari)</div>
      {topUser.length === 0
        ? <p className={s.muted}>Belum ada aktivitas.</p>
        : topUser.map(([id, n], i) => (
          <div key={id} className={s.card} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}>
            <span>{i + 1}. {nama.get(id) ?? 'Orang Tua'}</span><span className={s.muted}>{n} aktivitas</span>
          </div>
        ))}
    </div>
  );
}
