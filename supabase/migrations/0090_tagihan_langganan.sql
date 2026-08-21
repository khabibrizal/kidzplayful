-- 0090_tagihan_langganan.sql — tagihan langganan yang dibuat & dibayar orang tua sendiri.
--
-- Bentuknya INDUK + BARIS ITEM PER ANAK, bukan satu kolom rincian: admin harus bisa melihat
-- "siapa dapat paket apa, berapa" saat memverifikasi, dan paket campur (kakak Preschool, bayi
-- Basic) tidak perlu perlakuan khusus.
--
-- Seluruh nominal DIHITUNG DI SERVER. Karena itu kolom uang dan status dilindungi trigger:
-- orang tua hanya boleh menyentuh `bukti_url`. Tanpa itu, ia bisa PATCH lewat REST dengan
-- `{"total":0}` atau `{"status":"diterima"}` dan mendapat langganan tanpa membayar.

-- 1) Tagihan ------------------------------------------------------------------
create table if not exists public.tagihan_langganan (
  id uuid primary key default gen_random_uuid(),
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'menunggu_bayar'
    check (status in ('menunggu_bayar','menunggu_verifikasi','diterima','ditolak')),
  subtotal int not null default 0,
  diskon_keluarga int not null default 0,
  voucher_id uuid references public.voucher(id) on delete set null,
  potongan_voucher int not null default 0,
  total int not null default 0,
  bulan int not null default 1,
  bukti_url text,
  alasan_tolak text,
  created_at timestamptz not null default now(),
  diverifikasi_pada timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_tagihan_langganan_ortu on public.tagihan_langganan(ortu_id, created_at desc);
create index if not exists idx_tagihan_langganan_status on public.tagihan_langganan(status);

create table if not exists public.tagihan_langganan_item (
  id uuid primary key default gen_random_uuid(),
  tagihan_id uuid not null references public.tagihan_langganan(id) on delete cascade,
  anak_id uuid not null references public.anak(id) on delete cascade,
  paket_id uuid references public.paket_langganan(id) on delete set null,
  harga int not null default 0,           -- snapshot harga paket saat tagihan dibuat
  unique (tagihan_id, anak_id)
);
create index if not exists idx_tagihan_item_tagihan on public.tagihan_langganan_item(tagihan_id);

alter table public.tagihan_langganan enable row level security;
alter table public.tagihan_langganan_item enable row level security;

drop policy if exists "tagihan baca" on public.tagihan_langganan;
create policy "tagihan baca" on public.tagihan_langganan for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin());
drop policy if exists "tagihan buat sendiri" on public.tagihan_langganan;
create policy "tagihan buat sendiri" on public.tagihan_langganan for insert to authenticated
  with check (ortu_id = auth.uid());
-- Update oleh ortu DIBATASI TRIGGER (hanya bukti_url). Admin bebas.
drop policy if exists "tagihan ubah" on public.tagihan_langganan;
create policy "tagihan ubah" on public.tagihan_langganan for update to authenticated
  using (ortu_id = auth.uid() or public.is_admin())
  with check (ortu_id = auth.uid() or public.is_admin());
drop policy if exists "tagihan hapus admin" on public.tagihan_langganan;
create policy "tagihan hapus admin" on public.tagihan_langganan for delete to authenticated
  using (public.is_admin());

drop policy if exists "tagihan item baca" on public.tagihan_langganan_item;
create policy "tagihan item baca" on public.tagihan_langganan_item for select to authenticated
  using (exists (select 1 from public.tagihan_langganan t
                 where t.id = tagihan_langganan_item.tagihan_id
                   and (t.ortu_id = auth.uid() or public.is_admin())));
drop policy if exists "tagihan item buat sendiri" on public.tagihan_langganan_item;
create policy "tagihan item buat sendiri" on public.tagihan_langganan_item for insert to authenticated
  with check (exists (select 1 from public.tagihan_langganan t
                      where t.id = tagihan_langganan_item.tagihan_id and t.ortu_id = auth.uid()));
drop policy if exists "tagihan item kelola admin" on public.tagihan_langganan_item;
create policy "tagihan item kelola admin" on public.tagihan_langganan_item for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2) Trigger pelindung kolom uang & status ------------------------------------
create or replace function public.cegah_ubah_tagihan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  -- Orang tua HANYA boleh menyentuh bukti_url (dan status naik ke menunggu_verifikasi
  -- lewat server action, yang juga melewati trigger ini — karena itu transisi itu diizinkan).
  if new.ortu_id <> old.ortu_id
     or new.subtotal <> old.subtotal
     or new.diskon_keluarga <> old.diskon_keluarga
     or coalesce(new.voucher_id::text,'') <> coalesce(old.voucher_id::text,'')
     or new.potongan_voucher <> old.potongan_voucher
     or new.total <> old.total
     or new.bulan <> old.bulan
     or coalesce(new.alasan_tolak,'') <> coalesce(old.alasan_tolak,'')
     or new.diverifikasi_pada is distinct from old.diverifikasi_pada then
    raise exception 'Hanya admin yang boleh mengubah nominal/status tagihan.';
  end if;
  if new.status <> old.status
     and not (old.status = 'menunggu_bayar' and new.status = 'menunggu_verifikasi') then
    raise exception 'Perubahan status tagihan itu hanya boleh dilakukan admin.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cegah_ubah_tagihan on public.tagihan_langganan;
create trigger trg_cegah_ubah_tagihan before update on public.tagihan_langganan
  for each row execute function public.cegah_ubah_tagihan();

-- 3) Orang tua boleh memilih paket periode BERIKUTNYA (turun kelas) ----------
--    Policy update ditambahkan, tapi kolom lain dijaga trigger: paket_id & aktif_sampai
--    (yang menentukan hak akses berbayar) tetap hanya bisa disetel admin.
drop policy if exists "langganan anak pilih berikutnya" on public.langganan_anak;
create policy "langganan anak pilih berikutnya" on public.langganan_anak for update to authenticated
  using (ortu_id = auth.uid() or public.is_admin())
  with check (ortu_id = auth.uid() or public.is_admin());

create or replace function public.cegah_ubah_langganan_anak()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if new.anak_id <> old.anak_id
     or new.ortu_id <> old.ortu_id
     or coalesce(new.paket_id::text,'') <> coalesce(old.paket_id::text,'')
     or new.aktif_sampai is distinct from old.aktif_sampai then
    raise exception 'Hanya admin yang boleh mengubah paket atau masa aktif langganan.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cegah_ubah_langganan_anak on public.langganan_anak;
create trigger trg_cegah_ubah_langganan_anak before update on public.langganan_anak
  for each row execute function public.cegah_ubah_langganan_anak();

-- 4) Voucher berlaku untuk langganan -----------------------------------------
alter table public.voucher add column if not exists berlaku_langganan boolean not null default false;

-- CHECK ref_tipe diperluas. Menambah nilai tanpa memperbarui CHECK = INSERT ditolak DB
-- dan galatnya ter-redact di production (pelajaran dari paket_aset_mesin_check).
alter table public.voucher_redeem drop constraint if exists voucher_redeem_ref_tipe_check;
alter table public.voucher_redeem add constraint voucher_redeem_ref_tipe_check
  check (ref_tipe in ('pendaftaran','pesanan','langganan'));
