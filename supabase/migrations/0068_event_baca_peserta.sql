-- 0068_event_baca_peserta.sql
-- Ortu boleh membaca event yang pernah ia daftari (termasuk yang sudah diarsipkan),
-- agar nama event tampil benar di laporan anak (bagian KEGIATAN/EVENT) bukan fallback "Event".
drop policy if exists "event baca peserta" on public.event;
create policy "event baca peserta" on public.event for select to authenticated
  using (exists (
    select 1 from public.pendaftaran_event pe
    where pe.event_id = event.id and pe.ortu_id = auth.uid()
  ));
