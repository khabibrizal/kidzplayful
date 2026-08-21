// src/lib/data/konsultasi-bayar.ts — antrean sesi konsultasi yang menunggu verifikasi bayar.
import { createClient } from '@/lib/supabase/server';
import type { SesiMenungguBayar } from '@/app/admin/psikolog/VerifikasiKonsultasi';

/**
 * Sesi berstatus `menunggu_bayar` untuk halaman admin.
 * TOLERAN: bila migrasi 0092 belum dijalankan, statusnya belum ada → daftar kosong.
 */
export async function getKonsultasiMenungguBayar(): Promise<SesiMenungguBayar[]> {
  const s = await createClient();
  const { data, error } = await s.from('pendaftaran_konsultasi')
    .select('id,anak_nama,tanggal,jam,total,bukti_url,batas_bayar,psikolog:psikolog_id(nama_tampilan)')
    .eq('status', 'menunggu_bayar')
    .order('batas_bayar', { ascending: true });
  if (error) return [];
  return (data ?? []).map((r) => {
    const psi = Array.isArray(r.psikolog) ? r.psikolog[0] : r.psikolog;
    return {
      id: r.id as string,
      anak_nama: (r.anak_nama as string | null) ?? null,
      tanggal: r.tanggal as string,
      jam: (r.jam as string | null) ?? null,
      total: (r.total as number) ?? 0,
      bukti_url: (r.bukti_url as string | null) ?? null,
      batas_bayar: (r.batas_bayar as string | null) ?? null,
      psikolog_nama: (psi as { nama_tampilan?: string | null } | null)?.nama_tampilan ?? null,
    };
  });
}
