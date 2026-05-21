import { useEffect, useMemo, useState } from 'react';
import { Edit2, Shield, Trash2 } from 'lucide-react';
import type {
  AdminAccount,
  AdminAccountCreatePayload,
  AdminAccountRole,
  AdminAccountUpdatePayload,
} from '../../lib/apiClient';
import useApiClient from '../../lib/useApiClient';
import { useAuth } from '../../context/AuthContext';
import { getAdminRole } from '../../lib/authStorage';

const ROLE_OPTIONS: Array<{ value: AdminAccountRole; label: string }> = [
  { value: 'admin', label: '管理者' },
  { value: 'super_admin', label: '最高管理者' },
];

const ROLE_LABEL: Record<AdminAccountRole, string> = {
  admin: '管理者',
  super_admin: '最高管理者',
};

const MOCK_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: 'admin-1',
    email: 'admin1@example.com',
    name: '運営管理者',
    role: 'admin',
    enabled: true,
    status: 'CONFIRMED',
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-15T15:30:00Z',
  },
  {
    id: 'admin-2',
    email: 'owner@example.com',
    name: 'システム管理者',
    role: 'super_admin',
    enabled: true,
    status: 'CONFIRMED',
    created_at: '2024-02-15T09:00:00Z',
    updated_at: '2024-03-14T12:45:00Z',
  },
];

type CreateFormState = {
  email: string;
  name: string;
  password: string;
  role: AdminAccountRole;
};

type EditFormState = {
  email: string;
  name: string;
  role: AdminAccountRole;
};

function createEmptyCreateForm(): CreateFormState {
  return {
    email: '',
    name: '',
    password: '',
    role: 'admin',
  };
}

function toEditForm(account: AdminAccount): EditFormState {
  return {
    email: account.email,
    name: account.name ?? '',
    role: account.role,
  };
}

function toCreatePayload(form: CreateFormState): AdminAccountCreatePayload {
  return {
    email: form.email.trim(),
    name: form.name.trim() || null,
    password: form.password,
    role: form.role,
  };
}

function toUpdatePayload(form: EditFormState): AdminAccountUpdatePayload {
  return {
    email: form.email.trim(),
    name: form.name.trim() || null,
    role: form.role,
  };
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function getStatusBadge(account: AdminAccount) {
  if (!account.enabled) {
    return {
      label: '無効',
      className: 'bg-red-500/10 text-red-400',
    };
  }

  if (account.status === 'FORCE_CHANGE_PASSWORD') {
    return {
      label: '初期設定中',
      className: 'bg-yellow-500/10 text-yellow-400',
    };
  }

  return {
    label: '有効',
    className: 'bg-green-500/10 text-green-400',
  };
}

export function AdminUserManagement() {
  const api = useApiClient();
  const auth = useAuth();
  const useMockAdmins = import.meta.env.VITE_USE_MOCK_ADMIN_USERS === 'true';
  const canManageAdminAccounts = getAdminRole(auth.user?.profile) === 'super_admin';

  const [adminUsers, setAdminUsers] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminAccountRole>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(createEmptyCreateForm());
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAdminAccounts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (useMockAdmins) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (!cancelled) setAdminUsers(MOCK_ADMIN_ACCOUNTS);
          return;
        }

        const res = await api.getAdminAccounts();
        if (!cancelled) setAdminUsers(res.items);
      } catch (err) {
        if (!cancelled) setError('管理者一覧の取得に失敗しました。');
        console.error('Error fetching admin accounts:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadAdminAccounts();
    return () => {
      cancelled = true;
    };
  }, [api, useMockAdmins]);

  const filteredAdminUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return adminUsers.filter((admin) => {
      if (roleFilter !== 'all' && admin.role !== roleFilter) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        admin.email,
        admin.name ?? '',
        ROLE_LABEL[admin.role],
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [adminUsers, query, roleFilter]);

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateForm(createEmptyCreateForm());
  };

  const closeEditModal = () => {
    setSelectedAdmin(null);
    setEditForm(null);
  };

  const openEditModal = (admin: AdminAccount) => {
    setSelectedAdmin(admin);
    setEditForm(toEditForm(admin));
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const payload = toCreatePayload(createForm);

      if (!payload.email) {
        setError('メールアドレスは必須です。');
        return;
      }
      if (!payload.password) {
        setError('パスワードは必須です。');
        return;
      }
      if (payload.password.length < 8) {
        setError('パスワードは8文字以上で入力してください。');
        return;
      }

      if (!useMockAdmins) {
        const created = await api.createAdminAccount(payload);
        setAdminUsers((prev) => [created, ...prev]);
      } else {
        setAdminUsers((prev) => [
          {
            id: payload.email,
            email: payload.email,
            name: payload.name ?? null,
            role: payload.role,
            enabled: true,
            status: 'CONFIRMED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      closeCreateModal();
    } catch (err) {
      setError('管理者アカウントの作成に失敗しました。');
      console.error('Error creating admin account:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedAdmin || !editForm) return;

    try {
      setError(null);
      const payload = toUpdatePayload(editForm);
      if (!payload.email) {
        setError('メールアドレスは必須です。');
        return;
      }

      if (!useMockAdmins) {
        const updated = await api.updateAdminAccount(selectedAdmin.id, payload);
        setAdminUsers((prev) => prev.map((admin) => (
          admin.id === selectedAdmin.id ? updated : admin
        )));
      } else {
        setAdminUsers((prev) => prev.map((admin) => (
          admin.id === selectedAdmin.id
            ? {
              ...admin,
              email: payload.email,
              name: payload.name ?? null,
              role: payload.role,
              updated_at: new Date().toISOString(),
            }
            : admin
        )));
      }

      closeEditModal();
    } catch (err) {
      setError('管理者アカウントの更新に失敗しました。');
      console.error('Error updating admin account:', err);
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm('本当にこの管理者を削除しますか？')) return;

    try {
      setError(null);
      if (!useMockAdmins) {
        await api.deleteAdminAccount(adminId);
      }
      setAdminUsers((prev) => prev.filter((admin) => admin.id !== adminId));
    } catch (err) {
      setError('管理者アカウントの削除に失敗しました。');
      console.error('Error deleting admin account:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-dark-lighter p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">管理者一覧</h2>
            <p className="mt-1 text-sm text-gray-400">管理者アカウントの作成、権限変更、削除ができます。</p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="grid gap-3 md:grid-cols-[minmax(320px,1fr)_180px]">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="メールアドレス・名前・権限で検索"
                aria-label="管理者検索"
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                aria-label="権限絞り込み"
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="admin">管理者</option>
                <option value="super_admin">最高管理者</option>
              </select>
            </div>

            {canManageAdminAccounts && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-primary/90"
              >
                <Shield className="h-5 w-5" />
                <span>新規管理者を追加</span>
              </button>
            )}
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">管理者</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">権限</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">状態</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">登録日</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">最終更新</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark">
                {filteredAdminUsers.map((admin) => {
                  const badge = getStatusBadge(admin);
                  return (
                    <tr key={admin.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{admin.name || '名前未設定'}</div>
                          <div className="text-sm text-gray-400">{admin.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${admin.role === 'super_admin'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-blue-500/10 text-blue-400'
                          }`}
                        >
                          {ROLE_LABEL[admin.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{formatDate(admin.created_at)}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{formatDate(admin.updated_at)}</td>
                      <td className="px-6 py-4">
                        {canManageAdminAccounts ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditModal(admin)}
                              className="p-1 text-gray-400 transition hover:text-white"
                              title="編集"
                              aria-label={`${admin.email} を編集`}
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(admin.id)}
                              className="p-1 text-gray-400 transition hover:text-red-500"
                              title="削除"
                              aria-label={`${admin.email} を削除`}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!filteredAdminUsers.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                      条件に一致する管理者が見つかりません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManageAdminAccounts && selectedAdmin && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onMouseDown={closeEditModal}
        >
          <div
            className="w-full max-w-md rounded-lg bg-dark-lighter p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-semibold text-white">管理者情報の編集</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">名前</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                  aria-label="管理者名"
                  className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">メールアドレス</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                  aria-label="管理者メールアドレス"
                  className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">権限</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => (
                    prev ? { ...prev, role: e.target.value as AdminAccountRole } : prev
                  ))}
                  aria-label="管理者権限"
                  className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={closeEditModal}
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
      )}

      {canManageAdminAccounts && isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onMouseDown={closeCreateModal}
        >
          <div
            className="w-full max-w-md rounded-lg bg-dark-lighter p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-semibold text-white">新規管理者の追加</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">名前</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  aria-label="新規管理者名"
                  className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">メールアドレス</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  aria-label="新規管理者メールアドレス"
                  className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">初期パスワード</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  aria-label="新規管理者パスワード"
                  className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">権限</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((prev) => (
                    { ...prev, role: e.target.value as AdminAccountRole }
                  ))}
                  aria-label="新規管理者権限"
                  className="w-full rounded border border-dark-light bg-dark px-3 py-2 text-white"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2 text-gray-400 transition hover:text-white"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                className="rounded bg-primary px-4 py-2 text-white transition hover:bg-primary/90"
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
