// src/components/ArtikelBody.tsx — render isi artikel (markdown minimal → JSX aman).
// Mendukung: ## / ### heading, paragraf, list "- ", **tebal**, [teks](url). Teks di-escape
// otomatis oleh React (tidak pakai dangerouslySetInnerHTML) → aman dari injeksi.
import React from 'react';

// inline: **tebal** dan [teks](url)
function inline(teks: string, kunci: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(teks)) !== null) {
    if (m.index > last) out.push(teks.slice(last, m.index));
    if (m[1] != null) {
      out.push(<strong key={`${kunci}-b${i}`}>{m[1]}</strong>);
    } else {
      const href = m[3];
      const aman = /^(https?:|mailto:|\/)/i.test(href) ? href : '#';
      const eksternal = /^https?:/i.test(aman);
      out.push(
        <a key={`${kunci}-a${i}`} href={aman} target={eksternal ? '_blank' : undefined} rel={eksternal ? 'noopener noreferrer' : undefined} style={{ color: 'var(--biru-d)' }}>{m[2]}</a>,
      );
    }
    last = re.lastIndex; i++;
  }
  if (last < teks.length) out.push(teks.slice(last));
  return out;
}

export default function ArtikelBody({ isi }: { isi: string }) {
  const baris = (isi ?? '').replace(/\r\n/g, '\n').split('\n');
  const blok: React.ReactNode[] = [];
  let paragraf: string[] = [];
  let list: string[] = [];
  let n = 0;

  const tutupParagraf = () => {
    if (paragraf.length) {
      const t = paragraf.join(' ');
      blok.push(<p key={`p${n++}`} style={{ margin: '0 0 14px', lineHeight: 1.7, color: 'var(--tinta)' }}>{inline(t, `p${n}`)}</p>);
      paragraf = [];
    }
  };
  const tutupList = () => {
    if (list.length) {
      blok.push(
        <ul key={`u${n++}`} style={{ margin: '0 0 14px 20px', lineHeight: 1.7, color: 'var(--tinta)' }}>
          {list.map((li, k) => <li key={k}>{inline(li, `u${n}-${k}`)}</li>)}
        </ul>,
      );
      list = [];
    }
  };

  for (const rawLine of baris) {
    const line = rawLine.trimEnd();
    if (!line.trim()) { tutupParagraf(); tutupList(); continue; }
    if (line.startsWith('### ')) {
      tutupParagraf(); tutupList();
      blok.push(<h3 key={`h${n++}`} style={{ color: 'var(--lavender-d)', fontSize: 19, margin: '20px 0 8px' }}>{inline(line.slice(4), `h${n}`)}</h3>);
    } else if (line.startsWith('## ')) {
      tutupParagraf(); tutupList();
      blok.push(<h2 key={`h${n++}`} style={{ color: 'var(--lavender-d)', fontSize: 24, margin: '24px 0 10px' }}>{inline(line.slice(3), `h${n}`)}</h2>);
    } else if (/^[-*]\s+/.test(line)) {
      tutupParagraf();
      list.push(line.replace(/^[-*]\s+/, ''));
    } else {
      tutupList();
      paragraf.push(line.trim());
    }
  }
  tutupParagraf(); tutupList();

  return <>{blok}</>;
}
