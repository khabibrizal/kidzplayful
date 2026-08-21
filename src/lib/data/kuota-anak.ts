// src/lib/data/kuota-anak.ts — sisa kuota konsultasi gratis PER ANAK.
//
// Satu pembaca dipakai bersama oleh kartu anak (`/pilih-anak`) dan pratinjau biaya di form
// booking konsultasi, supaya angka yang dilihat orang tua di dua tempat itu tak pernah
// berbeda. Aturannya sengaja disamakan dengan RPC `daftar_konsultasi`:
//   • member  = `langganan_anak.aktif_sampai >= hari ini (WIB)` DAN paketnya ada
//               (TANPA masa tenggang/trial — RPC pun tidak memakainya);
//   • terpakai= sesi `dari_kuota` pada periode berjalan yang belum batal/ditolak.
import { createClient } from '@/lib/supabase/server';
import { getPaketMap } from './paket';
import { awalPeriode } from '@/lib/domain/kuota-worksheet';
import { sisaKuotaKonsultasi, KOSONG_KONSULTASI, type SisaKonsultasi } from '@/lib/domain/kuota-konsultasi';
import { tanggalWIB } from '@/lib/domain/gamifikasi';

export interface KuotaAnak {
  member: boolean;
  paketNama: string | null;
  /** berlaku sampai (YYYY-MM-DD) bila ada barisnya */
  aktifSampai: string | null;
  konsultasi: SisaKonsultasi;
}

export const KUOTA_ANAK_KOSONG: KuotaAnak = {
  member: false, paketNama: null, aktifSampai: null, konsultasi: KOSONG_KONSULTASI,
};

/** Peta anakId → kuota, untuk semua anak milik ortu yang login. */
export async function getKuotaAnakSaya(): Promise<Record<string, KuotaAnak>> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return {};

  const [{ data: anakList }, { data: baris }, paketMap] = await Promise.all([
    s.from('anak').select('id').eq('ortu_id', user.id),
    s.from('langganan_anak').select('anak_id,paket_id,aktif_sampai').eq('ortu_id', user.id),
    getPaketMap(),
  ]);
  const perAnak = new Map((baris ?? []).map((b) => [b.anak_id as string, b]));
  const hariIni = tanggalWIB();

  const out: Record<string, KuotaAnak> = {};
  for (const a of anakList ?? []) {
    const id = a.id as string;
    const b = perAnak.get(id);
    const aktifSampai = (b?.aktif_sampai as string | null) ?? null;
    const paket = b?.paket_id ? paketMap.get(b.paket_id as string) ?? null : null;
    const member = !!paket && !!aktifSampai && aktifSampai >= hariIni;

    let terpakai = 0;
    if (member && paket && paket.konsultasi_gratis_jumlah > 0) {
      const sejak = awalPeriode(paket.konsultasi_gratis_satuan, new Date());
      // Daftar status POSITIF, bukan `not.in`: kutip & kurung pada filter PostgREST mudah
      // salah bentuk, dan query yang gagal akan terbaca sebagai "kuota masih penuh" —
      // yakni membocorkan sesi gratis.
      let q = s.from('pendaftaran_konsultasi').select('id', { count: 'exact', head: true })
        .eq('anak_id', id).eq('dari_kuota', true)
        .in('status', ['menunggu', 'menunggu_bayar', 'diterima', 'selesai']);
      if (sejak) q = q.gte('created_at', sejak);
      const { count, error } = await q;
      // Kolom `dari_kuota` belum ada (0092 belum jalan) → anggap belum terpakai; jangan
      // mematikan kartunya.
      if (!error) terpakai = count ?? 0;
    }
    out[id] = {
      member,
      paketNama: paket?.nama ?? null,
      aktifSampai,
      konsultasi: sisaKuotaKonsultasi(paket, terpakai, member),
    };
  }
  return out;
}
