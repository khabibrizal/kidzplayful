// src/lib/data/konsultasi-bayar-actions.ts — verifikasi pembayaran sesi konsultasi.
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { catatLedger, hapusLedgerRef } from './ledger';

async function adminAtauPsikolog(pendaftaranId: string) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles')
    .select('is_admin,is_superuser,nama_tampilan,email').eq('id', user.id).single();
  const { data: p } = await s.from('pendaftaran_konsultasi')
    .select('id,psikolog_id,total,bukti_url,status,dari_kuota').eq('id', pendaftaranId).maybeSingle();
  if (!p) throw new Error('Sesi konsultasi tidak ditemukan.');
  const boleh = !!prof?.is_admin || !!prof?.is_superuser || p.psikolog_id === user.id;
  if (!boleh) throw new Error('Bukan admin/psikolog sesi ini.');
  const oleh = (prof?.nama_tampilan as string | null)?.trim() || (prof?.email as string | null) || null;
  return { s, p, adminId: user.id, oleh };
}

/**
 * Verifikasi pembayaran → sesi diterima & ruang chat terbuka, pemasukan tercatat.
 * Idempoten: sesi yang sudah diterima langsung dianggap sukses.
 */
export async function verifikasiBayarKonsultasi(pendaftaranId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s, p, adminId, oleh } = await adminAtauPsikolog(pendaftaranId);
    if (p.status === 'diterima') return { ok: true };
    if (p.status !== 'menunggu_bayar') return { ok: false, error: 'Sesi ini tidak sedang menunggu pembayaran.' };

    const { error } = await s.from('pendaftaran_konsultasi').update({
      status: 'diterima', dibayar_pada: new Date().toISOString(),
      diverifikasi_pada: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', pendaftaranId);
    if (error) return { ok: false, error: error.message };

    // Pemasukan dicatat sebesar total (net setelah diskon member & voucher), seperti jalur
    // event & store. Sesi dari kuota paket bernilai 0 dan tidak perlu baris ledger.
    const total = (p.total as number) ?? 0;
    if (total > 0) {
      await catatLedger(s, {
        arah: 'masuk', kategori: 'konsultasi', jumlah: total,
        ref_tipe: 'konsultasi', ref_id: pendaftaranId,
        keterangan: 'Konsultasi psikolog', metode: 'transfer',
        lampiran_url: (p.bukti_url as string | null) ?? null, pic: oleh, dibuat_oleh: adminId,
      });
    }
    revalidatePath('/psikolog'); revalidatePath('/konsultasi'); revalidatePath('/admin/psikolog');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal memverifikasi.' };
  }
}

/** Tolak pembayaran: sesi ditolak, ledger dihapus, kuota voucher dilepas. */
export async function tolakBayarKonsultasi(pendaftaranId: string, alasan: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { s } = await adminAtauPsikolog(pendaftaranId);
    const alsn = alasan.trim();
    if (!alsn) return { ok: false, error: 'Alasan penolakan wajib diisi (tampil ke orang tua).' };
    const { error } = await s.from('pendaftaran_konsultasi')
      .update({ status: 'ditolak', alasan_tolak: alsn, updated_at: new Date().toISOString() })
      .eq('id', pendaftaranId);
    if (error) return { ok: false, error: error.message };
    await hapusLedgerRef(s, 'konsultasi', pendaftaranId);
    await s.from('voucher_redeem').delete().eq('ref_tipe', 'konsultasi').eq('ref_id', pendaftaranId);
    revalidatePath('/psikolog'); revalidatePath('/konsultasi'); revalidatePath('/admin/psikolog');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menolak.' };
  }
}
