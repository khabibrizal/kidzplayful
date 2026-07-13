// src/lib/data/pengaturan-trial.ts — izin akses fitur untuk user trial/tenggang (diatur admin)
import { createClient } from '@/lib/supabase/server';

export interface PengaturanTrial {
  trial_kelas: boolean;     // (lama, tak dipakai — akses kelas kini per-item boleh_trial)
  trial_game: boolean;      // (lama, tak dipakai)
  trial_video: boolean;     // (lama, tak dipakai)
  trial_komunitas: boolean; // trial boleh akses fitur Komunitas (global on/off)
  trial_maks_anak: number;  // batas jumlah anak untuk user non-aktif
}

// Default longgar (dipakai bila tabel/baris belum ada, mis. migrasi belum jalan).
export const DEFAULT_TRIAL: PengaturanTrial = {
  trial_kelas: true, trial_game: true, trial_video: true, trial_komunitas: true, trial_maks_anak: 3,
};

/** Ambil izin trial; selalu mengembalikan objek (fallback ke default bila kosong/gagal). */
export async function getPengaturanTrial(): Promise<PengaturanTrial> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('pengaturan_trial')
      .select('trial_kelas,trial_game,trial_video,trial_komunitas,trial_maks_anak')
      .eq('id', 1)
      .single();
    if (!data) return DEFAULT_TRIAL;
    return {
      trial_kelas: data.trial_kelas ?? DEFAULT_TRIAL.trial_kelas,
      trial_game: data.trial_game ?? DEFAULT_TRIAL.trial_game,
      trial_video: data.trial_video ?? DEFAULT_TRIAL.trial_video,
      trial_komunitas: data.trial_komunitas ?? DEFAULT_TRIAL.trial_komunitas,
      trial_maks_anak: data.trial_maks_anak ?? DEFAULT_TRIAL.trial_maks_anak,
    };
  } catch {
    return DEFAULT_TRIAL;
  }
}
