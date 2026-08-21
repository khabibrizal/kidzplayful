// src/lib/data/pengaturan-trial.ts — izin akses fitur untuk user trial/tenggang (diatur admin)
import { createClient } from '@/lib/supabase/server';

export interface PengaturanTrial {
  trial_kelas: boolean;     // (lama, tak dipakai — akses kelas kini per-item boleh_trial)
  trial_game: boolean;      // (lama, tak dipakai)
  trial_video: boolean;     // (lama, tak dipakai)
  trial_komunitas: boolean; // trial boleh akses fitur Komunitas (global on/off)
  trial_maks_anak: number;  // batas jumlah anak untuk user non-aktif
  trial_hari: number;             // 0089 — lama masa trial (hari)
  trial_paket_id: string | null;  // 0089 — paket yang hak aksesnya dipakai saat trial
}

// Default longgar (dipakai bila tabel/baris belum ada, mis. migrasi belum jalan).
export const DEFAULT_TRIAL: PengaturanTrial = {
  trial_kelas: true, trial_game: true, trial_video: true, trial_komunitas: true, trial_maks_anak: 3,
  trial_hari: 30, trial_paket_id: null,
};

/** Ambil izin trial; selalu mengembalikan objek (fallback ke default bila kosong/gagal). */
export async function getPengaturanTrial(): Promise<PengaturanTrial> {
  const supabase = await createClient();

  let dasar: PengaturanTrial = { ...DEFAULT_TRIAL };
  try {
    const { data } = await supabase
      .from('pengaturan_trial')
      .select('trial_kelas,trial_game,trial_video,trial_komunitas,trial_maks_anak')
      .eq('id', 1)
      .single();
    if (data) {
      dasar = {
        ...dasar,
        trial_kelas: data.trial_kelas ?? DEFAULT_TRIAL.trial_kelas,
        trial_game: data.trial_game ?? DEFAULT_TRIAL.trial_game,
        trial_video: data.trial_video ?? DEFAULT_TRIAL.trial_video,
        trial_komunitas: data.trial_komunitas ?? DEFAULT_TRIAL.trial_komunitas,
        trial_maks_anak: data.trial_maks_anak ?? DEFAULT_TRIAL.trial_maks_anak,
      };
    }
  } catch {
    return dasar;
  }

  // Kolom migrasi 0089 dibaca TERPISAH. Kalau digabung ke select di atas, satu kolom yang
  // belum ada (42703) akan menggagalkan seluruh pembacaan dan mematikan pembatasan trial
  // yang sudah berjalan. Gagal di sini = pakai bawaan, sisanya tetap terbaca.
  try {
    const { data: baru } = await supabase
      .from('pengaturan_trial').select('trial_hari,trial_paket_id').eq('id', 1).single();
    if (baru) {
      const h = Number(baru.trial_hari);
      dasar.trial_hari = Number.isFinite(h) && h > 0 ? Math.floor(h) : DEFAULT_TRIAL.trial_hari;
      dasar.trial_paket_id = (baru.trial_paket_id as string | null) ?? null;
    }
  } catch { /* migrasi 0089 belum dijalankan — pakai bawaan */ }

  return dasar;
}
