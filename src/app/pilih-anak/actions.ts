// src/app/pilih-anak/actions.ts
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { umurTahun, modeDefault } from '@/lib/domain/anak';

export async function tambahAnak(formData: FormData) {
  const nama = String(formData.get('nama') ?? '').trim();
  const tgl = String(formData.get('tanggal_lahir') ?? '');
  const jk = String(formData.get('jenis_kelamin') ?? '');
  const jenisKelamin = jk === 'laki-laki' || jk === 'perempuan' ? jk : null;
  if (!nama || !tgl) throw new Error('Nama dan tanggal lahir wajib diisi.');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const umur = umurTahun(new Date(tgl + 'T00:00:00Z'), new Date());
  const mode = modeDefault(umur);

  const { error } = await supabase.from('anak').insert({
    ortu_id: user.id,
    nama,
    tanggal_lahir: tgl,
    mode_default: mode,
    jenis_kelamin: jenisKelamin,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/pilih-anak');
}
