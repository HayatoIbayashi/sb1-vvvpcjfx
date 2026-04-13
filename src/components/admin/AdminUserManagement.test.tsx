import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUserManagement } from './AdminUserManagement';

const sampleAdmin = {
  id: 'admin-1',
  email: 'admin@example.com',
  name: '運営管理者',
  role: 'admin' as const,
  enabled: true,
  status: 'CONFIRMED',
  created_at: '2024-03-01T10:00:00.000Z',
  updated_at: '2024-03-15T15:30:00.000Z',
};

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    getAdminAccounts: vi.fn(),
    createAdminAccount: vi.fn(),
    updateAdminAccount: vi.fn(),
    deleteAdminAccount: vi.fn(),
  },
}));

vi.mock('../../lib/useApiClient', () => ({
  default: () => mockApi,
}));

describe('AdminUserManagement', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_ADMIN_USERS', 'false');
    mockApi.getAdminAccounts.mockReset();
    mockApi.createAdminAccount.mockReset();
    mockApi.updateAdminAccount.mockReset();
    mockApi.deleteAdminAccount.mockReset();
    mockApi.getAdminAccounts.mockResolvedValue({ items: [sampleAdmin] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('creates an admin account via admin account api', async () => {
    mockApi.createAdminAccount.mockResolvedValue({
      ...sampleAdmin,
      id: 'admin-2',
      email: 'owner@example.com',
      name: 'システム管理者',
      role: 'super_admin',
    });

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(mockApi.getAdminAccounts).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: '新規管理者を追加' }));
    fireEvent.change(screen.getByLabelText('新規管理者名'), {
      target: { value: 'システム管理者' },
    });
    fireEvent.change(screen.getByLabelText('新規管理者メールアドレス'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('新規管理者パスワード'), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByLabelText('新規管理者権限'), {
      target: { value: 'super_admin' },
    });
    fireEvent.click(screen.getByRole('button', { name: '作成' }));

    await waitFor(() => {
      expect(mockApi.createAdminAccount).toHaveBeenCalledWith({
        email: 'owner@example.com',
        name: 'システム管理者',
        password: 'Password123!',
        role: 'super_admin',
      });
    });

    expect(await screen.findByText('owner@example.com')).toBeInTheDocument();
  });

  it('updates and deletes an admin account via admin account api', async () => {
    mockApi.updateAdminAccount.mockResolvedValue({
      ...sampleAdmin,
      email: 'updated@example.com',
      name: '統括管理者',
      role: 'super_admin',
      updated_at: '2024-04-01T09:00:00.000Z',
    });
    mockApi.deleteAdminAccount.mockResolvedValue({ ok: true, deleted: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(mockApi.getAdminAccounts).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'admin@example.com を編集' }));
    fireEvent.change(screen.getByLabelText('管理者名'), {
      target: { value: '統括管理者' },
    });
    fireEvent.change(screen.getByLabelText('管理者メールアドレス'), {
      target: { value: 'updated@example.com' },
    });
    fireEvent.change(screen.getByLabelText('管理者権限'), {
      target: { value: 'super_admin' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(mockApi.updateAdminAccount).toHaveBeenCalledWith('admin-1', {
        email: 'updated@example.com',
        name: '統括管理者',
        role: 'super_admin',
      });
    });

    fireEvent.click(await screen.findByRole('button', { name: 'updated@example.com を削除' }));

    await waitFor(() => {
      expect(mockApi.deleteAdminAccount).toHaveBeenCalledWith('admin-1');
    });
  });
});
