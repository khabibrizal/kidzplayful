// src/lib/data/atribusi.ts — agregasi pendaftar dari share (30 hari).
import { createClient } from '@/lib/supabase/server';

export interface AtribusiShare {
  totalShare: number;
  totalOrganik: number;
  perSaluran: Record<string, number>;
  perJenis: Record<string, number>;
}

export async function getAtribusiShare(hari = 30): Promise<AtribusiShare> {
  const db = await createClient();
  const sejak = new Date(Date.now() - hari * 864e5).toISOString();
  const { data } = await db.from('profiles')
    .select('ref_sumber,ref_saluran,ref_jenis,created_at')
    .gte('created_at', sejak);
  const rows = data ?? [];
  let totalShare = 0, totalOrganik = 0;
  const perSaluran: Record<string, number> = {};
  const perJenis: Record<string, number> = {};
  for (const r of rows) {
    if (r.ref_sumber === 'share') {
      totalShare++;
      const sal = (r.ref_saluran as string) || 'native';
      const jen = (r.ref_jenis as string) || 'lainnya';
      perSaluran[sal] = (perSaluran[sal] ?? 0) + 1;
      perJenis[jen] = (perJenis[jen] ?? 0) + 1;
    } else {
      totalOrganik++;
    }
  }
  return { totalShare, totalOrganik, perSaluran, perJenis };
}

export const LABEL_SALURAN: Record<string, string> = {
  whatsapp: 'WhatsApp', facebook: 'Facebook', twitter: 'X (Twitter)', telegram: 'Telegram', salin: 'Salin link', native: 'HP (share sheet)',
};
export const LABEL_JENIS: Record<string, string> = { artikel: 'Artikel', kelas: 'Kelas Bermain', game: 'Game', lainnya: 'Lainnya' };
