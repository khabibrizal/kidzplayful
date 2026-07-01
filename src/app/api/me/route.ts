// GET /api/me -> profil + status langganan
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';
import { statusLangganan } from '@/lib/domain/trial';

export async function GET(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { data: prof } = await a.supabase.from('profiles').select('id,email,nama_tampilan,no_wa,is_admin,is_guru').eq('id', a.user.id).single();
  const { data: lang } = await a.supabase.from('langganan').select('trial_mulai,aktif_sampai').eq('ortu_id', a.user.id).maybeSingle();
  const status = lang ? statusLangganan({ trialMulai: new Date(lang.trial_mulai + 'T00:00:00Z'), aktifSampai: lang.aktif_sampai ? new Date(lang.aktif_sampai + 'T00:00:00Z') : null }, new Date()) : 'kadaluarsa';
  return ok({ profil: prof, status_langganan: status });
}
