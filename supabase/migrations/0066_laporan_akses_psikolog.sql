-- 0066_laporan_akses_psikolog.sql
-- Buka akses laporan tumbuh kembang anak untuk psikolog, TER-SCOPE ke anak yang
-- punya booking konsultasi (diterima/selesai) dengan psikolog tsb. Ortu & admin tetap.

create or replace function public.boleh_lihat_laporan_anak(p_anak_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    exists (select 1 from public.anak a where a.id = p_anak_id and a.ortu_id = auth.uid())
    or public.is_admin()
    or (
      public.is_psikolog()
      and exists (
        select 1 from public.pendaftaran_konsultasi pk
        where pk.anak_id = p_anak_id
          and pk.psikolog_id = auth.uid()
          and pk.status in ('diterima','selesai')
      )
    );
$$;

-- Policy SELECT tambahan (permissive → di-OR dengan policy parent yang sudah ada).
drop policy if exists "laporan psikolog anak" on public.anak;
create policy "laporan psikolog anak" on public.anak for select to authenticated
  using (public.boleh_lihat_laporan_anak(id));

drop policy if exists "laporan psikolog hasil" on public.hasil_main;
create policy "laporan psikolog hasil" on public.hasil_main for select to authenticated
  using (public.boleh_lihat_laporan_anak(anak_id));

drop policy if exists "laporan psikolog sertifikat" on public.sertifikat;
create policy "laporan psikolog sertifikat" on public.sertifikat for select to authenticated
  using (public.boleh_lihat_laporan_anak(anak_id));

drop policy if exists "laporan psikolog lencana" on public.lencana_anak;
create policy "laporan psikolog lencana" on public.lencana_anak for select to authenticated
  using (public.boleh_lihat_laporan_anak(anak_id));

drop policy if exists "laporan psikolog tantangan" on public.tantangan_kustom_anak;
create policy "laporan psikolog tantangan" on public.tantangan_kustom_anak for select to authenticated
  using (public.boleh_lihat_laporan_anak(anak_id));

-- catatan_perkembangan: psikolog boleh baca juga (sudah boleh ortu/admin/guru).
drop policy if exists "catatan baca" on public.catatan_perkembangan;
create policy "catatan baca" on public.catatan_perkembangan for select to authenticated
  using (ortu_id = auth.uid() or public.is_admin() or public.is_guru() or public.is_psikolog());
