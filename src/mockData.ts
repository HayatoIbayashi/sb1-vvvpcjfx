import type { Database } from './lib/types';

type Movie = Database['public']['Tables']['movies']['Row'];

export const MOCK_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'インセプション',
    description: '夢の中に入り込み、他人の心から情報を盗み出す特殊な技術を持つプロフェッショナル・チームの物語。今回の任務は、逆に他人の心に思考を植え付けること。',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800',
    release_date: '2010-07-16',
    duration: '2時間28分',
    rating: 8.8,
    genre: ['アクション', 'SF', 'サスペンス'],
    cast: ['レオナルド・ディカプリオ', 'エレン・ペイジ', '渡辺謙'],
    director: 'クリストファー・ノーラン',
    release_year: 2010,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: '千と千尋の神隠し',
    description: '両親と共に引っ越し先への途中、不思議な町へ迷い込んでしまった少女・千尋が、魔法の世界で繰り広げる冒険を描いたアニメーション映画。',
    thumbnail: 'https://images.unsplash.com/photo-1608346128025-1896b97a6fa7?auto=format&fit=crop&q=80&w=800',
    release_date: '2001-07-20',
    duration: '2時間5分',
    rating: 9.0,
    genre: ['アニメーション', 'ファンタジー', 'アドベンチャー'],
    cast: ['柊瑠美', '入野自由', '夏木マリ'],
    director: '宮崎駿',
    release_year: 2001,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'マトリックス',
    description: 'コンピュータプログラマーのネオが、現実世界が人工知能によって作られた仮想現実であることを知り、人類を解放するための戦いに身を投じる。',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800',
    release_date: '1999-03-31',
    duration: '2時間16分',
    rating: 8.7,
    genre: ['アクション', 'SF'],
    cast: ['キアヌ・リーブス', 'ローレンス・フィッシュバーン', 'キャリー＝アン・モス'],
    director: 'ウォシャウスキー姉弟',
    release_year: 1999,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];