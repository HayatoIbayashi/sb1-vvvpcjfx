import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserManagement } from './UserManagement';

const sampleUser = {
  id: 'user-1',
  email: 'user@example.com',
  gender: 'male',
  age: 29,
  prefecture: '東京都',
  is_member: true,
  status: 'active' as const,
  registered_at: '2024-03-01T10:00:00.000Z',
  updated_at: '2024-03-15T15:30:00.000Z',
};

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    getAdminUsers: vi.fn(),
    updateAdminUser: vi.fn(),
    deleteAdminUser: vi.fn(),
  },
}));

vi.mock('../../lib/useApiClient', () => ({
  default: () => mockApi,
}));

describe('UserManagement', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK_USERS', 'false');
    mockApi.getAdminUsers.mockReset();
    mockApi.updateAdminUser.mockReset();
    mockApi.deleteAdminUser.mockReset();
    mockApi.getAdminUsers.mockResolvedValue({ items: [sampleUser] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('updates a user via admin user api', async () => {
    mockApi.updateAdminUser.mockResolvedValue({
      ...sampleUser,
      email: 'updated@example.com',
      gender: 'female',
      age: 35,
      prefecture: '大阪府',
      status: 'suspended',
      updated_at: '2024-04-01T09:00:00.000Z',
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(mockApi.getAdminUsers).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'user@example.com を編集' }));
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'updated@example.com' },
    });
    fireEvent.change(screen.getByLabelText('性別'), { target: { value: 'female' } });
    fireEvent.change(screen.getByLabelText('年齢'), { target: { value: '35' } });
    fireEvent.change(screen.getByLabelText('都道府県'), { target: { value: '大阪府' } });
    fireEvent.change(screen.getByLabelText('ステータス'), { target: { value: 'suspended' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(mockApi.updateAdminUser).toHaveBeenCalledWith('user-1', {
        email: 'updated@example.com',
        gender: 'female',
        age: 35,
        prefecture: '大阪府',
        status: 'suspended',
      });
    });

    expect(await screen.findByText('updated@example.com')).toBeInTheDocument();
  });

  it('deletes a user via admin user api', async () => {
    mockApi.deleteAdminUser.mockResolvedValue({ ok: true, deleted: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<UserManagement />);

    await waitFor(() => {
      expect(mockApi.getAdminUsers).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'user@example.com を削除' }));

    await waitFor(() => {
      expect(mockApi.deleteAdminUser).toHaveBeenCalledWith('user-1');
    });

    await waitFor(() => {
      expect(screen.queryByText('user@example.com')).not.toBeInTheDocument();
    });
  });
});
