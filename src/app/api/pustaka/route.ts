// GET /api/pustaka — pustaka game (tema + paket + video) untuk render game di mobile.
// Klien wajib menghormati boleh_trial per tema bila status langganan user bukan 'aktif'
// (status ikut dikembalikan agar klien bisa gating seperti web).
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';
import { getPustakaDengan } from '@/lib/data/pustaka';
import { statusLangganan } from '@/lib/domain/trial';

export async function GET(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const [pustaka, { data: lang }] = await Promise.all([
    getPustakaDengan(a.supabase),
    a.supabase.from('langganan').select('trial_mulai,aktif_sampai').eq('ortu_id', a.user.id).maybeSingle(),
  ]);
  const status = lang
    ? statusLangganan({ trialMulai: new Date((lang.trial_mulai as string) + 'T00:00:00Z'), aktifSampai: lang.aktif_sampai ? new Date((lang.aktif_sampai as string) + 'T00:00:00Z') : null }, new Date())
    : 'kadaluarsa';
  return ok({ status_langganan: status, pustaka });
}
