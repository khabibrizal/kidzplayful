-- 0065_konsultasi.sql — Chat dengan Psikolog: jadwal, pendaftaran, pesan, rekomendasi.

-- 1) Jadwal & kuota per psikolog (satu baris per psikolog)
create table if not exists public.jadwal_psikolog (
  psikolog_id uuid primary key references public.profiles(id) on delete cascade,
  nama text,                               -- denormalisasi (customer tak boleh baca profiles psikolog)
  hari_buka int[] not null default '{}',   -- 0=Minggu .. 6=Sabtu
  jam_mulai text,
  jam_selesai text,
  maks_per_hari int not null default 5,
  aktif boolean not null default true,
  catatan text,
  updated_at timestamptz not null default now()
);
alter table public.jadwal_psikolog enable row level security;
drop policy if exists "jadwal baca" on public.jadwal_psikolog;
create policy "jadwal baca" on public.jadwal_psikolog for select to authenticated
  using (true);
drop policy if exists "jadwal kelola sendiri" on public.jadwal_psikolog;
create policy "jadwal kelola sendiri" on public.jadwal_psikolog for all to authenticated
  using (psikolog_id = auth.uid() or public.is_admin())
  with check (psikolog_id = auth.uid() or public.is_admin());

-- 2) Pendaftaran konsultasi (= kontainer sesi chat)
create table if not exists public.pendaftaran_konsultasi (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  psikolog_id uuid not null references public.profiles(id) on delete cascade,
  anak_id uuid not null references public.anak(id) on delete cascade,
  anak_nama text,                          -- denormalisasi (psikolog tak nembus RLS anak)
  tanggal date not null,
  keluhan text,
  status text not null default 'menunggu'
    check (status in ('menunggu','diterima','ditolak','selesai','batal')),
  diverifikasi_pada timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pendaftaran_konsultasi_psi_tgl_idx on public.pendaftaran_konsultasi(psikolog_id, tanggal);
create index if not exists pendaftaran_konsultasi_ortu_idx on public.pendaftaran_konsultasi(ortu_id, created_at desc);
alter table public.pendaftaran_konsultasi enable row level security;
drop policy if exists "konsultasi baca" on public.pendaftaran_konsultasi;
create policy "konsultasi baca" on public.pendaftaran_konsultasi for select to authenticated
  using (ortu_id = auth.uid() or psikolog_id = auth.uid() or public.is_admin());
drop policy if exists "konsultasi insert ortu" on public.pendaftaran_konsultasi;
create policy "konsultasi insert ortu" on public.pendaftaran_konsultasi for insert to authenticated
  with check (ortu_id = auth.uid());
drop policy if exists "konsultasi update peserta" on public.pendaftaran_konsultasi;
create policy "konsultasi update peserta" on public.pendaftaran_konsultasi for update to authenticated
  using (psikolog_id = auth.uid() or ortu_id = auth.uid() or public.is_admin())
  with check (psikolog_id = auth.uid() or ortu_id = auth.uid() or public.is_admin());

-- 3) Pesan chat (denormalisasi nama pengirim, pola komentar)
create table if not exists public.pesan_konsultasi (
  id uuid primary key default gen_random_uuid(),
  pendaftaran_id uuid not null references public.pendaftaran_konsultasi(id) on delete cascade,
  pengirim_id uuid not null references public.profiles(id) on delete cascade,
  nama text,
  teks text not null,
  dibaca_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pesan_konsultasi_idx on public.pesan_konsultasi(pendaftaran_id, created_at);
alter table public.pesan_konsultasi enable row level security;
drop policy if exists "pesan baca peserta" on public.pesan_konsultasi;
create policy "pesan baca peserta" on public.pesan_konsultasi for select to authenticated
  using (
    exists (select 1 from public.pendaftaran_konsultasi p
            where p.id = pesan_konsultasi.pendaftaran_id
              and (p.ortu_id = auth.uid() or p.psikolog_id = auth.uid()))
    or public.is_admin()
  );
drop policy if exists "pesan insert peserta" on public.pesan_konsultasi;
create policy "pesan insert peserta" on public.pesan_konsultasi for insert to authenticated
  with check (
    pengirim_id = auth.uid()
    and exists (select 1 from public.pendaftaran_konsultasi p
                where p.id = pesan_konsultasi.pendaftaran_id
                  and (p.ortu_id = auth.uid() or p.psikolog_id = auth.uid()))
  );
drop policy if exists "pesan update peserta" on public.pesan_konsultasi;
create policy "pesan update peserta" on public.pesan_konsultasi for update to authenticated
  using (
    exists (select 1 from public.pendaftaran_konsultasi p
            where p.id = pesan_konsultasi.pendaftaran_id
              and (p.ortu_id = auth.uid() or p.psikolog_id = auth.uid()))
  );

-- 4) Rekomendasi psikolog ("resep") tersimpan di halaman customer
create table if not exists public.rekomendasi_psikolog (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references public.anak(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  psikolog_id uuid not null references public.profiles(id) on delete cascade,
  pendaftaran_id uuid references public.pendaftaran_konsultasi(id) on delete set null,
  judul text,
  isi text,
  butir jsonb not null default '[]',       -- [{judul, isi}]
  dinilai_oleh text,                       -- nama psikolog (denormalisasi)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rekomendasi_anak_idx on public.rekomendasi_psikolog(anak_id, created_at desc);
alter table public.rekomendasi_psikolog enable row level security;
drop policy if exists "rekomendasi baca" on public.rekomendasi_psikolog;
create policy "rekomendasi baca" on public.rekomendasi_psikolog for select to authenticated
  using (ortu_id = auth.uid() or psikolog_id = auth.uid() or public.is_admin());
drop policy if exists "rekomendasi insert psikolog" on public.rekomendasi_psikolog;
create policy "rekomendasi insert psikolog" on public.rekomendasi_psikolog for insert to authenticated
  with check (public.is_psikolog() and psikolog_id = auth.uid());
drop policy if exists "rekomendasi update psikolog" on public.rekomendasi_psikolog;
create policy "rekomendasi update psikolog" on public.rekomendasi_psikolog for update to authenticated
  using (public.is_psikolog() and psikolog_id = auth.uid())
  with check (public.is_psikolog() and psikolog_id = auth.uid());

-- 5) Sisa kuota konsultasi psikolog pada 1 tanggal (SECURITY DEFINER: hitung lintas-ortu).
create or replace function public.sisa_kuota_konsultasi(p_psikolog uuid, p_tanggal date)
returns int language sql security definer stable set search_path = public as $$
  select greatest(
    0,
    coalesce((select maks_per_hari from public.jadwal_psikolog where psikolog_id = p_psikolog), 0)
    - (select count(*)::int from public.pendaftaran_konsultasi
       where psikolog_id = p_psikolog and tanggal = p_tanggal
         and status in ('menunggu','diterima'))
  );
$$;

-- 6) Daftar konsultasi (SECURITY DEFINER): validasi kepemilikan anak, hari buka,
--    kuota, & cegah booking ganda; lalu insert. Mengembalikan id pendaftaran.
create or replace function public.daftar_konsultasi(
  p_psikolog uuid, p_anak uuid, p_tanggal date, p_keluhan text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_nama text;
  v_jadwal public.jadwal_psikolog;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Tidak terautentikasi'; end if;

  select nama into v_nama from public.anak where id = p_anak and ortu_id = v_uid;
  if v_nama is null then raise exception 'Anak tidak valid.'; end if;

  select * into v_jadwal from public.jadwal_psikolog where psikolog_id = p_psikolog;
  if v_jadwal.psikolog_id is null or not v_jadwal.aktif then
    raise exception 'Psikolog belum membuka jadwal konsultasi.';
  end if;
  if not (extract(dow from p_tanggal)::int = any (v_jadwal.hari_buka)) then
    raise exception 'Psikolog tidak buka pada tanggal tersebut.';
  end if;
  if public.sisa_kuota_konsultasi(p_psikolog, p_tanggal) <= 0 then
    raise exception 'Kuota konsultasi pada tanggal tersebut sudah penuh.';
  end if;
  if exists (select 1 from public.pendaftaran_konsultasi
             where ortu_id = v_uid and psikolog_id = p_psikolog and tanggal = p_tanggal
               and status in ('menunggu','diterima')) then
    raise exception 'Anda sudah punya jadwal konsultasi dengan psikolog ini pada tanggal tersebut.';
  end if;

  insert into public.pendaftaran_konsultasi (ortu_id, psikolog_id, anak_id, anak_nama, tanggal, keluhan)
    values (v_uid, p_psikolog, p_anak, v_nama, p_tanggal, nullif(btrim(p_keluhan), ''))
    returning id into v_id;
  return v_id;
end;
$$;
