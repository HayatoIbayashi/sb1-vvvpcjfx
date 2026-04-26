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
  items: HomeMovieListTestItem[];
};

function getSampleGenreLabel(labels: string[], index: number) {
  return labels[index] ?? `テストジャンル${index + 1}`;
}

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

export function getHomeMovieListTestSections(genreLabels: string[] = []): HomeMovieListTestSection[] {
  return [
    {
      id: 'member-test-list',
      title: 'ログイン後のおすすめ動画',
      description: 'ログイン後に表示する動画一覧の見え方を確認するための固定テストデータです。',
      items: [
        {
          id: 'member-test-1',
          title: 'ログイン後テスト動画 01',
          subtitle: getSampleGenreLabel(genreLabels, 0),
          description: 'ログイン後に表示するおすすめカードの見え方を確認するためのサンプルです。',
          image: createSampleImage('LOGIN 01', '#9a3412', '#fb923c'),
          detail: {
            title: 'ログイン後詳細テスト 01',
            description: 'ログイン後に表示する動画の詳細画面で、説明文や導線の見え方を確認するためのテスト文言です。',
            releaseDate: '2026-05-01',
            duration: '00:42:00',
            note: 'この詳細画面はログイン後に表示する動画用のテスト文言に差し替えています。',
          },
        },
        {
          id: 'member-test-2',
          title: 'ログイン後テスト動画 02',
          subtitle: getSampleGenreLabel(genreLabels, 1),
          description: 'ログイン後の動画一覧でサムネイルや説明文のバランスを確認するためのサンプルです。',
          image: createSampleImage('LOGIN 02', '#991b1b', '#f87171'),
          detail: {
            title: 'ログイン後詳細テスト 02',
            description: 'ログイン後に表示する動画詳細で、注意文や作品紹介の表示を確認するためのテスト文言です。',
            releaseDate: '2026-05-08',
            duration: '00:54:00',
            note: 'ログイン後の詳細ページ表示確認用サンプルです。',
          },
        },
        {
          id: 'member-test-3',
          title: 'ログイン後テスト動画 03',
          subtitle: getSampleGenreLabel(genreLabels, 2),
          description: 'ログイン後の動画一覧に複数カードを並べた場合の見え方を確認するためのサンプルです。',
          image: createSampleImage('LOGIN 03', '#78350f', '#facc15'),
          detail: {
            title: 'ログイン後詳細テスト 03',
            description: 'ログイン後に表示する詳細画面の情報量やレイアウト確認に使うテスト文言です。',
            releaseDate: '2026-05-15',
            duration: '00:27:00',
            note: 'ログイン後の詳細文言確認用サンプルです。',
          },
        },
      ],
    },
  ];
}

export function getHomePublicCatalogFallbackItems(genreLabels: string[] = []): HomeMovieListTestItem[] {
  return [
    {
      id: 'public-test-1',
      title: '配信テスト紹介動画 01',
      subtitle: getSampleGenreLabel(genreLabels, 0),
      description: '紹介動画の元データが無い場合に見え方を確認するための固定テストカードです。',
      image: createSampleImage('PUBLIC 01', '#0f766e', '#22d3ee'),
      detail: {
        title: '紹介動画テスト詳細 01',
        description: '紹介動画の固定テストカードから遷移した際の詳細画面用テキストです。',
        releaseDate: '2026-06-01',
        duration: '00:36:00',
        note: 'この詳細画面は紹介動画のフォールバック表示を確認するためのテストデータです。',
      },
    },
    {
      id: 'public-test-2',
      title: '配信テスト紹介動画 02',
      subtitle: getSampleGenreLabel(genreLabels, 1),
      description: '紹介一覧のデータ未登録時に並べる暫定のテストカードです。',
      image: createSampleImage('PUBLIC 02', '#1d4ed8', '#60a5fa'),
      detail: {
        title: '紹介動画テスト詳細 02',
        description: '紹介動画のフォールバック枠で表示するテスト詳細テキストです。',
        releaseDate: '2026-06-08',
        duration: '00:48:00',
        note: '紹介動画の空表示を避けるための固定サンプルです。',
      },
    },
    {
      id: 'public-test-3',
      title: '配信テスト紹介動画 03',
      subtitle: getSampleGenreLabel(genreLabels, 2),
      description: '一覧レイアウト確認用に追加した紹介動画テストカードです。',
      image: createSampleImage('PUBLIC 03', '#374151', '#9ca3af'),
      detail: {
        title: '紹介動画テスト詳細 03',
        description: '紹介動画データが無い場合でも詳細遷移を確認できるようにしたテスト詳細です。',
        releaseDate: '2026-06-15',
        duration: '00:29:00',
        note: '紹介動画フォールバックの導線確認用サンプルです。',
      },
    },
  ];
}

export function getHomeMemberCatalogFallbackItems(genreLabels: string[] = []): HomeMovieListTestItem[] {
  return [
    {
      id: 'member-catalog-test-1',
      title: '会員向けテスト動画 01',
      subtitle: getSampleGenreLabel(genreLabels, 0),
      description: 'メンバー向け一覧が空のときに見え方を確認するための固定テストカードです。',
      image: createSampleImage('MEMBER 01', '#7c2d12', '#fb923c'),
      detail: {
        title: '会員向け一覧テスト詳細 01',
        description: 'ログイン後に表示する一覧のフォールバック導線確認用テキストです。',
        releaseDate: '2026-06-22',
        duration: '00:40:00',
        note: 'メンバー向け一覧フォールバックの詳細確認用サンプルです。',
      },
    },
    {
      id: 'member-catalog-test-2',
      title: '会員向けテスト動画 02',
      subtitle: getSampleGenreLabel(genreLabels, 1),
      description: '会員向けデータ未登録時に並べる暫定のテストカードです。',
      image: createSampleImage('MEMBER 02', '#7e22ce', '#c084fc'),
      detail: {
        title: '会員向け一覧テスト詳細 02',
        description: 'メンバー向け一覧のフォールバック表示を確認するための詳細テキストです。',
        releaseDate: '2026-06-29',
        duration: '00:51:00',
        note: '会員向け一覧の暫定カードから遷移した際のテスト表示です。',
      },
    },
    {
      id: 'member-catalog-test-3',
      title: '会員向けテスト動画 03',
      subtitle: getSampleGenreLabel(genreLabels, 2),
      description: 'メンバー向けセクションの表示確認用に追加した固定テストカードです。',
      image: createSampleImage('MEMBER 03', '#991b1b', '#f87171'),
      detail: {
        title: '会員向け一覧テスト詳細 03',
        description: '会員向け一覧の代替表示として使う詳細テキストです。',
        releaseDate: '2026-07-06',
        duration: '00:33:00',
        note: '会員向け一覧データが無い場合でも導線確認ができるようにしています。',
      },
    },
  ];
}

function getAllHomeMovieListTestItems() {
  return [
    ...getHomeMovieListTestSections().flatMap((section) => section.items),
    ...getHomePublicCatalogFallbackItems(),
    ...getHomeMemberCatalogFallbackItems(),
  ];
}

export function getHomeMovieListTestItem(testDetailId: string | null) {
  if (!testDetailId) {
    return null;
  }

  for (const item of getAllHomeMovieListTestItems()) {
    if (item.id === testDetailId) {
      return item;
    }
  }

  return null;
}
