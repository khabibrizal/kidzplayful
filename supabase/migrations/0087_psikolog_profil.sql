-- 0087_psikolog_profil.sql — master data profil psikolog (dikelola admin).
--
-- KENAPA TABEL TERPISAH, bukan kolom di `profiles`:
-- customer TIDAK boleh membaca baris `profiles` milik psikolog (itulah sebabnya `nama`
-- didenormalisasi ke `jadwal_psikolog` pada 0065). Data profesional yang memang untuk
-- ditampilkan ke customer harus tinggal di tabel yang boleh dibaca customer.
--
-- Pembagian sumber data pada halaman konsultasi:
--   • nama, foto, pendidikan, STR, pengalaman  → tabel ini (diisi ADMIN)
--   • jadwal tersedia & durasi sesi            → jadwal_psikolog (diisi PSIKOLOG sendiri)

create table if not exists public.psikolog_profil (
  psikolog_id        uuid primary key references public.profiles(id) on delete cascade,
  nama               text not null default '',   -- termasuk gelar, mis. "Arina, M.Psi., Psikolog"
  badge              text,                       -- label pendek, mis. "Psikolog Anak"
  spesialisasi       text,                       -- mis. "Psikolog Klinis Anak & Remaja"
  foto_url           text,
  pendidikan_s1      text,                       -- mis. "S1 Psikologi – Universitas Indonesia"
  pendidikan_profesi text,                       -- mis. "M.Psi., Profesi Psikolog – UGM"
  no_str             text,
  pengalaman         text,                       -- paragraf bebas
  urutan             int  not null default 0,
  aktif              boolean not null default true,
  updated_at         timestamptz not null default now()
);

alter table public.psikolog_profil enable row level security;

-- BACA: semua pengguna login. Isinya profil profesional yang memang untuk dipublikasikan
-- ke calon klien — tidak memuat email, telepon, atau data pribadi lain.
drop policy if exists "psikolog_profil baca" on public.psikolog_profil;
create policy "psikolog_profil baca" on public.psikolog_profil
for select to authenticated using (true);

-- TULIS: admin saja. Nomor STR adalah data kredensial — psikolog TIDAK diberi hak ubah
-- sendiri supaya tidak bisa mengklaim nomor registrasi yang bukan miliknya.
drop policy if exists "psikolog_profil kelola admin" on public.psikolog_profil;
create policy "psikolog_profil kelola admin" on public.psikolog_profil
for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

create index if not exists psikolog_profil_aktif_idx
  on public.psikolog_profil(urutan) where aktif = true;
