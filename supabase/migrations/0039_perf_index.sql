-- 0039_perf_index.sql — index untuk kolom yang sering di-filter (perbaikan performa)
-- Aman dijalankan berulang (if not exists). Tabel masih kecil → lock singkat, tak perlu concurrently.

-- pendaftaran_event: difilter di hampir semua alur event (ortu_id / event_id / status)
create index if not exists idx_pendaftaran_event_ortu on public.pendaftaran_event(ortu_id);
create index if not exists idx_pendaftaran_event_event on public.pendaftaran_event(event_id);
create index if not exists idx_pendaftaran_event_event_status on public.pendaftaran_event(event_id, status);

-- pesanan & item_pesanan: FK lookup
create index if not exists idx_pesanan_ortu on public.pesanan(ortu_id);
create index if not exists idx_item_pesanan_pesanan on public.item_pesanan(pesanan_id);

-- catatan_perkembangan: filter by anak / ortu
create index if not exists idx_catatan_anak on public.catatan_perkembangan(anak_id);
create index if not exists idx_catatan_ortu on public.catatan_perkembangan(ortu_id);

-- sertifikat: filter by anak / ortu
create index if not exists idx_sertifikat_anak on public.sertifikat(anak_id);
create index if not exists idx_sertifikat_ortu on public.sertifikat(ortu_id);

-- suka: getFeed melakukan lookup by ortu_id (kolom kedua PK)
create index if not exists idx_suka_ortu on public.suka(ortu_id);

-- postingan feed: partial index untuk status tampil + urut terbaru
create index if not exists idx_postingan_tampil on public.postingan(created_at desc) where status = 'tampil';
