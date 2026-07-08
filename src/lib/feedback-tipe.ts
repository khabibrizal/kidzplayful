// src/lib/feedback-tipe.ts — bentuk jawaban survei feedback (dipakai form & action)
export interface JawabanFeedback {
  apa: string;         // Q1 KidzPlayful itu apa
  fitur: string;       // Q2 fitur paling menarik (value)
  fiturLain: string;   // Q2 "Lainnya"
  bingung: string;     // Q3 bagian membingungkan
  kurang: string;      // Q4 apa yang kurang
  bersedia: string;    // Q5 Ya/Mungkin/Tidak
  harga: string;       // Q6 harga wajar
  nps: number | null;  // Q7 rekomendasi 1-10
  saran: string;       // Q8 satu masukan
}

export const FITUR_OPSI: { v: string; l: string }[] = [
  { v: 'adventure', l: '🎈 Adventure Curriculum' },
  { v: 'video', l: '🎬 Video Pembelajaran' },
  { v: 'game', l: '🎮 Game Edukasi' },
  { v: 'event', l: '📅 Event Kelas Bermain' },
  { v: 'progress', l: '📈 Progress Anak' },
  { v: 'store', l: '🛍️ Store' },
  { v: 'komunitas', l: '👨‍👩‍👧 Komunitas' },
  { v: 'lainnya', l: '✏️ Lainnya' },
];
export const labelFiturFeedback = (v: string) => FITUR_OPSI.find((f) => f.v === v)?.l ?? v;

export const BERSEDIA_OPSI = ['Ya', 'Mungkin', 'Tidak'];
export const HARGA_OPSI = ['Rp29.000', 'Rp49.000', 'Rp79.000', 'Rp99.000+', 'Belum bersedia berlangganan'];
