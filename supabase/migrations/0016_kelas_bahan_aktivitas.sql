-- supabase/migrations/0016_kelas_bahan_aktivitas.sql
-- Restrukturisasi kelas_bermain:
--   bahan: text -> jsonb array [{nama, link}]   (link toko opsional per bahan)
--   aktivitas: text -> jsonb array [{judul, cara_membuat, langkah[]}]
--   cara_membuat & langkah lama dilebur ke dalam aktivitas, lalu di-drop.
-- Catatan: subquery tidak boleh di ALTER ... USING, jadi bahan dikonversi via kolom sementara + UPDATE.

-- 1) BAHAN text -> jsonb (kolom sementara)
alter table public.kelas_bermain add column if not exists bahan_json jsonb not null default '[]'::jsonb;
update public.kelas_bermain set bahan_json = (
  select coalesce(jsonb_agg(jsonb_build_object('nama', btrim(t.val), 'link', null)), '[]'::jsonb)
  from regexp_split_to_table(coalesce(bahan, ''), ',') as t(val)
  where btrim(t.val) <> ''
);
alter table public.kelas_bermain drop column bahan;
alter table public.kelas_bermain rename column bahan_json to bahan;

-- 2) AKTIVITAS text (+ cara_membuat + langkah) -> jsonb array of grup (tanpa subquery, boleh di USING)
alter table public.kelas_bermain alter column aktivitas drop default;
alter table public.kelas_bermain
  alter column aktivitas type jsonb using (
    case
      when (aktivitas is null or btrim(aktivitas) = '')
           and (langkah is null or langkah = '[]'::jsonb)
           and cara_membuat is null
      then '[]'::jsonb
      else jsonb_build_array(jsonb_build_object(
        'judul', coalesce(nullif(btrim(aktivitas), ''), 'Aktivitas'),
        'cara_membuat', cara_membuat,
        'langkah', coalesce(langkah, '[]'::jsonb)
      ))
    end
  );
alter table public.kelas_bermain alter column aktivitas set default '[]'::jsonb;
update public.kelas_bermain set aktivitas = '[]'::jsonb where aktivitas is null;
alter table public.kelas_bermain alter column aktivitas set not null;

-- 3) buang kolom lama yang sudah dilebur
alter table public.kelas_bermain drop column if exists cara_membuat;
alter table public.kelas_bermain drop column if exists langkah;
