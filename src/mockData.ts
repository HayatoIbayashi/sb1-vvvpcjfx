import type { Database } from './lib/types';

type Movie = Database['public']['Tables']['movies']['Row'];

export const MOCK_MOVIES: Movie[] = [
  {
    id: '1',
    title: '1%er ワンパーセンター',
    description: 'かつて一世を風靡した孤高のアクション俳優、拓馬敏朗は、より実戦的でリアルなアクションを突き詰めるがゆえに、映画業界から居場所がなくなり冴えない日々を過ごしていた。\n' +
                'ある日、弟子のアキラと共に自らアクション映画を撮影すると決め、廃墟となった無人島を訪れるのだが、島にはある秘密が隠されていた...\n' +
                '閉ざされた島の中で事件に巻き込まれていく敏朗は、ジークンドーを極めた最強の暗殺者・黄島に命を狙われる。\n' +
                '最新の戦闘術を身につけた"殺せない"アクション俳優が、極限状態の中で自身の力に目覚めるとき。選ばれし男たち(1%er)の闘いが始まる。\n' +
                '©WiiBER All Rights Reserved.',
    thumbnail: '../src/assets/ワンパーセンター.jpg',
    thumbnail_top: '../src/assets/ワンパーセンターtop.webp',
    thumbnail_detail: '../src/assets/ワンパーセンターdetail.jpg',
    release_date: '2024/12/6',
    duration: '1時間24分',
    genre: ['アクション'],
    cast: ['坂口拓','石井東吾','福山康平','平沼紀久','駿河太郎'],
    director: '山口雄大',
    release_year: 2024,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    price: 1000,
    rental_price: 500
  },
  {
    id: '2',
    title: 'RE:BORN',
    description: '石川県加賀市のコンビニで、店員をしながら少女サチと慎ましい日々を送る敏郎。\n' +
                '彼はかつて最強の特殊傭兵部隊に属しながら、自らの手で部隊を壊滅させた過去があった。\n' +
                'ある日、彼らがひっそり暮らす田舎町で、不可解な殺人事件が起きる。\n' +
                'それは、ファントムと呼ばれる謎の男からの、敏郎に対する警告だった。\n' +
                '©「リボーン」製作実行委員会\n',
    thumbnail: '../src/assets/REBORN.jpg',
    thumbnail_top: '../src/assets/ワンパーセンターtop.webp',
    thumbnail_detail: '../src/assets/reborn_detail.webp',
    release_date: '2017/8/12',
    duration: '1時間45分',
    genre: ['アクション'],
    cast: ['坂口拓','近藤結良','斎藤工','長谷部瞳','篠田麻里子'],
    director: '下村勇二',
    release_year: 2017,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    price: 1000,
    rental_price: 500
  },
  {
    id: '3',
    title: '狂武蔵',
    description: '1604(慶長9)年、9歳の吉岡又七郎と宮本武蔵(坂口拓)との決闘が行われようとしていた。\n' +
                '武蔵に道場破りをされた名門吉岡道場は、既にこれまで2度の決闘で師範清十郎とその弟伝七郎を失っていた。\n' +
                '面目を潰された一門はまだ幼い清十郎の嫡男・ 源次郎殿との決闘を仕込み、一門全員で武蔵を襲う計略を練ったのだった。\n' +
                '一門100人に加え、金で雇った他流派300人が決闘場のまわりに身を潜めていたが、突如現れた武蔵が襲いかかる。\n' +
                '突然の奇襲に凍りつく吉岡一門。そして武蔵 1人対吉岡一門400人の死闘が始まった!\n' +
                '©2020 CRAZY SAMURAI MUSASHI Film Partners\n' ,
    thumbnail: '../src/assets/狂武蔵.jpg',
    thumbnail_top: '../src/assets/ワンパーセンターtop.webp',
    thumbnail_detail: '../src/assets/狂武蔵detail.webp',
    release_date: '2020-8-21',
    duration: '1時間31分',
    genre: ['アクション'],
    cast: ['坂口拓','山﨑賢人','斎藤洋介','樋浦勉'],
    director: '下村勇二',
    release_year: 1999,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    price: 1000,
    rental_price: 500
  }
];