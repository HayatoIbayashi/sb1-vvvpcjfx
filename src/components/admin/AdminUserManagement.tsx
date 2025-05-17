import { useState } from 'react';
import { Edit2, Trash2, Shield } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  lastLoginAt: string;
}

const MOCK_ADMIN_USERS: AdminUser[] = [
  {
    id: '1',
    email: 'admin1@example.com',
    name: '管理者1',
    role: 'admin',
    lastLoginAt: '2024-03-15T15:30:00Z'
  },
  {
    id: '2',
    email: 'admin2@example.com',
    name: '管理者2',
    role: 'super_admin',
    lastLoginAt: '2024-03-14T12:45:00Z'
  }
];

export function AdminUserManagement() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(MOCK_ADMIN_USERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleDelete = (adminId: string) => {
    if (confirm('本当にこの管理者を削除しますか？')) {
      setAdminUsers(adminUsers.filter(admin => admin.id !== adminId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">管理者一覧</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition flex items-center gap-2"
        >
          <Shield className="h-5 w-5" />
          新規管理者を追加
        </button>
      </div>

      <div className="bg-dark-lighter rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">管理者</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">権限</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">最終ログイン</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark">
              {adminUsers.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{admin.name}</div>
                      <div className="text-sm text-gray-400">{admin.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      admin.role === 'super_admin'
                        ? 'bg-purple-500/10 text-purple-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {admin.role === 'super_admin' ? 'スーパー管理者' : '管理者'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(admin.lastLoginAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-white transition"
                        title="編集"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(admin.id)}
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
      {isModalOpen && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-lighter p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">管理者情報の編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  名前
                </label>
                <input
                  type="text"
                  value={selectedAdmin.name}
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={selectedAdmin.email}
                  className="w-full px-3 py-2 bg-dark rounde

d border border-dark-light text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  権限
                </label>
                <select
                  value={selectedAdmin.role}
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                >
                  <option value="admin">管理者</option>
                  <option value="super_admin">スーパー管理者</option>
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-lighter p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">新規管理者の追加</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  名前
                </label>
                <input
                  type="text"
                  placeholder="管理者の名前"
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  placeholder="example@example.com"
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  パスワード
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  権限
                </label>
                <select
                  className="w-full px-3 py-2 bg-dark rounded border border-dark-light text-white"
                  defaultValue="admin"
                >
                  <option value="admin">管理者</option>
                  <option value="super_admin">スーパー管理者</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  // Handle create
                  setIsCreateModalOpen(false);
                }}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}