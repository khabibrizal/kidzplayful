// src/lib/data/pengaturan-menu.ts — akses menu admin + akses fitur per role (diatur super user)
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_AKSES, DEFAULT_FITUR, FITUR_MARK, type AksesMenu, type AksesFitur } from '@/lib/menu-admin';

export async function getMenuAkses(): Promise<AksesMenu> {
  try {
    const s = await createClient();
    const { data } = await s.from('pengaturan_menu').select('akses').eq('id', 1).single();
    const a = (data?.akses ?? {}) as Partial<AksesMenu>;
    return {
      admin: a.admin ?? DEFAULT_AKSES.admin,
      investor: a.investor ?? DEFAULT_AKSES.investor,
      guru: a.guru ?? DEFAULT_AKSES.guru,
    };
  } catch {
    return DEFAULT_AKSES;
  }
}

// Config lama (sebelum ada chat/nilai) tak punya penanda FITUR_MARK → aktifkan
// chat & nilai secara default agar tak ada regresi. Setelah super user menyimpan
// ulang (config baru ber-penanda), pilihan menjadi otoritatif.
function normFitur(stored: string[] | undefined, role: 'admin' | 'guru' | 'psikolog'): string[] {
  if (!Array.isArray(stored)) return DEFAULT_FITUR[role];
  if (stored.includes(FITUR_MARK)) return stored.filter((k) => k !== FITUR_MARK);
  return Array.from(new Set([...stored, 'chat', 'nilai']));
}

/** Akses fitur admin/guru/psikolog (chat, nilai, rekomendasi). Fallback per role. */
export async function getFiturAkses(): Promise<AksesFitur> {
  try {
    const s = await createClient();
    const { data } = await s.from('pengaturan_menu').select('fitur').eq('id', 1).single();
    const f = (data?.fitur ?? {}) as Partial<AksesFitur>;
    return {
      admin: normFitur(f.admin, 'admin'),
      guru: normFitur(f.guru, 'guru'),
      psikolog: normFitur(f.psikolog, 'psikolog'),
    };
  } catch {
    return DEFAULT_FITUR;
  }
}
