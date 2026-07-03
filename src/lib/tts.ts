// src/lib/tts.ts — text-to-speech dengan voice ber-logat Indonesia (dipilih eksplisit).
// Browser sering pakai voice default (aksen Inggris) meski lang='id-ID'; di sini
// kita pilih voice yang lang-nya Indonesia agar logatnya benar-benar Indonesia.
let voiceId: SpeechSynthesisVoice | null = null;
let init = false;

function pilihVoice() {
  try {
    const vs = window.speechSynthesis.getVoices();
    voiceId = vs.find((v) => v.lang?.toLowerCase() === 'id-id')
      || vs.find((v) => v.lang?.toLowerCase().startsWith('id'))
      || vs.find((v) => /indonesia|bahasa/i.test(v.name))
      || null;
  } catch { /* abaikan */ }
}

export function speak(t: string, opts?: { rate?: number; pitch?: number }) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!init) {
      init = true;
      pilihVoice();
      // daftar voice sering dimuat async → pilih ulang saat siap
      try { window.speechSynthesis.onvoiceschanged = pilihVoice; } catch { /* abaikan */ }
    }
    if (!voiceId) pilihVoice();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'id-ID';
    if (voiceId) u.voice = voiceId;
    u.rate = opts?.rate ?? 0.95;
    u.pitch = opts?.pitch ?? 1.1;
    window.speechSynthesis.speak(u);
  } catch { /* abaikan */ }
}
