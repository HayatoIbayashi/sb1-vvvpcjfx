import { Link, useNavigate } from 'react-router-dom';
import { Search, LogOut, LogIn } from 'lucide-react';

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
  hideMembershipLink = false
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 w-full bg-gray-900/95 backdrop-blur-sm z-50 border-b border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Left side */}
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-white">
              <img 
                src="../src/assets/WiiBER_logo.png" 
                alt="WiiBER" 
                className="h-8 cursor-pointer"
                onClick={() => navigate('/')}
              />
            </h1>
            <nav className="hidden md:flex space-x-6">
              <Link to="/" className="text-white hover:text-gray-300">
                ホーム
              </Link>
            </nav>
            {!hideMembershipLink && (
              <Link
                to="/subscription"
                className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition hidden md:block"
              >
                メンバーシップ
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-6">
            {/* Search */}
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="作品を検索..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 px-4 py-1 pl-10 bg-gray-800 text-white rounded-full border border-gray-700 focus:outline-none focus:border-gray-500"
              />
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>

            {/* Auth Button */}
            {isAuthenticated ? (
              <button
                onClick={onLogout}
                className="text-gray-400 hover:text-white flex items-center"
              >
                <LogOut className="h-5 w-5" />
                <span>ログアウト</span>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="text-gray-400 hover:text-white flex items-center gap-2"
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
