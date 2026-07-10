// GET /api/anak -> daftar anak · POST /api/anak { nama, tanggal_lahir } -> tambah anak
import { getAuth, isAuthErr, ok, fail } from '@/lib/api/helpers';
import { umurTahun, modeDefault } from '@/lib/domain/anak';
import { tanggalWIB } from '@/lib/domain/gamifikasi';
import { statusLangganan } from '@/lib/domain/trial';
import { dibatasiTrial } from '@/lib/data/langganan-status';

export async function GET(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  const { data } = await a.supabase.from('anak').select('id,nama,tanggal_lahir,mode_default,batas_menit,koin').order('created_at');
  return ok(data ?? []);
}

export async function POST(req: Request) {
  const a = await getAuth(req); if (isAuthErr(a)) return fail(a.error, a.status);
  let b: { nama?: string; tanggal_lahir?: string };
  try { b = await req.json(); } catch { return fail('Body JSON tidak valid'); }
  if (!b.nama?.trim() || !b.tanggal_lahir) return fail('nama & tanggal_lahir wajib');
  if (b.tanggal_lahir >= tanggalWIB()) return fail('tanggal_lahir harus sebelum hari ini');

  // batas jumlah anak untuk user belum berlangganan (diatur admin)
  const { data: lang } = await a.supabase.from('langganan').select('trial_mulai,aktif_sampai').eq('ortu_id', a.user.id).maybeSingle();
  const status = lang
    ? statusLangganan({ trialMulai: new Date((lang.trial_mulai as string) + 'T00:00:00Z'), aktifSampai: lang.aktif_sampai ? new Date((lang.aktif_sampai as string) + 'T00:00:00Z') : null }, new Date())
    : 'kadaluarsa';
  if (dibatasiTrial(status)) {
    const { data: cfg } = await a.supabase.from('pengaturan_trial').select('trial_maks_anak').eq('id', 1).maybeSingle();
    const maks = (cfg?.trial_maks_anak as number | undefined) ?? 3;
    const { count } = await a.supabase.from('anak').select('id', { count: 'exact', head: true }).eq('ortu_id', a.user.id);
    if ((count ?? 0) >= maks) return fail(`Batas jumlah anak untuk masa trial (${maks}) tercapai. Silakan berlangganan.`, 403);
  }

  const mode = modeDefault(umurTahun(new Date(b.tanggal_lahir + 'T00:00:00Z'), new Date()));
  const { data, error } = await a.supabase.from('anak')
    .insert({ ortu_id: a.user.id, nama: b.nama.trim(), tanggal_lahir: b.tanggal_lahir, mode_default: mode })
    .select('id,nama,tanggal_lahir,mode_default,batas_menit,koin').single();
  if (error) return fail(error.message);
  return ok(data, 201);
}
