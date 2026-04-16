type HomeDisplaySample = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
};

type HomeMovieListTestDetail = {
  title: string;
  description: string;
  releaseDate: string;
  duration: string;
  note: string;
};

type HomeMovieListTestItem = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  detail: HomeMovieListTestDetail;
};

type HomeMovieListTestSection = {
  id: string;
  title: string;
  description: string;
  accessLabel: string;
  items: HomeMovieListTestItem[];
};

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

export const HOME_DISPLAY_SAMPLES: HomeDisplaySample[] = [
  {
    id: 'sample-featured',
    title: 'サンプル動画 01',
    subtitle: 'トップ表示テスト',
    description: 'メイン画面の見え方を確認するためのサンプルです。動画タイトルや説明文の表示バランスを確認できます。',
    image: createSampleImage('SAMPLE 01', '#0f766e', '#22d3ee'),
  },
  {
    id: 'sample-member',
    title: 'サンプル動画 02',
    subtitle: 'カード表示テスト',
    description: 'カードの並びや余白、サムネイル表示を確認するためのサンプルです。',
    image: createSampleImage('SAMPLE 02', '#7c2d12', '#f59e0b'),
  },
  {
    id: 'sample-recommend',
    title: 'サンプル動画 03',
    subtitle: 'おすすめ表示テスト',
    description: '一覧セクションに並べた際の表示確認用サンプルです。後から実データへ置き換えられます。',
    image: createSampleImage('SAMPLE 03', '#312e81', '#a78bfa'),
  },
];

export const HOME_MOVIE_LIST_TEST_SECTIONS: HomeMovieListTestSection[] = [
  {
    id: 'member-test-list',
    title: 'ログイン後のおすすめ動画',
    description: 'ログイン後に案内する作品一覧の見え方を確認するための固定テストデータです。',
    accessLabel: 'メンバーシップ登録で視聴',
    items: [
      {
        id: 'member-test-1',
        title: 'ログイン後テスト動画 01',
        subtitle: 'LIST TEST',
        description: 'ログイン後に表示するおすすめカードの見え方を確認するためのサンプルです。',
        image: createSampleImage('LOGIN 01', '#9a3412', '#fb923c'),
        detail: {
          title: 'ログイン後詳細テスト 01',
          description: 'ログイン後に案内する作品の詳細画面で、説明文や導線の見え方を確認するためのテスト文言です。',
          releaseDate: '2026-05-01',
          duration: '00:42:00',
          note: 'この詳細画面はログイン後に案内する作品用のテスト文言に差し替えています。',
        },
      },
      {
        id: 'member-test-2',
        title: 'ログイン後テスト動画 02',
        subtitle: 'LIST TEST',
        description: 'ログイン後の一覧でサムネイルや文章量のバランスを確認するためのサンプルです。',
        image: createSampleImage('LOGIN 02', '#991b1b', '#f87171'),
        detail: {
          title: 'ログイン後詳細テスト 02',
          description: 'ログイン後に表示する作品詳細で、導線や補足文の入り方を確認するためのテスト文言です。',
          releaseDate: '2026-05-08',
          duration: '00:54:00',
          note: 'ログイン後の詳細導線確認用サンプルです。',
        },
      },
      {
        id: 'member-test-3',
        title: 'ログイン後テスト動画 03',
        subtitle: 'LIST TEST',
        description: 'ログイン後の一覧に複数カードを並べた場合の見え方を確認するためのサンプルです。',
        image: createSampleImage('LOGIN 03', '#78350f', '#facc15'),
        detail: {
          title: 'ログイン後詳細テスト 03',
          description: 'ログイン後に案内する詳細画面の情報量やレイアウト確認に使うテスト文言です。',
          releaseDate: '2026-05-15',
          duration: '00:27:00',
          note: 'ログイン後の詳細文言確認用サンプルです。',
        },
      },
    ],
  },
];

export function getHomeMovieListTestItem(testDetailId: string | null) {
  if (!testDetailId) {
    return null;
  }

  for (const section of HOME_MOVIE_LIST_TEST_SECTIONS) {
    const foundItem = section.items.find((item) => item.id === testDetailId);
    if (foundItem) {
      return foundItem;
    }
  }

  return null;
}
