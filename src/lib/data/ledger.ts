// src/lib/data/ledger.ts — util catat/hapus baris ledger keuangan (dipakai hook transaksi)
// Semua dibungkus try/catch agar transaksi inti tak rusak bila migrasi 0052 belum dijalankan.
import { createClient } from '@/lib/supabase/server';
import { tanggalWIB } from '@/lib/domain/gamifikasi';

type Supa = Awaited<ReturnType<typeof createClient>>;

export async function catatLedger(s: Supa, row: {
  arah: 'masuk' | 'keluar';
  kategori: string;
  jumlah: number;
  tanggal?: string;
  metode?: string | null;
  keterangan?: string | null;
  ref_tipe?: string | null;
  ref_id?: string | null;
  lampiran_url?: string | null;
  pic?: string | null;
  dibuat_oleh?: string | null;
}) {
  try {
    await s.from('transaksi_keuangan').insert({
      arah: row.arah,
      kategori: row.kategori,
      jumlah: Math.max(0, Math.floor(Number(row.jumlah) || 0)),
      tanggal: row.tanggal ?? tanggalWIB(),
      metode: row.metode ?? null,
      keterangan: row.keterangan ?? null,
      ref_tipe: row.ref_tipe ?? null,
      ref_id: row.ref_id ?? null,
      lampiran_url: row.lampiran_url ?? null,
      pic: row.pic ?? null,
      dibuat_oleh: row.dibuat_oleh ?? null,
    });
  } catch { /* abaikan (mis. dobel ref / migrasi belum jalan) */ }
}

export async function hapusLedgerRef(s: Supa, refTipe: string, refId: string) {
  try {
    await s.from('transaksi_keuangan').delete().eq('ref_tipe', refTipe).eq('ref_id', refId);
  } catch { /* abaikan */ }
}
