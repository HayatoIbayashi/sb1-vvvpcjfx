function createSampleImage(label: string, background: string, accent: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${background}" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)" />
      <circle cx="980" cy="160" r="120" fill="${accent}" opacity="0.28" />
      <circle cx="180" cy="520" r="180" fill="${accent}" opacity="0.18" />
      <rect x="80" y="84" width="220" height="10" rx="5" fill="${accent}" opacity="0.9" />
      <rect x="80" y="116" width="160" height="10" rx="5" fill="#f3f4f6" opacity="0.9" />
      <text x="80" y="310" fill="#f9fafb" font-size="76" font-family="Arial, sans-serif" font-weight="700">
        ${label}
      </text>
      <text x="80" y="378" fill="#d1d5db" font-size="30" font-family="Arial, sans-serif">
        Layout check sample visual
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const HOME_DISPLAY_SAMPLES = [
  {
    id: 'sample-featured',
    title: 'サンプル動画 01',
    subtitle: 'トップ表示テスト',
    description: 'メイン画面の見え方を確認するための固定サンプルです。画像・タイトル・説明文の差し替え前に使えます。',
    image: createSampleImage('SAMPLE 01', '#0f766e', '#22d3ee'),
  },
  {
    id: 'sample-member',
    title: 'サンプル動画 02',
    subtitle: 'カード表示テスト',
    description: 'カードの余白、文字量、サムネイル比率を確認するためのダミーデータです。',
    image: createSampleImage('SAMPLE 02', '#7c2d12', '#f59e0b'),
  },
  {
    id: 'sample-recommend',
    title: 'サンプル動画 03',
    subtitle: 'おすすめ表示テスト',
    description: '一覧セクションに仮の表示を出したいときのサンプルです。後から実データへ置き換えられます。',
    image: createSampleImage('SAMPLE 03', '#312e81', '#a78bfa'),
  },
] as const;
