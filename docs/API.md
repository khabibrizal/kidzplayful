# API / Akses Data per File — KidzPlayful

Aplikasi tidak punya REST route sendiri; semua lewat **Supabase** di bawah `NEXT_PUBLIC_SUPABASE_URL`.
DB = PostgREST `/rest/v1/<tabel>` · Auth = `/auth/v1/*` · Storage = `/storage/v1/*` (bucket `aset`).
Operasi: select=GET, insert/upsert=POST, update=PATCH, delete=DELETE. Semua tunduk pada RLS.

Total file pengakses data: **76**

### `src/app/admin/event/EventAdmin.tsx`
- **Storage:** `aset:getPublicUrl`, `aset:upload`

### `src/app/admin/kelas-bermain/KelasAdmin.tsx`
- **Storage:** `aset:getPublicUrl`, `aset:upload`

### `src/app/admin/komunitas/page.tsx`
- **DB:** `laporan` [GET(select)]; `postingan` [GET(select)]

### `src/app/admin/langganan/page.tsx`
- **DB:** `profiles` [GET(select)]

### `src/app/admin/laporan/page.tsx`
- **DB:** `hasil_main` [GET(select)]; `langganan` [GET(select)]; `tema` [GET(select)]

### `src/app/admin/LogoutBtn.tsx`
- **Auth:** `auth.signOut()`

### `src/app/admin/page.tsx`
- **DB:** `tema` [GET(select)]

### `src/app/admin/produk/ProdukAdmin.tsx`
- **Storage:** `aset:getPublicUrl`, `aset:upload`

### `src/app/admin/tema/[id]/page.tsx`
- **DB:** `paket_aset` [GET(select)]; `tema` [GET(select)]

### `src/app/admin/video/page.tsx`
- **DB:** `video` [GET(select)]

### `src/app/anak/[anakId]/laporan/page.tsx`
- **DB:** `anak` [GET(select)]; `hasil_main` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/app/anak/[anakId]/page.tsx`
- **DB:** `anak` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/app/catatan/[eventId]/page.tsx`
- **Auth:** `auth.getUser()`

### `src/app/daftar/page.tsx`
- **DB:** `profiles` [PATCH(update)]
- **Auth:** `auth.getUser()`, `auth.signUp()`

### `src/app/event/[id]/daftar/DaftarForm.tsx`
- **Storage:** `aset:getPublicUrl`, `aset:upload`

### `src/app/event/[id]/daftar/page.tsx`
- **DB:** `anak` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/app/event/page.tsx`
- **Auth:** `auth.getUser()`

### `src/app/favorit/page.tsx`
- **Auth:** `auth.getUser()`

### `src/app/kelas/[id]/page.tsx`
- **DB:** `kelas_bermain` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/app/kelas-saya/page.tsx`
- **Auth:** `auth.getUser()`

### `src/app/keranjang/page.tsx`
- **Auth:** `auth.getUser()`

### `src/app/komunitas/[postId]/page.tsx`
- **Auth:** `auth.getUser()`

### `src/app/komunitas/page.tsx`
- **DB:** `tema` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/app/login/page.tsx`
- **DB:** `profiles` [GET(select)]
- **Auth:** `auth.getUser()`, `auth.signInWithPassword()`

### `src/app/lupa-sandi/page.tsx`
- **Auth:** `auth.resetPasswordForEmail()`

### `src/app/main/[anakId]/page.tsx`
- **DB:** `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/app/pengaturan/AkunForm.tsx`
- **Auth:** `auth.signOut()`, `auth.updateUser()`

### `src/app/pengaturan/page.tsx`
- **DB:** `langganan` [GET(select)]; `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/app/pesanan/[id]/BuktiUpload.tsx`
- **Storage:** `aset:getPublicUrl`, `aset:upload`

### `src/app/pesanan/[id]/page.tsx`
- **Auth:** `auth.getUser()`

### `src/app/pesanan/page.tsx`
- **Auth:** `auth.getUser()`

### `src/app/pilih-anak/actions.ts`
- **DB:** `anak` [POST(insert)]
- **Auth:** `auth.getUser()`

### `src/app/pilih-anak/page.tsx`
- **DB:** `anak` [GET(select)]; `langganan` [GET(select)]; `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/app/pilih-game/[anakId]/page.tsx`
- **DB:** `anak` [GET(select)]

### `src/app/reset-sandi/page.tsx`
- **Auth:** `auth.updateUser()`

### `src/app/store/[id]/page.tsx`
- **Auth:** `auth.getUser()`

### `src/app/store/page.tsx`
- **Auth:** `auth.getUser()`

### `src/components/admin/AsetInput.tsx`
- **Storage:** `aset:getPublicUrl`, `aset:upload`

### `src/components/game/PinGate.tsx`
- **DB:** `profiles` [PATCH(update)]
- **Auth:** `auth.getUser()`

### `src/lib/data/admin-bisnis.ts`
- **DB:** `langganan` [PATCH(update)]; `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/admin-event-actions.ts`
- **DB:** `event` [DELETE(delete), PATCH(update), POST(insert)]; `pendaftaran_event` [PATCH(update)]; `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/admin-event.ts`
- **DB:** `event` [GET(select)]; `pendaftaran_event` [GET(select)]

### `src/lib/data/admin-guru-actions.ts`
- **DB:** `profiles` [GET(select), PATCH(update)]
- **Auth:** `auth.getUser()`

### `src/lib/data/admin-guru.ts`
- **DB:** `profiles` [GET(select)]

### `src/lib/data/admin-komunitas.ts`
- **DB:** `komentar` [DELETE(delete), PATCH(update)]; `laporan` [DELETE(delete)]; `postingan` [DELETE(delete), PATCH(update)]; `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/admin-konten.ts`
- **DB:** `paket_aset` [DELETE(delete), POST(insert)]; `panduan` [POST(upsert)]; `profiles` [GET(select)]; `tema` [DELETE(delete), PATCH(update), POST(insert)]; `video` [DELETE(delete), POST(insert)]
- **Auth:** `auth.getUser()`

### `src/lib/data/admin-reminder-actions.ts`
- **DB:** `pendaftaran_event` [PATCH(update)]; `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/admin-reminder.ts`
- **DB:** `pendaftaran_event` [GET(select)]

### `src/lib/data/admin-store-actions.ts`
- **DB:** `item_pesanan` [GET(select)]; `pesanan` [GET(select), PATCH(update)]; `produk` [DELETE(delete), GET(select), PATCH(update), POST(insert)]; `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/admin-store.ts`
- **DB:** `pesanan` [GET(select)]; `produk` [GET(select)]

### `src/lib/data/admin.ts`
- **DB:** `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/anak.ts`
- **DB:** `anak` [GET(select)]; `langganan` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/catatan.ts`
- **DB:** `catatan_perkembangan` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/event-actions.ts`
- **DB:** `anak` [GET(select)]; `event` [GET(select)]; `pendaftaran_event` [POST(insert)]
- **Auth:** `auth.getUser()`

### `src/lib/data/event.ts`
- **DB:** `catatan_perkembangan` [GET(select)]; `event` [GET(select)]; `pendaftaran_event` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/favorit-actions.ts`
- **DB:** `favorit` [DELETE(delete), GET(select), POST(insert)]
- **Auth:** `auth.getUser()`

### `src/lib/data/favorit.ts`
- **DB:** `favorit` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/guru-actions.ts`
- **DB:** `catatan_perkembangan` [POST(upsert)]; `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/guru.ts`
- **DB:** `catatan_perkembangan` [GET(select)]; `event` [GET(select)]; `pendaftaran_event` [GET(select)]; `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/kelas-bermain-actions.ts`
- **DB:** `kelas_bermain` [DELETE(delete), PATCH(update), POST(insert)]; `profiles` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/kelas-bermain.ts`
- **DB:** `kelas_bermain` [GET(select)]

### `src/lib/data/keranjang-actions.ts`
- **DB:** `item_pesanan` [POST(insert)]; `keranjang_item` [DELETE(delete), GET(select), PATCH(update), POST(insert)]; `pesanan` [POST(insert)]; `produk` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/keranjang.ts`
- **DB:** `keranjang_item` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/komunitas-actions.ts`
- **DB:** `komentar` [POST(insert)]; `laporan` [POST(insert)]; `postingan` [DELETE(delete), POST(insert)]; `profiles` [GET(select), PATCH(update)]; `suka` [DELETE(delete), GET(select), POST(insert)]
- **Auth:** `auth.getUser()`

### `src/lib/data/komunitas.ts`
- **DB:** `komentar` [GET(select)]; `postingan` [GET(select)]; `suka` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/ortu-actions.ts`
- **DB:** `anak` [DELETE(delete), PATCH(update)]; `profiles` [PATCH(update)]
- **Auth:** `auth.getUser()`

### `src/lib/data/panduan.ts`
- **DB:** `panduan` [GET(select)]; `tema` [GET(select)]

### `src/lib/data/pesanan-actions.ts`
- **DB:** `pesanan` [PATCH(update)]
- **Auth:** `auth.getUser()`

### `src/lib/data/pesanan.ts`
- **DB:** `pesanan` [GET(select)]
- **Auth:** `auth.getUser()`

### `src/lib/data/pustaka.ts`
- **DB:** `paket_aset` [GET(select)]; `tema` [GET(select)]; `video` [GET(select)]

### `src/lib/data/riwayat-kelas.ts`
- **DB:** `riwayat_kelas` [GET(select), POST(upsert)]
- **Auth:** `auth.getUser()`

### `src/lib/data/skor.ts`
- **DB:** `anak` [GET(select), PATCH(update)]; `hasil_main` [POST(insert)]
- **Auth:** `auth.getUser()`

### `src/lib/data/store.ts`
- **DB:** `produk` [GET(select)]

### `src/lib/data/tema.ts`
- **DB:** `paket_aset` [GET(select)]; `tema` [GET(select)]

### `src/lib/data/video.ts`
- **DB:** `video` [GET(select)]

### `src/proxy.ts`
- **Auth:** `auth.getUser()`
