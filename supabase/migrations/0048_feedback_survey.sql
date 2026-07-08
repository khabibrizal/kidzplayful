-- 0048_feedback_survey.sql — feedback jadi survei terstruktur (jawaban jsonb)
alter table public.feedback add column if not exists jawaban jsonb not null default '{}';
