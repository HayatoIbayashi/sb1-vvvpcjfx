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
    description: '一覧セクションに仮の表示を出したいときのサンプルです。後から実データへ置き換えられます。',
    image: createSampleImage('SAMPLE 03', '#312e81', '#a78bfa'),
  },
];

export const HOME_MOVIE_LIST_TEST_SECTIONS: HomeMovieListTestSection[] = [
  {
    id: 'registered-test-list',
    title: '無料会員用動画',
    description: '無料会員ユーザー向けの一覧表示を確認するための固定テストデータです。',
    accessLabel: '無料会員向け',
    items: [
      {
        id: 'registered-test-1',
        title: '無料会員テスト動画 01',
        subtitle: 'LIST TEST',
        description: '無料会員向けの一覧カード表示を確認するためのサンプルです。',
        image: createSampleImage('FREE 01', '#1d4ed8', '#60a5fa'),
        detail: {
          title: '無料会員詳細テスト 01',
          description: '無料会員向けの詳細画面で、タイトルや説明文の見え方を確認するためのテスト文言です。',
          releaseDate: '2026-04-01',
          duration: '00:24:00',
          note: 'この詳細画面は無料会員用のテスト文言に差し替えています。',
        },
      },
      {
        id: 'registered-test-2',
        title: '無料会員テスト動画 02',
        subtitle: 'LIST TEST',
        description: 'タイトルの折り返しや説明文の見え方をテストできます。',
        image: createSampleImage('FREE 02', '#0f766e', '#2dd4bf'),
        detail: {
          title: '無料会員詳細テスト 02',
          description: '説明文がやや長い場合の詳細表示確認に使うためのテスト文言です。カードから詳細への導線も一緒に確認できます。',
          releaseDate: '2026-04-08',
          duration: '00:31:00',
          note: '無料会員向けの詳細コピー確認用サンプルです。',
        },
      },
      {
        id: 'registered-test-3',
        title: '無料会員テスト動画 03',
        subtitle: 'LIST TEST',
        description: '一覧の横並びやカード高さの確認用サンプルです。',
        image: createSampleImage('FREE 03', '#7c3aed', '#c084fc'),
        detail: {
          title: '無料会員詳細テスト 03',
          description: '短めの説明文を使った場合の詳細画面確認に使うためのテスト文言です。',
          releaseDate: '2026-04-15',
          duration: '00:18:00',
          note: '無料会員向けのテスト詳細として表示しています。',
        },
      },
    ],
  },
  {
    id: 'member-test-list',
    title: 'メンバーシップ限定動画',
    description: 'メンバーシップ限定一覧の見え方を確認するための固定テストデータです。',
    accessLabel: 'メンバーシップ限定',
    items: [
      {
        id: 'member-test-1',
        title: 'メンバー限定テスト動画 01',
        subtitle: 'LIST TEST',
        description: '限定動画の一覧表示を確認するためのサンプルです。',
        image: createSampleImage('MEMBER 01', '#9a3412', '#fb923c'),
        detail: {
          title: 'メンバー限定詳細テスト 01',
          description: 'メンバーシップ限定作品の詳細画面で、説明やアクセス導線まわりを確認するためのテスト文言です。',
          releaseDate: '2026-05-01',
          duration: '00:42:00',
          note: 'この詳細画面はメンバーシップ限定のテスト文言に差し替えています。',
        },
      },
      {
        id: 'member-test-2',
        title: 'メンバー限定テスト動画 02',
        subtitle: 'LIST TEST',
        description: '限定バッジやカード情報の密度を確認できます。',
        image: createSampleImage('MEMBER 02', '#991b1b', '#f87171'),
        detail: {
          title: 'メンバー限定詳細テスト 02',
          description: 'やや長い説明文で、詳細画面の段組みや余白、情報量のバランスを確認するためのテスト文言です。',
          releaseDate: '2026-05-08',
          duration: '00:54:00',
          note: 'メンバー限定詳細の表示確認用サンプルです。',
        },
      },
      {
        id: 'member-test-3',
        title: 'メンバー限定テスト動画 03',
        subtitle: 'LIST TEST',
        description: '一覧の段組みと余白を確認するためのテストカードです。',
        image: createSampleImage('MEMBER 03', '#78350f', '#facc15'),
        detail: {
          title: 'メンバー限定詳細テスト 03',
          description: '短めの説明文で、限定作品の詳細画面における見出しと本文のバランスを確認するテスト文言です。',
          releaseDate: '2026-05-15',
          duration: '00:27:00',
          note: 'メンバーシップ限定の詳細文言確認用サンプルです。',
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
