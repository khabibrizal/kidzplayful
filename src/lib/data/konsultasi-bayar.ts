// src/lib/data/konsultasi-bayar.ts — antrean sesi konsultasi yang menunggu verifikasi bayar.
import { createClient } from '@/lib/supabase/server';
import type { SesiMenungguBayar } from '@/app/admin/psikolog/VerifikasiKonsultasi';

/**
 * Sesi berstatus `menunggu_bayar` untuk halaman admin.
 * TOLERAN: bila migrasi 0092 belum dijalankan, statusnya belum ada → daftar kosong.
 *
 * Nama & nomor WhatsApp orang tua diambil TERPISAH, bukan lewat embed PostgREST
 * (`ortu:ortu_id(...)`): `pendaftaran_konsultasi` punya lebih dari satu foreign key ke
 * `profiles` (ortu & psikolog), dan embed pada tabel bertautan ganda mudah menjadi ambigu
 * (PGRST201) — kegagalannya mematikan SELURUH daftar, bukan hanya kolom nomornya.
 * Hanya ADMIN yang bisa membaca `profiles` orang lain (0056), dan halaman ini memang admin.
 */
export async function getKonsultasiMenungguBayar(): Promise<SesiMenungguBayar[]> {
  const s = await createClient();
  const { data, error } = await s.from('pendaftaran_konsultasi')
    .select('id,ortu_id,anak_nama,tanggal,jam,total,bukti_url,batas_bayar,psikolog:psikolog_id(nama_tampilan)')
    .eq('status', 'menunggu_bayar')
    .order('batas_bayar', { ascending: true });
  if (error) return [];
  const baris = data ?? [];

  const ortuIds = [...new Set(baris.map((r) => r.ortu_id as string).filter(Boolean))];
  const ortu = new Map<string, { nama: string | null; wa: string | null }>();
  if (ortuIds.length) {
    // Gagal baca profil TIDAK mematikan antreannya — tombol WA-nya saja yang tak muncul,
    // dan itu terlihat sebagai keterangan "nomor WA belum terisi".
    const { data: prof } = await s.from('profiles').select('id,nama_tampilan,no_wa').in('id', ortuIds);
    for (const p of prof ?? []) {
      ortu.set(p.id as string, {
        nama: (p.nama_tampilan as string | null) ?? null,
        wa: (p.no_wa as string | null) ?? null,
      });
    }
  }

  return baris.map((r) => {
    const psi = Array.isArray(r.psikolog) ? r.psikolog[0] : r.psikolog;
    const o = ortu.get(r.ortu_id as string) ?? null;
    return {
      id: r.id as string,
      anak_nama: (r.anak_nama as string | null) ?? null,
      tanggal: r.tanggal as string,
      jam: (r.jam as string | null) ?? null,
      total: (r.total as number) ?? 0,
      bukti_url: (r.bukti_url as string | null) ?? null,
      batas_bayar: (r.batas_bayar as string | null) ?? null,
      psikolog_nama: (psi as { nama_tampilan?: string | null } | null)?.nama_tampilan ?? null,
      ortu_nama: o?.nama ?? null,
      ortu_wa: o?.wa ?? null,
    };
  });
}
