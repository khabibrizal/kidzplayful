-- 0040_laporan_rpc.sql — agregasi hasil_main via RPC (hindari tarik semua baris ke app)
-- + index untuk group-by mesin/tema pada laporan.

create index if not exists idx_hasil_main_mesin on public.hasil_main(mesin);
create index if not exists idx_hasil_main_tema on public.hasil_main(tema_id);

-- Ringkasan keterlibatan untuk /admin/laporan. SECURITY DEFINER (bypass RLS) + guard admin.
create or replace function public.laporan_engagement()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare hasil json;
begin
  if not public.is_admin() then
    raise exception 'Bukan admin';
  end if;
  select json_build_object(
    'total_sesi', count(*),
    'total_detik', coalesce(sum(durasi_detik), 0),
    'mesin_populer', (
      select h2.mesin from public.hasil_main h2
      where h2.mesin is not null group by h2.mesin order by count(*) desc limit 1
    ),
    'tema_populer', (
      select t.nama from public.tema t where t.id = (
        select h3.tema_id from public.hasil_main h3
        where h3.tema_id is not null group by h3.tema_id order by count(*) desc limit 1
      )
    )
  ) into hasil from public.hasil_main;
  return hasil;
end;
$$;

grant execute on function public.laporan_engagement() to authenticated;
