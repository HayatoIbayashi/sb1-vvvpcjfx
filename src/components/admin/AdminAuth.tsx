import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { ADMIN_AUTH_STORAGE_KEY, getAdminRole } from '../../lib/authStorage';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider
      storageKey={ADMIN_AUTH_STORAGE_KEY}
      loginPath="/admin/login"
      logoutRedirectPath="/admin/login"
    >
      {children}
    </AuthProvider>
  );
}

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  const adminRole = getAdminRole(auth.user?.profile);

  useEffect(() => {
    if (auth.isAuthenticated && !adminRole) {
      void auth.removeUser();
    }
  }, [adminRole, auth]);

  if (auth.isLoading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (!adminRole) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ flashMessage: '管理者権限がありません。', from: location }}
      />
    );
  }

  return <>{children}</>;
}
