// src/app/admin/LogoutBtn.tsx
'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutBtn() {
  const router = useRouter();
  async function keluar() {
    const s = createClient();
    await s.auth.signOut();
    router.push('/login');
    router.refresh();
  }
  return (
    <button
      onClick={keluar}
      className="kp-btn"
      style={{ padding: '7px 14px', fontSize: 13, background: '#f3f3f8', color: 'var(--tinta)', boxShadow: '0 3px 0 #e2d8f3' }}
    >
      Keluar
    </button>
  );
}
