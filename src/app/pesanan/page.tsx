// src/app/pesanan/page.tsx — daftar pesanan user
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPesananSaya } from '@/lib/data/pesanan';
import { formatRupiah, STATUS_PESANAN } from '@/lib/format';
import BottomNav from '@/components/BottomNav';

export default async function PesananPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const list = await getPesananSaya();

  return (
    <main style={{ maxWidth: 480, margin: '24px auto', padding: 16, paddingBottom: 90 }}>
      <h1 style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '4px 0 14px' }}>📦 Pesanan Saya</h1>
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--abu)', padding: '24px 0' }}>
          <div style={{ fontSize: 44 }}>📦</div>
          <p>Belum ada pesanan.</p>
          <Link href="/store" className="kp-btn" style={{ display: 'inline-block', marginTop: 8 }}>Mulai belanja</Link>
        </div>
      ) : list.map((o) => {
        const st = STATUS_PESANAN[o.status] ?? { teks: o.status, warna: 'var(--abu)', bg: '#eee' };
        return (
          <Link key={o.id} href={`/pesanan/${o.id}`} className="kp-card" style={{ display: 'block', marginBottom: 10, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--abu)' }}>#{o.id.slice(0, 8)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: st.warna, background: st.bg, borderRadius: 99, padding: '3px 10px' }}>{st.teks}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ color: 'var(--abu)', fontSize: 13 }}>{new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <b style={{ color: 'var(--lavender-d)' }}>{formatRupiah(o.total)}{o.status === 'menunggu_ongkir' ? ' +' : ''}</b>
            </div>
          </Link>
        );
      })}
      <BottomNav />
    </main>
  );
}
