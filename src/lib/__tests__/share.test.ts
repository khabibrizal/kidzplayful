// src/lib/__tests__/share.test.ts
import { describe, it, expect } from 'vitest';
import { tautanShare } from '../share';

describe('tautanShare', () => {
  const url = 'https://www.kidzplayful.com/coba/tema/abc';
  const text = 'Cek game seru!';
  it('WhatsApp berisi text lalu url ter-encode', () => {
    const r = tautanShare('whatsapp', { url, text });
    expect(r.startsWith('https://wa.me/?text=')).toBe(true);
    expect(r).toContain(encodeURIComponent(url));
    expect(r).toContain(encodeURIComponent(text));
  });
  it('Facebook hanya url', () => {
    expect(tautanShare('facebook', { url })).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  });
  it('X/Twitter url + text', () => {
    const r = tautanShare('twitter', { url, text });
    expect(r).toContain(`url=${encodeURIComponent(url)}`);
    expect(r).toContain(`text=${encodeURIComponent(text)}`);
  });
  it('Telegram url + text', () => {
    const r = tautanShare('telegram', { url, text });
    expect(r.startsWith('https://t.me/share/url?')).toBe(true);
    expect(r).toContain(encodeURIComponent(url));
  });
  it('text opsional (kosong tetap valid)', () => {
    expect(tautanShare('whatsapp', { url })).toContain(encodeURIComponent(url));
  });
});
