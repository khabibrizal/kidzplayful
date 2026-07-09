// src/lib/data/anak.ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { statusLangganan, bolehAkses } from '@/lib/domain/trial';

export async function getAnakTerjamin(anakId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // anak (by anakId) & langganan (by user) independen → jalankan paralel
  const [{ data: anak }, { data: lang }] = await Promise.all([
    supabase.from('anak').select('id,nama,mode_default,batas_menit,koin,tanggal_lahir').eq('id', anakId).single(),
    supabase.from('langganan').select('trial_mulai,aktif_sampai').eq('ortu_id', user.id).single(),
  ]);
  if (!anak) redirect('/pilih-anak'); // RLS memastikan hanya anak milik ortu yang terbaca

  const status = lang
    ? statusLangganan(
        {
          trialMulai: new Date(lang.trial_mulai + 'T00:00:00Z'),
          aktifSampai: lang.aktif_sampai ? new Date(lang.aktif_sampai + 'T00:00:00Z') : null,
        },
        new Date(),
      )
    : 'kadaluarsa';
  if (!bolehAkses(status)) redirect('/pilih-anak');

  return anak;
}
