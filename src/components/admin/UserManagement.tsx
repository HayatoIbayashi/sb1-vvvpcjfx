import { useState } from 'react';
import { Edit2, Trash2, Ban } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'suspended';
  registeredAt: string;
  lastLoginAt: string;
}

const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'user1@example.com',
    name: '山田太郎',
    status: 'active',
    registeredAt: '2024-03-01T10:00:00Z',
    lastLoginAt: '2024-03-15T15:30:00Z'
  },
  {
    id: '2',
    email: 'user2@example.com',
    name: '佐藤花子',
    status: 'suspended',
    registeredAt: '2024-02-15T09:00:00Z',
    lastLoginAt: '2024-03-10T12:45:00Z'
  }
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-lighter p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">ユーザー情報の編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  名前
                </label>
                <input
                  type="text"
                  value={selectedUser.name}
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={selectedUser.email}
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  ステータス
                </label>
                <select
                  value={selectedUser.status}
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
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
                  // Handle save
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}