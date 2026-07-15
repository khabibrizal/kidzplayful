-- 0067_rekomendasi_item.sql
-- (1) Akses Fitur guru/psikolog (jenis rekomendasi yang boleh) disimpan di pengaturan_menu.fitur.
-- (2) Tabel rekomendasi_item: produk/event/materi yang direkomendasikan psikolog/guru untuk seorang anak.

alter table public.pengaturan_menu add column if not exists fitur jsonb not null default '{}'::jsonb;

create table if not exists public.rekomendasi_item (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references public.anak(id) on delete cascade,
  ortu_id uuid not null references public.profiles(id) on delete cascade,
  pemberi_id uuid not null references public.profiles(id) on delete cascade,
  pemberi_nama text,
  pendaftaran_id uuid references public.pendaftaran_konsultasi(id) on delete set null,
  jenis text not null check (jenis in ('produk','event','materi')),
  ref_id uuid not null,
  judul text,
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists rekomendasi_item_anak_idx on public.rekomendasi_item(anak_id, created_at desc);
alter table public.rekomendasi_item enable row level security;

drop policy if exists "rekomendasi item baca" on public.rekomendasi_item;
create policy "rekomendasi item baca" on public.rekomendasi_item for select to authenticated
  using (ortu_id = auth.uid() or pemberi_id = auth.uid() or public.is_admin());
drop policy if exists "rekomendasi item insert" on public.rekomendasi_item;
create policy "rekomendasi item insert" on public.rekomendasi_item for insert to authenticated
  with check (pemberi_id = auth.uid() and (public.is_psikolog() or public.is_guru() or public.is_admin()));
drop policy if exists "rekomendasi item hapus" on public.rekomendasi_item;
create policy "rekomendasi item hapus" on public.rekomendasi_item for delete to authenticated
  using (pemberi_id = auth.uid() or public.is_admin());
