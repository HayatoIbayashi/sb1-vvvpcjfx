import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './admin/ui/Tabs';
import { UserManagement } from './admin/UserManagement';
import { VideoManagement } from './admin/VideoManagement';
import { AdminUserManagement } from '../components/admin/AdminUserManagement';

export function AdminDashboard() {
  return (
    <div className="min-h-screen bg-dark">
      <header className="bg-dark-lighter border-b border-dark-light">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">管理ダッシュボード</h1>
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
    </div>
  );
}