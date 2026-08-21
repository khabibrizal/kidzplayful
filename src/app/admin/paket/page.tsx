// src/app/admin/paket/page.tsx — master paket langganan (Basic / Preschool / dst).
import { getPaketSemua } from '@/lib/data/paket';
import { getPengaturanBayar } from '@/lib/data/pengaturan-bayar';
import PaketAdmin from './PaketAdmin';
import s from '../admin.module.css';

export default async function AdminPaketPage() {
  const [list, bayar] = await Promise.all([getPaketSemua(), getPengaturanBayar()]);
  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>🎟️ Paket Langganan</h1></div>
      <p className={s.muted} style={{ fontSize: 13, marginBottom: 10 }}>
        Harga di sini adalah <b>harga per ANAK per bulan</b>. Semua fasilitas paket diatur dari halaman ini —
        tak ada yang tertanam di kode, jadi mengubah harga/fasilitas tidak perlu rilis ulang.
        <br />Paket dengan <b>urutan lebih besar</b> dianggap lebih tinggi: untuk hal yang tak terikat satu anak
        (diskon event &amp; produk, Komunitas), akun memakai <b>paket tertinggi</b> di antara anak-anaknya yang aktif.
      </p>
      {list.length === 0 && (
        <p className={s.muted} style={{ fontSize: 13 }}>
          Belum ada paket terbaca — jalankan migrasi <b>0089_paket_langganan.sql</b> dulu di Supabase SQL Editor.
        </p>
      )}
      <PaketAdmin awal={list} diskonMemberKonsultasi={bayar.diskon_konsultasi_langganan_persen} />
    </div>
  );
}
