// src/app/admin/kategori-usia/page.tsx — master data Kategori Usia + pemeriksaan sehatnya
import { getKategoriUsiaSemua } from '@/lib/data/kategori-usia';
import { getKelasAktifCached } from '@/lib/data/publik';
import { tumpukanKategori, petaUmurKategori, kategoriTanpaTema } from '@/lib/domain/kategori-usia';
import KategoriUsiaAdmin from './KategoriUsiaAdmin';
import s from '../admin.module.css';

export default async function AdminKategoriUsiaPage() {
  const [list, tema] = await Promise.all([getKategoriUsiaSemua(), getKelasAktifCached()]);

  // Hanya kategori AKTIF yang ikut diperiksa — yang nonaktif tak pernah dipilih sistem
  // untuk anak mana pun, jadi memperingatkannya hanya menambah bising.
  const aktif = list
    .filter((k) => k.aktif !== false)
    .map((k) => ({ id: k.id, nama: k.nama, usia_min: k.usia_min, usia_max: k.usia_max }));
  const tumpuk = tumpukanKategori(aktif);
  const peta = petaUmurKategori(aktif, 12);
  const kosong = kategoriTanpaTema(aktif, tema);

  return (
    <div>
      <div className={s.head} style={{ marginTop: 8 }}><h1>👶 Master Kategori Usia</h1></div>
      <p className={s.muted} style={{ fontSize: 13, marginBottom: 10 }}>
        Kategori ini tampil sebagai <b>dropdown</b> saat tambah/edit Game <b>dan Ide Bermain</b>. Rentang usianya
        menentukan <b>tema mana yang terbuka untuk seorang anak</b> — jadi kekeliruan di sini membuat anak yang
        sudah berlangganan tak melihat satu tema pun. Nonaktifkan agar tak muncul di form (tanpa mengubah materi lama).
      </p>

      {/* Rentang bertumpuk: satu tahun diklaim dua kategori. Sistem HARUS memilih salah satu,
          dan pilihannya bisa berbeda dari dugaan admin — itulah yang membuat anak 6 th
          mendarat di "Early Childhood (5-6)" padahal temanya ditaruh di "Middle Childhood". */}
      {tumpuk.length > 0 && (
        <div className={s.card} style={{ borderLeft: '4px solid #b88600', background: '#fff8e6', marginBottom: 12 }}>
          <b style={{ color: '#b88600' }}>⚠️ {tumpuk.length} rentang usia bertumpuk</b>
          <p className={s.muted} style={{ fontSize: 12, margin: '4px 0 8px' }}>
            Satu tahun yang diklaim dua kategori harus dipilih salah satu oleh sistem. Anak akan mendarat di
            kategori <b>yang menang</b> di bawah ini — kalau temanya Anda taruh di kategori satunya,
            anak itu <b>tak akan melihatnya</b>.
          </p>
          {tumpuk.map((x, i) => (
            <div key={i} style={{ fontSize: 13, marginTop: 4 }}>
              • <b>{x.a.nama}</b> × <b>{x.b.nama}</b> — sama-sama memuat usia{' '}
              <b>{x.usia.join(', ')} th</b> → dipakai: <b style={{ color: '#b88600' }}>{x.menang}</b>
            </div>
          ))}
          <p className={s.muted} style={{ fontSize: 12, marginTop: 8 }}>
            Jalan keluarnya: buat rentangnya <b>bersambung tanpa tumpuk</b> — mis. 0–1, 2–3, 4–5, 6–9, 10–12.
          </p>
        </div>
      )}

      {/* Kategori tanpa materi: anak yang mendarat di sini tak punya tema sama sekali. */}
      {kosong.length > 0 && (
        <div className={s.card} style={{ borderLeft: '4px solid #b3261e', background: '#fdf1f0', marginBottom: 12 }}>
          <b style={{ color: '#b3261e' }}>🛑 {kosong.length} kategori belum punya Ide Bermain</b>
          <p className={s.muted} style={{ fontSize: 12, margin: '4px 0 6px' }}>
            Anak yang mendarat di kategori ini <b>tidak melihat satu tema pun</b>, walau sudah berlangganan.
          </p>
          <div style={{ fontSize: 13 }}>{kosong.map((k) => k.nama).join(' · ')}</div>
        </div>
      )}

      {/* Peta umur → kategori. Satu-satunya cara memastikan anak berumur N mendarat di
          kategori yang dimaksud adalah MELIHATNYA, bukan menyimpulkan dari rentang tertulis. */}
      <details className={s.card} style={{ marginBottom: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
          🧭 Umur anak → kategori yang benar-benar dipakai
        </summary>
        <p className={s.muted} style={{ fontSize: 12, margin: '6px 0' }}>
          Dihitung dengan aturan yang sama persis dengan yang dipakai halaman anak.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {peta.map((x) => (
            <span key={x.usia} className={s.muted}
              style={{
                fontSize: 12, padding: '4px 8px', borderRadius: 8,
                background: x.nama ? (x.jumlahCocok > 1 ? '#fff3d6' : '#f3f3f8') : '#fdf1f0',
                color: x.nama ? (x.jumlahCocok > 1 ? '#b88600' : 'inherit') : '#b3261e',
              }}>
              <b>{x.usia} th</b> → {x.nama ?? 'TAK ADA KATEGORI'}
              {x.jumlahCocok > 1 ? ' ⚠️' : ''}
            </span>
          ))}
        </div>
      </details>

      <KategoriUsiaAdmin awal={list} />
    </div>
  );
}
