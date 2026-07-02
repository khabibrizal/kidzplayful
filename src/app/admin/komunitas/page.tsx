// src/app/admin/komunitas/page.tsx
import { createClient } from '@/lib/supabase/server';
import { moderasiPostingan, hapusPostinganAdmin, moderasiKomentar, hapusKomentarAdmin, tuntaskanLaporan } from '@/lib/data/admin-komunitas';
import s from '../admin.module.css';

export default async function AdminKomunitas() {
  const supabase = await createClient();
  const { data: laporan } = await supabase
    .from('laporan')
    .select('id,alasan,created_at,postingan:postingan_id(id,nama,teks,status),komentar:komentar_id(id,nama,teks,status)')
    .order('created_at', { ascending: false });
  const { data: posts } = await supabase
    .from('postingan').select('id,nama,teks,status,created_at').order('created_at', { ascending: false }).limit(50);

  async function aPostStatus(fd: FormData) { 'use server'; await moderasiPostingan(String(fd.get('id')), fd.get('status') === 'tampil' ? 'tampil' : 'disembunyikan'); }
  async function aPostHapus(fd: FormData) { 'use server'; await hapusPostinganAdmin(String(fd.get('id'))); }
  async function aKomStatus(fd: FormData) { 'use server'; await moderasiKomentar(String(fd.get('id')), fd.get('status') === 'tampil' ? 'tampil' : 'disembunyikan'); }
  async function aKomHapus(fd: FormData) { 'use server'; await hapusKomentarAdmin(String(fd.get('id'))); }
  async function aTuntas(fd: FormData) { 'use server'; await tuntaskanLaporan(String(fd.get('id'))); }

  function pick<T>(v: T | T[] | null): T | null { return Array.isArray(v) ? (v[0] ?? null) : (v ?? null); }

  return (
    <div>
      <div className={s.section}>Dilaporkan ({laporan?.length ?? 0})</div>
      {(laporan ?? []).map((l) => {
        const post = pick(l.postingan as unknown); const kom = pick(l.komentar as unknown);
        const t = (post ?? kom) as { id: string; nama: string; teks: string; status: string } | null;
        const isPost = !!post;
        return (
          <div key={l.id} className={s.card}>
            <div className={s.muted}>{isPost ? 'Postingan' : 'Komentar'} · oleh {t?.nama} · status: {t?.status}</div>
            <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{t?.teks}</p>
            {l.alasan && <div className={s.muted}>Alasan: {l.alasan}</div>}
            <div className={s.row} style={{ marginTop: 8, flexWrap: 'wrap' }}>
              {t && isPost && <form action={aPostStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value={t.status === 'tampil' ? 'sembunyi' : 'tampil'} /><button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>{t.status === 'tampil' ? 'Sembunyikan' : 'Tampilkan'}</button></form>}
              {t && isPost && <form action={aPostHapus}><input type="hidden" name="id" value={t.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>}
              {t && !isPost && <form action={aKomStatus}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value={t.status === 'tampil' ? 'sembunyi' : 'tampil'} /><button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>{t.status === 'tampil' ? 'Sembunyikan' : 'Tampilkan'}</button></form>}
              {t && !isPost && <form action={aKomHapus}><input type="hidden" name="id" value={t.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>}
              <form action={aTuntas}><input type="hidden" name="id" value={l.id} /><button className={s.btnSm} style={{ background: '#e6f7ee', color: '#2e9e63' }}>Selesai (tutup laporan)</button></form>
            </div>
          </div>
        );
      })}
      {(laporan ?? []).length === 0 && <p className={s.muted}>Tidak ada laporan. 🎉</p>}

      <div className={s.section}>Postingan terbaru ({posts?.length ?? 0})</div>
      {(posts ?? []).map((p) => (
        <div key={p.id} className={s.card}>
          <div className={s.muted}>{p.nama} · status: {p.status}</div>
          <p style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{p.teks}</p>
          <div className={s.row} style={{ marginTop: 6 }}>
            <form action={aPostStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={p.status === 'tampil' ? 'sembunyi' : 'tampil'} /><button className={s.btnSm} style={{ background: '#efe7fb', color: 'var(--lavender-d)' }}>{p.status === 'tampil' ? 'Sembunyikan' : 'Tampilkan'}</button></form>
            <form action={aPostHapus}><input type="hidden" name="id" value={p.id} /><button className={`${s.btnSm} ${s.danger}`}>Hapus</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
