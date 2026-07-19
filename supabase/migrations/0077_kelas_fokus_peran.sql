-- 0077_kelas_fokus_peran.sql — fokus area perkembangan + peran orang tua per kelas bermain
-- (kolom terpisah di tabel, bukan dicampur ke jsonb aktivitas).
alter table public.kelas_bermain
  add column if not exists fokus_area text[] not null default '{}',  -- mis. {motorik-halus,kognitif}
  add column if not exists peran_ortu text;                          -- peran/keterlibatan ortu saat bermain
