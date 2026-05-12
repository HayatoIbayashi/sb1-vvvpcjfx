import { Link, useLocation } from 'react-router-dom';
import { LogIn, LogOut, Search } from 'lucide-react';
import { buildSubscriptionPath, getReturnToFromLocation } from '../../lib/subscriptionNavigation';

interface HeaderProps {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hideMembershipLink?: boolean;
}

export function Header({
  isAuthenticated,
  onLogin,
  onLogout,
  searchQuery,
  onSearchChange,
  hideMembershipLink = false,
}: HeaderProps) {
  const location = useLocation();
  const subscriptionPath = buildSubscriptionPath(getReturnToFromLocation(location));

  return (
    <header className="fixed top-0 z-50 w-full border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <nav className="hidden space-x-6 md:flex">
              <Link to="/" className="text-white hover:text-gray-300">
                ホーム
              </Link>
              {isAuthenticated && (
                <Link to="/library" className="text-gray-300 hover:text-white">
                  購入済み一覧
                </Link>
              )}
            </nav>
            {!hideMembershipLink && (
              <Link
                to={subscriptionPath}
                className="hidden rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary/90 md:block"
              >
                メンバーシップ
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-8">
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="作品を検索..."
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="w-80 rounded-full border border-gray-700 bg-gray-800 px-4 py-2 pl-10 text-white focus:border-gray-500 focus:outline-none md:w-96"
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/account"
                  className="rounded-md px-3 py-1.5 text-gray-300 hover:bg-gray-800/60 hover:text-white"
                >
                  アカウント
                </Link>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-gray-300 hover:bg-gray-800/60 hover:text-white"
                >
                  <LogOut className="h-5 w-5" />
                  <span>ログアウト</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-gray-300 hover:bg-gray-800/60 hover:text-white"
              >
                <LogIn className="h-5 w-5" />
                <span>ログイン</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
