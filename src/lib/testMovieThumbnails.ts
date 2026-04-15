type ThumbnailMovie = {
  id: string;
  title: string;
  release_date?: string | null;
};

type ThumbnailVariant = 'card' | 'hero' | 'detail';

const PALETTES = [
  { start: '#0f172a', end: '#1d4ed8', accent: '#38bdf8' },
  { start: '#111827', end: '#c2410c', accent: '#f59e0b' },
  { start: '#172554', end: '#7c3aed', accent: '#c084fc' },
  { start: '#052e16', end: '#15803d', accent: '#4ade80' },
  { start: '#3f1d2e', end: '#be185d', accent: '#f9a8d4' },
];

const VARIANT_CONFIG: Record<ThumbnailVariant, {
  width: number;
  height: number;
  badge: string;
  subtitle: string;
}> = {
  card: { width: 720, height: 1080, badge: 'テストサムネイル', subtitle: 'カード表示' },
  hero: { width: 1600, height: 900, badge: 'テストサムネイル', subtitle: 'メイン表示' },
  detail: { width: 1080, height: 1350, badge: 'テストサムネイル', subtitle: '詳細表示' },
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function escapeSvgText(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeThumbnailTitle(title?: string | null) {
  if (!title) {
    return 'TEST VIDEO';
  }

  return title.replaceAll('テスト映画', 'テスト動画');
}

function wrapTitle(title: string, maxLength: number) {
  const chars = Array.from(title.trim());
  const lines: string[] = [];

  for (let index = 0; index < chars.length; index += maxLength) {
    lines.push(chars.slice(index, index + maxLength).join(''));
  }

  return lines.slice(0, 3);
}

export function getTestMovieThumbnail(
  movie: ThumbnailMovie,
  variant: ThumbnailVariant = 'card',
) {
  const normalizedTitle = normalizeThumbnailTitle(movie.title);
  const config = VARIANT_CONFIG[variant];
  const palette = PALETTES[hashString(movie.id || movie.title) % PALETTES.length];
  const titleLines = wrapTitle(normalizedTitle, variant === 'hero' ? 18 : 10);
  const titleStartY = variant === 'hero' ? 420 : 640;
  const lineHeight = variant === 'hero' ? 84 : 72;
  const releaseLabel = movie.release_date ? `公開日 ${movie.release_date}` : '表示確認用';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" role="img" aria-label="${escapeSvgText(normalizedTitle)}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.start}" />
          <stop offset="100%" stop-color="${palette.end}" />
        </linearGradient>
      </defs>
      <rect width="${config.width}" height="${config.height}" fill="url(#bg)" />
      <circle cx="${config.width * 0.82}" cy="${config.height * 0.18}" r="${Math.round(config.height * 0.16)}" fill="${palette.accent}" fill-opacity="0.18" />
      <circle cx="${config.width * 0.18}" cy="${config.height * 0.82}" r="${Math.round(config.height * 0.12)}" fill="#ffffff" fill-opacity="0.08" />
      <rect x="48" y="48" width="${config.width - 96}" height="${config.height - 96}" rx="36" fill="none" stroke="rgba(255,255,255,0.18)" />
      <text x="72" y="110" fill="${palette.accent}" font-size="${variant === 'hero' ? 34 : 26}" font-family="Arial, sans-serif" font-weight="700" letter-spacing="4">${config.badge}</text>
      <text x="72" y="${variant === 'hero' ? 180 : 176}" fill="rgba(255,255,255,0.72)" font-size="${variant === 'hero' ? 28 : 24}" font-family="Arial, sans-serif" letter-spacing="3">${config.subtitle}</text>
      ${titleLines.map((line, index) => `
        <text
          x="72"
          y="${titleStartY + (index * lineHeight)}"
          fill="#ffffff"
          font-size="${variant === 'hero' ? 72 : 60}"
          font-family="Arial, sans-serif"
          font-weight="700"
        >${escapeSvgText(line)}</text>
      `).join('')}
      <text x="72" y="${config.height - 120}" fill="rgba(255,255,255,0.72)" font-size="${variant === 'hero' ? 24 : 22}" font-family="Arial, sans-serif" letter-spacing="2">${escapeSvgText(releaseLabel)}</text>
      <text x="72" y="${config.height - 72}" fill="rgba(255,255,255,0.52)" font-size="${variant === 'hero' ? 20 : 18}" font-family="Arial, sans-serif">ローカル確認用</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
