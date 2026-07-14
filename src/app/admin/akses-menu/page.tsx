// src/app/admin/akses-menu/page.tsx — Super User atur akses menu per role (matriks)
import { getSuperuserTerjamin } from '@/lib/data/admin';
import { getMenuAkses } from '@/lib/data/pengaturan-menu';
import { simpanMenuAkses } from '@/lib/data/admin-bisnis';
import { MENU_ADMIN, ROLE_AKSES, KEY_KONFIGURABEL, type AksesMenu } from '@/lib/menu-admin';
import s from '../admin.module.css';

export default async function AksesMenuPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await getSuperuserTerjamin();
  const { ok } = await searchParams;
  const akses = await getMenuAkses();
  const has = (role: keyof AksesMenu, key: string) => akses[role].includes(key);
  const daftar = MENU_ADMIN.filter((m) => KEY_KONFIGURABEL.includes(m.key));

  async function simpan(formData: FormData) {
    'use server';
    const ambil = (role: string) => KEY_KONFIGURABEL.filter((k) => formData.get(`${role}_${k}`) === '1');
    await simpanMenuAkses({ admin: ambil('admin'), investor: ambil('investor'), guru: ambil('guru') });
    const { redirect } = await import('next/navigation');
    redirect('/admin/akses-menu?ok=1');
  }

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🔐 Akses Menu</h1></div>
      <p className={s.muted} style={{ fontSize: 13 }}>Centang menu yang boleh diakses tiap role. Role yang punya ≥1 menu dicentang bisa masuk panel admin & hanya melihat menu tersebut. <b>Super User selalu akses semua.</b> Perubahan berlaku langsung.</p>
      {ok && <div className={s.card} style={{ background: '#dff5e6', color: '#1c7a43', fontWeight: 700 }}>Tersimpan ✓</div>}

      <form action={simpan} className={s.card} style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 380, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '2px solid #efe7fb' }}>Menu</th>
              {ROLE_AKSES.map((r) => (
                <th key={r.key} style={{ padding: '8px 6px', borderBottom: '2px solid #efe7fb', whiteSpace: 'nowrap' }}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daftar.map((m) => (
              <tr key={m.key} style={{ borderBottom: '1px solid #f0f0f5' }}>
                <td style={{ padding: '7px 6px' }}>{m.label}</td>
                {ROLE_AKSES.map((r) => (
                  <td key={r.key} style={{ padding: '7px 6px', textAlign: 'center' }}>
                    <input type="checkbox" name={`${r.key}_${m.key}`} value="1" defaultChecked={has(r.key, m.key)} style={{ width: 18, height: 18 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className={s.muted} style={{ fontSize: 12, marginTop: 8 }}>🔐 Akses Menu &amp; 🏠 Dashboard tidak ditampilkan di sini (Akses Menu selalu khusus Super User; Dashboard selalu tersedia bagi yang bisa masuk panel).</p>
        <div style={{ marginTop: 10 }}><button className={s.btn} type="submit">💾 Simpan</button></div>
      </form>
    </div>
  );
}
