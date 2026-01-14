import { useEffect, useState } from 'react';
import { Edit2, Trash2, Ban } from 'lucide-react';

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string | null;
  gender?: Gender | null;
  age?: number | null;
  prefecture?: string | null;
  isMember?: boolean; // メンバーシップ登録の有無（モック）
  status: 'active' | 'suspended';
  registeredAt: string;
  lastLoginAt: string;
}

const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'user1@example.com',
    name: '山田太郎',
    displayName: 'taro_yamada',
    gender: 'male',
    age: 29,
    prefecture: '東京都',
    isMember: true,
    status: 'active',
    registeredAt: '2024-03-01T10:00:00Z',
    lastLoginAt: '2024-03-15T15:30:00Z'
  },
  {
    id: '2',
    email: 'user2@example.com',
    name: '佐藤花子',
    displayName: 'hanako',
    gender: 'female',
    age: 34,
    prefecture: '大阪府',
    isMember: false,
    status: 'suspended',
    registeredAt: '2024-02-15T09:00:00Z',
    lastLoginAt: '2024-03-10T12:45:00Z'
  },
  {
    id: '3',
    email: 'user3@example.com',
    name: '鈴木一郎',
    displayName: 'ichiro',
    gender: 'male',
    age: 41,
    prefecture: '愛知県',
    isMember: true,
    status: 'active',
    registeredAt: '2024-01-20T08:10:00Z',
    lastLoginAt: '2024-03-12T18:25:00Z'
  },
  {
    id: '4',
    email: 'user4@example.com',
    name: '田中美咲',
    displayName: 'misaki',
    gender: 'female',
    age: 22,
    prefecture: '福岡県',
    isMember: false,
    status: 'active',
    registeredAt: '2024-03-05T11:40:00Z',
    lastLoginAt: '2024-03-16T09:05:00Z'
  },
  {
    id: '5',
    email: 'user5@example.com',
    name: '高橋健',
    displayName: 'ken_t',
    gender: 'male',
    age: 31,
    prefecture: '北海道',
    isMember: true,
    status: 'active',
    registeredAt: '2023-12-28T13:00:00Z',
    lastLoginAt: '2024-03-14T19:55:00Z'
  },
  {
    id: '6',
    email: 'user6@example.com',
    name: '小林優',
    displayName: 'yu_k',
    gender: 'other',
    age: 27,
    prefecture: '京都府',
    isMember: false,
    status: 'suspended',
    registeredAt: '2024-02-02T14:20:00Z',
    lastLoginAt: '2024-03-01T10:30:00Z'
  }
];

const GENDER_LABEL: Record<Exclude<Gender, 'prefer_not_to_say'> | 'prefer_not_to_say', string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
  prefer_not_to_say: '未回答',
};

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県',
  '岐阜県','静岡県','愛知県','三重県',
  '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<User | null>(null);
  const [originalForm, setOriginalForm] = useState<User | null>(null);

  useEffect(() => {
    if (isModalOpen && selectedUser) {
      setEditForm({ ...selectedUser });
      setOriginalForm({ ...selectedUser });
    } else {
      setEditForm(null);
      setOriginalForm(null);
    }
  }, [isModalOpen, selectedUser]);

  const setField = <K extends keyof User>(key: K, value: User[K]) => {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } as User : prev));
  };

  const dirtyClass = (key: keyof User) => {
    if (!editForm || !originalForm) return 'text-gray-500';
    const a = String((editForm as any)[key] ?? '');
    const b = String((originalForm as any)[key] ?? '');
    return a === b ? 'text-gray-500' : 'text-black';
  };

  const handleStatusToggle = (userId: string) => {
    setUsers(users.map(user =>
      user.id === userId
        ? { ...user, status: user.status === 'active' ? 'suspended' : 'active' }
        : user
    ));
  };

  const handleDelete = (userId: string) => {
    if (confirm('本当にこのユーザーを削除しますか？')) {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-dark-lighter rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">ユーザー一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ユーザー</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">性別</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">年齢</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">都道府県</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">メンバーシップ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">登録日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">最終ログイン</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{user.name}</div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{user.gender ? GENDER_LABEL[user.gender] : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{typeof user.age === 'number' ? user.age : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{user.prefecture ?? '-'}</td>
                  <td className="px-6 py-4 text-center text-white">{user.isMember ? '○' : ''}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      user.status === 'active'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {user.status === 'active' ? '有効' : '停止'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(user.registeredAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(user.lastLoginAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusToggle(user.id)}
                        className="p-1 text-gray-400 hover:text-white transition"
                        title={user.status === 'active' ? 'アカウントを停止' : 'アカウントを有効化'}
                      >
                        <Ban className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-white transition"
                        title="編集"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition"
                        title="削除"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && selectedUser && editForm && (
        <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
          <div className="bg-dark-lighter p-6 rounded-lg w-full max-w-xl">
            <h3 className="text-xl font-semibold text-white mb-4">ユーザー情報の編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  名前
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className={`w-full px-3 py-2 bg-dark rounded border border-dark-light ${dirtyClass('name')}`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className={`w-full px-3 py-2 bg-dark rounded border border-dark-light ${dirtyClass('email')}`}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">性別</label>
                  <select
                    value={editForm.gender ?? 'prefer_not_to_say'}
                    onChange={(e) => setField('gender', e.target.value as Gender)}
                    className={`w-full px-3 py-2 bg-dark rounded border border-dark-light ${dirtyClass('gender')}`}
                  >
                    <option value="prefer_not_to_say">未回答</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">年齢</label>
                  <input
                    type="number"
                    value={editForm.age ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setField('age', v === '' ? null : Number(v));
                    }}
                    className={`w-full px-3 py-2 bg-dark rounded border border-dark-light ${dirtyClass('age')}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">都道府県</label>
                  <select
                    value={editForm.prefecture ?? ''}
                    onChange={(e) => setField('prefecture', e.target.value || null)}
                    className={`w-full px-3 py-2 bg-dark rounded border border-dark-light ${dirtyClass('prefecture')}`}
                  >
                    <option value="">選択してください</option>
                    {PREFECTURES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  ステータス
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setField('status', e.target.value as User['status'])}
                  className={`w-full px-3 py-2 bg-dark rounded border border-dark-light ${dirtyClass('status')}`}
                >
                  <option value="active">有効</option>
                  <option value="suspended">停止</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (editForm) {
                    setUsers((prev) => prev.map((u) => (u.id === editForm.id ? { ...u, ...editForm } : u)));
                  }
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
              >
                保存
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
