// src/lib/__tests__/share.test.ts
import { describe, it, expect } from 'vitest';
import { tautanShare, denganUtm } from '../share';

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

describe('denganUtm', () => {
  it('menambah utm ke url tanpa query (pakai ?)', () => {
    const r = denganUtm('https://x.id/coba/tema/1', { medium: 'whatsapp', jenis: 'game' });
    expect(r).toBe('https://x.id/coba/tema/1?utm_source=share&utm_medium=whatsapp&utm_content=game');
  });
  it('menyambung dengan & bila url sudah ada query', () => {
    const r = denganUtm('https://x.id/a?b=1', { medium: 'native', jenis: 'kelas' });
    expect(r).toBe('https://x.id/a?b=1&utm_source=share&utm_medium=native&utm_content=kelas');
  });
  it('meng-encode nilai medium/jenis', () => {
    const r = denganUtm('https://x.id/a', { medium: 'w a', jenis: 'k/e' });
    expect(r).toContain('utm_medium=w%20a');
    expect(r).toContain('utm_content=k%2Fe');
  });
});
