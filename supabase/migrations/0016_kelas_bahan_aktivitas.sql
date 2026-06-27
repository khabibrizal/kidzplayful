-- supabase/migrations/0016_kelas_bahan_aktivitas.sql
-- Restrukturisasi kelas_bermain:
--   bahan: text -> jsonb array [{nama, link}]   (link toko opsional per bahan)
--   aktivitas: text -> jsonb array [{judul, cara_membuat, langkah[]}]  (grup aktivitas + langkah masing-masing)
--   cara_membuat & langkah lama dilebur ke dalam aktivitas, lalu di-drop.

-- 1) bahan text -> jsonb
alter table public.kelas_bermain alter column bahan drop default;
alter table public.kelas_bermain
  alter column bahan type jsonb using (
    case
      when bahan is null or btrim(bahan) = '' then '[]'::jsonb
      else coalesce((
        select jsonb_agg(jsonb_build_object('nama', btrim(t.val), 'link', null))
        from regexp_split_to_table(bahan, ',') as t(val)
        where btrim(t.val) <> ''
      ), '[]'::jsonb)
    end
  );
alter table public.kelas_bermain alter column bahan set default '[]'::jsonb;
update public.kelas_bermain set bahan = '[]'::jsonb where bahan is null;
alter table public.kelas_bermain alter column bahan set not null;

-- 2) aktivitas text (+ cara_membuat + langkah) -> jsonb array of grup
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
