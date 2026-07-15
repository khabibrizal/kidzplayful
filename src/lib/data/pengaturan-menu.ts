// src/lib/data/pengaturan-menu.ts — akses menu admin + akses fitur per role (diatur super user)
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_AKSES, DEFAULT_FITUR, type AksesMenu, type AksesFitur } from '@/lib/menu-admin';

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

/** Akses fitur rekomendasi (guru/psikolog). Fallback ke DEFAULT_FITUR per role. */
export async function getFiturAkses(): Promise<AksesFitur> {
  try {
    const s = await createClient();
    const { data } = await s.from('pengaturan_menu').select('fitur').eq('id', 1).single();
    const f = (data?.fitur ?? {}) as Partial<AksesFitur>;
    return {
      guru: f.guru ?? DEFAULT_FITUR.guru,
      psikolog: f.psikolog ?? DEFAULT_FITUR.psikolog,
    };
  } catch {
    return DEFAULT_FITUR;
  }
}
