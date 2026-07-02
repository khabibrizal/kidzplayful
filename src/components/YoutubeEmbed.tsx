// src/components/YoutubeEmbed.tsx — preview YouTube inline (iframe) ala pojok video
export default function YoutubeEmbed({ id, title = 'Video materi' }: { id: string; title?: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&controls=1`;
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 18, overflow: 'hidden', background: '#2b2440', marginTop: 10 }}>
      <iframe title={title} src={src} allow="encrypted-media" allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
    </div>
  );
}
