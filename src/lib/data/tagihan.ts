// src/lib/data/tagihan.ts — baca tagihan langganan (sisi ortu & admin).
//
// TOLERAN: tabel `tagihan_langganan` (migrasi 0090) mungkin belum ada saat kode ini tayang.
// Bila belum, kembalikan daftar kosong — halaman langganan tetap bisa dibuka (hanya belum
// bisa membuat tagihan), dan halaman admin memberi tahu bahwa migrasinya belum dijalankan.
import { createClient } from '@/lib/supabase/server';

export interface ItemTagihanBaris { anak_id: string; anak_nama: string; paket_id: string | null; paket_nama: string | null; harga: number }

export interface Tagihan {
  id: string;
  ortu_id: string;
  status: 'menunggu_bayar' | 'menunggu_verifikasi' | 'diterima' | 'ditolak';
  subtotal: number;
  diskon_keluarga: number;
  potongan_voucher: number;
  total: number;
  bulan: number;
  bukti_url: string | null;
  alasan_tolak: string | null;
  created_at: string;
  item: ItemTagihanBaris[];
  /** hanya diisi untuk daftar admin */
  ortu_email?: string | null;
  ortu_nama?: string | null;
  ortu_wa?: string | null;
}

const COLS = 'id,ortu_id,status,subtotal,diskon_keluarga,potongan_voucher,total,bulan,bukti_url,alasan_tolak,created_at';

/** Lengkapi tiap tagihan dengan baris itemnya + nama anak & nama paket. */
async function lengkapiItem(
  s: Awaited<ReturnType<typeof createClient>>,
  tagihan: Omit<Tagihan, 'item'>[],
): Promise<Tagihan[]> {
  if (tagihan.length === 0) return [];
  const { data: item } = await s.from('tagihan_langganan_item')
    .select('tagihan_id,anak_id,paket_id,harga,anak:anak_id(nama),paket:paket_id(nama)')
    .in('tagihan_id', tagihan.map((t) => t.id));
  const per = new Map<string, ItemTagihanBaris[]>();
  for (const r of item ?? []) {
    const anak = Array.isArray(r.anak) ? r.anak[0] : r.anak;
    const paket = Array.isArray(r.paket) ? r.paket[0] : r.paket;
    const baris: ItemTagihanBaris = {
      anak_id: r.anak_id as string,
      anak_nama: (anak as { nama?: string } | null)?.nama ?? 'Anak',
      paket_id: (r.paket_id as string | null) ?? null,
      paket_nama: (paket as { nama?: string } | null)?.nama ?? null,
      harga: (r.harga as number) ?? 0,
    };
    const k = r.tagihan_id as string;
    const arr = per.get(k); if (arr) arr.push(baris); else per.set(k, [baris]);
  }
  return tagihan.map((t) => ({ ...t, item: per.get(t.id) ?? [] }));
}

/** Tagihan milik ortu yang login (terbaru dulu). */
export async function getTagihanSaya(): Promise<Tagihan[]> {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data, error } = await s.from('tagihan_langganan').select(COLS)
    .eq('ortu_id', user.id).order('created_at', { ascending: false }).limit(20);
  if (error) return [];
  return lengkapiItem(s, (data ?? []) as unknown as Omit<Tagihan, 'item'>[]);
}

/** Tagihan yang menunggu verifikasi admin (+ identitas ortu untuk tombol WA). */
export async function getTagihanMenunggu(): Promise<Tagihan[]> {
  const s = await createClient();
  const { data, error } = await s.from('tagihan_langganan')
    .select(`${COLS},ortu:ortu_id(email,nama_tampilan,no_wa)`)
    .eq('status', 'menunggu_verifikasi').order('created_at', { ascending: true });
  if (error) return [];
  const dasar = (data ?? []).map((r) => {
    const o = Array.isArray(r.ortu) ? r.ortu[0] : r.ortu;
    const ortu = o as { email?: string; nama_tampilan?: string | null; no_wa?: string | null } | null;
    return {
      ...(r as unknown as Omit<Tagihan, 'item'>),
      ortu_email: ortu?.email ?? null,
      ortu_nama: ortu?.nama_tampilan ?? null,
      ortu_wa: ortu?.no_wa ?? null,
    };
  });
  return lengkapiItem(s, dasar);
}
