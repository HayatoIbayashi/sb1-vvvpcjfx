import { useEffect, useMemo, useState } from 'react';
import { Ban, Edit2, Trash2 } from 'lucide-react';
import type { AdminUser, AdminUserUpdatePayload } from '../../lib/apiClient';
import useApiClient from '../../lib/useApiClient';

const GENDER_OPTIONS = [
  { value: 'prefer_not_to_say', label: '回答しない' },
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
] as const;

const GENDER_LABEL: Record<string, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
  prefer_not_to_say: '回答しない',
};

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

const MOCK_USERS: AdminUser[] = [
  {
    id: 'mock-user-1',
    email: 'user1@example.com',
    gender: 'male',
    age: 29,
    prefecture: '東京都',
    is_member: true,
    status: 'active',
    registered_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-15T15:30:00Z',
  },
  {
    id: 'mock-user-2',
    email: 'user2@example.com',
    gender: 'female',
    age: 34,
    prefecture: '大阪府',
    is_member: false,
    status: 'suspended',
    registered_at: '2024-02-15T09:00:00Z',
    updated_at: '2024-03-10T12:45:00Z',
  },
];

type EditFormState = {
  email: string;
  gender: string;
  age: number | '';
  prefecture: string;
  status: 'active' | 'suspended';
};

function toEditForm(user: AdminUser): EditFormState {
  return {
    email: user.email,
    gender: user.gender ?? 'prefer_not_to_say',
    age: user.age ?? '',
    prefecture: user.prefecture ?? '',
    status: user.status,
  };
}

function formatDisplayName(user: AdminUser) {
  return user.email.split('@')[0] || user.email;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function toUpdatePayload(form: EditFormState): AdminUserUpdatePayload {
  return {
    email: form.email.trim(),
    gender: form.gender === 'prefer_not_to_say' ? null : form.gender,
    age: form.age === '' ? null : Number(form.age),
    prefecture: form.prefecture || null,
    status: form.status,
  };
}

export function UserManagement() {
  const api = useApiClient();
  const useMockUsers = import.meta.env.VITE_USE_MOCK_USERS === 'true';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (useMockUsers) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (!cancelled) setUsers(MOCK_USERS);
          return;
        }

        const res = await api.getAdminUsers();
        if (!cancelled) setUsers(res.items);
      } catch (err) {
        if (!cancelled) setError('ユーザー一覧の取得に失敗しました。');
        console.error('Error fetching admin users:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [api, useMockUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;
      if (!normalizedQuery) return true;

      const fields = [
        user.email,
        formatDisplayName(user),
        user.prefecture ?? '',
        user.gender ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return fields.includes(normalizedQuery);
    });
  }, [users, query, statusFilter]);

  const closeModal = () => {
    setSelectedUser(null);
    setEditForm(null);
  };

  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm(toEditForm(user));
  };

  const handleStatusToggle = async (user: AdminUser) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';

    try {
      setError(null);
      if (!useMockUsers) {
        const updatedUser = await api.updateAdminUser(user.id, {
          email: user.email,
          gender: user.gender,
          age: user.age,
          prefecture: user.prefecture,
          status: nextStatus,
        });
        setUsers((prev) => prev.map((item) => (item.id === user.id ? updatedUser : item)));
        return;
      }

      setUsers((prev) => prev.map((item) => (
        item.id === user.id ? { ...item, status: nextStatus } : item
      )));
    } catch (err) {
      setError('ユーザーステータスの更新に失敗しました。');
      console.error('Error updating admin user status:', err);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('本当にこのユーザーを削除しますか？')) return;

    try {
      setError(null);
      if (!useMockUsers) {
        await api.deleteAdminUser(userId);
      }
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      setError('ユーザーの削除に失敗しました。');
      console.error('Error deleting admin user:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedUser || !editForm) return;

    try {
      setError(null);
      const payload = toUpdatePayload(editForm);
      if (!payload.email) {
        setError('メールアドレスは必須です。');
        return;
      }

      if (!useMockUsers) {
        const updatedUser = await api.updateAdminUser(selectedUser.id, payload);
        setUsers((prev) => prev.map((user) => (
          user.id === selectedUser.id ? updatedUser : user
        )));
      } else {
        setUsers((prev) => prev.map((user) => (
          user.id === selectedUser.id
            ? {
                ...user,
                email: payload.email ?? user.email,
                gender: payload.gender ?? null,
                age: payload.age ?? null,
                prefecture: payload.prefecture ?? null,
                status: payload.status ?? user.status,
                updated_at: new Date().toISOString(),
              }
            : user
        )));
      }

      closeModal();
    } catch (err) {
      setError('ユーザー情報の更新に失敗しました。');
      console.error('Error updating admin user:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-dark-lighter p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">ユーザー一覧</h2>
            <p className="mt-1 text-sm text-gray-400">会員情報の確認、停止、削除、基本情報の更新ができます。</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(320px,1fr)_180px]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="メールアドレス・表示名・都道府県で検索"
              aria-label="ユーザー検索"
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              aria-label="ステータス絞り込み"
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="active">有効</option>
              <option value="suspended">停止</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500 bg-red-500/10 px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-dark-lighter">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">ユーザー</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">性別</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">年齢</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">都道府県</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">メンバーシップ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">登録日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">更新日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{formatDisplayName(user)}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {user.gender ? GENDER_LABEL[user.gender] ?? user.gender : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{user.age ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{user.prefecture ?? '-'}</td>
                    <td className="px-6 py-4 text-center text-white">{user.is_member ? '◯' : ''}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2 py-1 text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                      >
                        {user.status === 'active' ? '有効' : '停止'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{formatDate(user.registered_at)}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{formatDate(user.updated_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusToggle(user)}
                          className="p-1 text-gray-400 transition hover:text-white"
                          title={user.status === 'active' ? '停止に変更' : '有効に変更'}
                          aria-label={`${user.email} のステータスを切り替え`}
                        >
                          <Ban className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1 text-gray-400 transition hover:text-white"
                          title="編集"
                          aria-label={`${user.email} を編集`}
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1 text-gray-400 transition hover:text-red-500"
                          title="削除"
                          aria-label={`${user.email} を削除`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredUsers.length && (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-400">
                      条件に一致するユーザーが見つかりません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && editForm && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/90"
          onMouseDown={closeModal}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="w-full max-w-xl rounded-lg bg-dark-lighter p-6"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h3 className="mb-4 text-xl font-semibold text-white">ユーザー情報の編集</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">表示名</label>
                  <div className="rounded border border-dark-light bg-dark px-3 py-2 text-gray-300">
                    {formatDisplayName(selectedUser)}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">表示名は現在 DB に保持していないため、メールアドレスから自動表示しています。</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">メールアドレス</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                    aria-label="メールアドレス"
                    className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-400">性別</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm((prev) => (prev ? { ...prev, gender: e.target.value } : prev))}
                      aria-label="性別"
                      className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                    >
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-400">年齢</label>
                    <input
                      type="number"
                      value={editForm.age}
                      onChange={(e) => setEditForm((prev) => (
                        prev
                          ? { ...prev, age: e.target.value === '' ? '' : Number(e.target.value) }
                          : prev
                      ))}
                      aria-label="年齢"
                      className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-400">都道府県</label>
                    <select
                      value={editForm.prefecture}
                      onChange={(e) => setEditForm((prev) => (prev ? { ...prev, prefecture: e.target.value } : prev))}
                      aria-label="都道府県"
                      className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                    >
                      <option value="">選択してください</option>
                      {PREFECTURES.map((prefecture) => (
                        <option key={prefecture} value={prefecture}>{prefecture}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-400">ステータス</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => (
                      prev ? { ...prev, status: e.target.value as EditFormState['status'] } : prev
                    ))}
                    aria-label="ステータス"
                    className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                  >
                    <option value="active">有効</option>
                    <option value="suspended">停止</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-400 transition hover:text-white"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  className="rounded bg-primary px-4 py-2 text-white transition hover:bg-primary/90"
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
