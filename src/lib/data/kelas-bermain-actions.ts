'use server';
import { updateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { KelasBermain } from '@/lib/game/tipe';
import { MAKS_URUTAN_BULAN } from '@/lib/domain/kurikulum';

export interface BahanInput { nama: string; link: string; produkId: string }
export interface AktivitasInput {
  judul: string; caraMembuat: string; langkah: string[]; catatanOrtu: string;
  /** 0098 — kalimat checklist evaluasi (boleh kosong = aktivitas tanpa evaluasi) */
  evaluasi: string[];
  /** 0098 — id `paket_aset`; '' = tanpa game (admin boleh tidak memilih) */
  gamePaketId: string;
}
export interface KelasInput {
  judul: string;
  tujuan: string;
  sampulUrl: string;
  fokusArea: string[];
  peranOrtu: string;
  usiaMin: number;
  usiaMax: number;
  bahan: BahanInput[];
  aktivitas: AktivitasInput[];
  linkIde: string;
  worksheetUrl: string | null;
  /** 0101 — kategori usia dari master; usiaMin/usiaMax di-snapshot dari rentangnya */
  kategoriUsiaId: string;
  /** 0098 — tema ini milik bulan ke-N kurikulum */
  bulanKurikulum: number;
  /** 0098 — urutan tampil di dalam bulan itu */
  urutan: number;
}
const COLS = 'id,judul,sampul_url,tujuan,fokus_area,peran_ortu,usia_min,usia_max,aktivitas,bahan,link_ide,worksheet_url,status';
const COLS_098 = `${COLS},bulan_kurikulum,urutan,kategori_usia_id`;
/** Galat karena kolom 0098 belum ada. `evaluasi`/`game_paket_id` TIDAK ikut: keduanya di
 *  dalam jsonb `aktivitas`, jadi tak pernah memicu galat kolom. */
function kolom098Hilang(e: { code?: string; message?: string } | null): boolean {
  if (!e) return false;
  return e.code === '42703' || /bulan_kurikulum|urutan|kategori_usia_id/.test(e.message ?? '');
}

/**
 * Segarkan `usia_min`/`usia_max` dari MASTER kategori usia, bukan dari kiriman klien.
 *
 * 🐞 KENAPA: rentang usia di baris materi adalah SNAPSHOT dari kategorinya. Dulu
 * snapshot itu ditulis apa adanya dari form, dan form mengisinya dari baris LAMA saat Edit
 * dibuka — penyegaran hanya terjadi bila admin kebetulan menyentuh dropdown kategorinya.
 * Akibatnya: admin mengubah rentang sebuah kategori di master, membuka materinya, menekan
 * Simpan… dan angkanya TIDAK berubah, karena yang tersimpan adalah nilai lama yang dikirim
 * balik oleh form. Tak ada galat, tak ada petunjuk — hanya angka yang membangkang.
 *
 * Sekarang server yang menentukan: selama materi punya `kategori_usia_id`, rentangnya SELALU
 * mengikuti master. Klien tak lagi bisa mengirim rentang yang tak cocok dengan kategorinya.
 * Materi TANPA kategori tetap memakai nilai dari form — di situ memang tak ada master untuk
 * dirujuk.
 */
async function denganRentangKategori(
  s: Awaited<ReturnType<typeof adminDb>>,
  baris: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const id = baris.kategori_usia_id as string | null;
  if (!id) return baris;
  const { data } = await s.from('kategori_usia').select('usia_min,usia_max').eq('id', id).maybeSingle();
  if (!data) return baris;   // kategori terhapus di tengah jalan → pertahankan nilai form
  return {
    ...baris,
    usia_min: Math.max(0, Math.min(12, Math.floor(Number(data.usia_min) || 0))),
    usia_max: Math.max(0, Math.min(12, Math.floor(Number(data.usia_max) || 6))),
  };
}

async function adminDb() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Tidak terautentikasi');
  const { data: prof } = await s.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) throw new Error('Bukan admin');
  return s;
}
/**
 * Terjemahkan galat Postgres jadi kalimat yang bisa ditindaklanjuti admin.
 *
 * Yang paling penting: pelanggaran kunci unik posisi kurikulum (0102). Pesan mentahnya
 * ("duplicate key value violates unique constraint …") tak memberi tahu apa yang harus
 * diperbaiki, padahal jawabannya sederhana: pindahkan urutannya.
 */
function pesanGalat(e: { code?: string; message?: string }): string {
  const pesan = e?.message ?? 'Gagal menyimpan.';
  if (e?.code === '23505' && /kelas_kurikulum_posisi/.test(pesan)) {
    return 'Posisi itu sudah dipakai tema AKTIF lain PADA KATEGORI USIA YANG SAMA (0103). Satu kategori + bulan + minggu hanya boleh dimiliki satu tema — tekan “Posisi otomatis”, atau nonaktifkan tema yang menempatinya.';
  }
  return pesan;
}

function row(i: KelasInput) {
  return {
    judul: i.judul.trim() || 'Tanpa judul',
    sampul_url: i.sampulUrl.trim() || null,
    tujuan: i.tujuan.trim() || null,
    fokus_area: (i.fokusArea ?? []).filter(Boolean),
    peran_ortu: i.peranOrtu.trim() || null,
    // Nilai kiriman klien hanya dipakai bila materi ini TANPA kategori. Bila ada
    // kategorinya, rentangnya diambil ulang dari master oleh `denganRentangKategori()` —
    // lihat alasannya di sana.
    usia_min: Math.max(0, Math.min(12, Math.floor(Number(i.usiaMin) || 0))),
    usia_max: Math.max(0, Math.min(12, Math.floor(Number(i.usiaMax) || 6))),
    bahan: i.bahan
      .filter((b) => b.nama.trim())
      .map((b) => ({ nama: b.nama.trim(), link: b.link.trim() || null, produk_id: b.produkId || null })),
    aktivitas: i.aktivitas
      .filter((a) => a.judul.trim() || a.langkah.some((l) => l.trim()) || a.caraMembuat.trim())
      .map((a) => ({
        judul: a.judul.trim() || 'Aktivitas',
        cara_membuat: a.caraMembuat.trim() || null,
        langkah: a.langkah.filter((l) => l.trim()),
        catatan_ortu: a.catatanOrtu.trim() || null,
        // Butir kosong dibuang: kalimat kosong akan muncul sebagai checklist tanpa teks
        // di halaman orang tua.
        evaluasi: (a.evaluasi ?? []).map((x) => x.trim()).filter(Boolean),
        // '' → null, supaya "tanpa game" tersimpan sebagai ketiadaan, bukan string kosong
        // yang nanti dikira id.
        game_paket_id: a.gamePaketId?.trim() || null,
      })),
    link_ide: i.linkIde.trim() || null,
    worksheet_url: i.worksheetUrl?.trim() || null,
  };
}
/** Kolom 0098 dipisah supaya bisa dibuang saat retry bila migrasinya belum jalan. */
function row098(i: KelasInput) {
  return {
    bulan_kurikulum: Math.max(1, Math.floor(Number(i.bulanKurikulum) || 1)),
    // Urutan = MINGGU ke-1..4. Dijepit di server juga, bukan hanya di form: satu bulan
    // kurikulum berisi empat minggu, dan angka di luarnya akan memunculkan "Minggu ke-7"
    // di rapor anak — rapor tak boleh menyebut minggu yang tak ada.
    urutan: Math.min(MAKS_URUTAN_BULAN, Math.max(1, Math.floor(Number(i.urutan) || 1))),
    // 0101 — dipisahkan bersama kolom baru lain supaya bisa dibuang saat retry bila
    // migrasinya belum jalan. '' → null: "belum dipilih" harus jadi ketiadaan, bukan
    // string kosong yang nanti dikira id.
    kategori_usia_id: i.kategoriUsiaId?.trim() || null,
  };
}
// buat/update MENGEMBALIKAN {ok,error,kelas} (bukan throw) agar pesan error DB
// tidak diredaksi Next.js di production (pola sama dgn buatPaket/buatUser).
export async function buatKelas(i: KelasInput): Promise<{ ok: boolean; error?: string; kelas?: KelasBermain }> {
  try {
    const s = await adminDb();
    if (!i.judul.trim()) return { ok: false, error: 'Judul wajib diisi.' };
    const baris = await denganRentangKategori(s, { ...row(i), ...row098(i) });
    const coba = await s.from('kelas_bermain').insert(baris).select(COLS_098).single();
    if (!coba.error) { updateTag('katalog'); return { ok: true, kelas: coba.data as unknown as KelasBermain }; }
    if (!kolom098Hilang(coba.error)) return { ok: false, error: pesanGalat(coba.error) };
    // Migrasi 0098 belum jalan → simpan tanpa kolom kurikulum, jangan gagalkan materinya.
    const { data, error } = await s.from('kelas_bermain').insert(row(i)).select(COLS).single();
    if (error) return { ok: false, error: pesanGalat(error) };
    updateTag('katalog');
    return { ok: true, kelas: data as unknown as KelasBermain };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan.' };
  }
}
export async function updateKelas(id: string, i: KelasInput): Promise<{ ok: boolean; error?: string; kelas?: KelasBermain }> {
  try {
    const s = await adminDb();
    const baris = await denganRentangKategori(s, { ...row(i), ...row098(i) });
    const coba = await s.from('kelas_bermain').update(baris).eq('id', id).select(COLS_098).single();
    if (!coba.error) { updateTag('katalog'); return { ok: true, kelas: coba.data as unknown as KelasBermain }; }
    if (!kolom098Hilang(coba.error)) return { ok: false, error: pesanGalat(coba.error) };
    const { data, error } = await s.from('kelas_bermain').update(row(i)).eq('id', id).select(COLS).single();
    if (error) return { ok: false, error: pesanGalat(error) };
    updateTag('katalog');
    return { ok: true, kelas: data as unknown as KelasBermain };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Gagal menyimpan.' };
  }
}
export async function toggleStatusKelas(id: string, statusBaru: 'aktif' | 'nonaktif'): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('kelas_bermain').update({ status: statusBaru }).eq('id', id);
  // Mengaktifkan kembali bisa DITOLAK bila posisi kurikulumnya sudah diambil tema lain
  // (indeks unik 0102 hanya berlaku untuk yang aktif) — pesannya harus menyebutkan itu.
  if (error) throw new Error(pesanGalat(error));
  updateTag('katalog');
}
export async function hapusKelas(id: string): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('kelas_bermain').delete().eq('id', id);
  if (error) throw new Error(error.message);
  updateTag('katalog');
}
export async function setBolehTrialKelas(id: string, boleh: boolean): Promise<void> {
  const s = await adminDb();
  const { error } = await s.from('kelas_bermain').update({ boleh_trial: boleh }).eq('id', id);
  if (error) throw new Error(error.message);
  updateTag('katalog'); // segarkan katalog kelas ter-cache
}
