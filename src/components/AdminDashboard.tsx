import { useState } from 'react';
import { LogOut, UserCircle, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './admin/ui/Tabs';
import { UserManagement } from './admin/UserManagement';
import { VideoManagement } from './admin/VideoManagement';
import { AdminUserManagement } from './admin/AdminUserManagement';
import { useAuth } from '../context/AuthContext';
import { getAdminRole } from '../lib/authStorage';

const ADMIN_ROLE_LABEL = {
  admin: '管理者',
  super_admin: 'スーパー管理者',
} as const;

export default function AdminDashboard() {
  const auth = useAuth();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const adminRole = getAdminRole(auth.user?.profile);
  const roleLabel = adminRole ? ADMIN_ROLE_LABEL[adminRole] : '-';
  const adminName = auth.user?.profile.name || auth.user?.profile.email || '-';
  const adminEmail = auth.user?.profile.email || '-';

  const handleLogout = () => {
    void auth.signoutRedirect();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <h1 className="text-2xl font-bold text-white">管理ダッシュボード</h1>
          <button
            type="button"
            onClick={() => setIsAccountModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:border-blue-500 hover:bg-gray-800"
          >
            <UserCircle className="h-5 w-5" />
            <span>アカウント情報</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="videos">動画管理</TabsTrigger>
            <TabsTrigger value="users">ユーザー管理</TabsTrigger>
            <TabsTrigger value="admins">管理者</TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <VideoManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="admins">
            <AdminUserManagement />
          </TabsContent>
        </Tabs>
      </main>

      {isAccountModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={() => setIsAccountModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">アカウント情報</h2>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="rounded p-1 text-gray-400 transition hover:bg-gray-700 hover:text-white"
                aria-label="閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-400">管理者名</dt>
                <dd className="mt-1 text-base font-medium text-white">{adminName}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">メールアドレス</dt>
                <dd className="mt-1 break-all text-base font-medium text-white">{adminEmail}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">権限名</dt>
                <dd className="mt-1 text-base font-medium text-white">{roleLabel}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary/90"
            >
              <LogOut className="h-5 w-5" />
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
