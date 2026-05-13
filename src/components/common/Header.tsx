import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, Search } from 'lucide-react';

interface HeaderProps {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit?: () => void;
  genreOptions: string[];
}

export function Header({
  isAuthenticated,
  onLogin,
  onLogout,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  genreOptions,
}: HeaderProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit?.();
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <nav className="hidden space-x-6 md:flex">
              <Link to="/" className="text-white hover:text-gray-300">
                ホーム
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-8">
            <form className="relative hidden md:block" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="作品を検索..."
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="w-80 rounded-full border border-gray-700 bg-gray-800 px-4 py-2 pl-10 text-white focus:border-gray-500 focus:outline-none md:w-96"
              />
              <button
                type="submit"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                aria-label="検索"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="group relative hidden md:block">
                  <span className="cursor-default rounded-md px-3 py-1.5 text-gray-300 transition hover:bg-gray-800/60 hover:text-white">
                    ジャンル
                  </span>
                  <div className="invisible absolute left-0 top-full z-50 w-56 rounded-xl border border-gray-800 bg-gray-900/95 p-2 opacity-0 shadow-2xl transition duration-150 group-hover:visible group-hover:opacity-100">
                    {genreOptions.length > 0 ? (
                      genreOptions.map((genre) => (
                        <Link
                          key={genre}
                          to={`/genres/${encodeURIComponent(genre)}`}
                          className="block rounded-lg px-3 py-2 text-sm text-gray-200 transition hover:bg-gray-800 hover:text-white"
                        >
                          {genre}
                        </Link>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">ジャンル未設定</div>
                    )}
                  </div>
                </div>
                <Link
                  to="/library"
                  className="rounded-md px-3 py-1.5 text-gray-300 hover:bg-gray-800/60 hover:text-white"
                >
                  マイライブラリ
                </Link>
                <Link
                  to="/account"
                  className="rounded-md px-3 py-1.5 text-gray-300 hover:bg-gray-800/60 hover:text-white"
                >
                  アカウント設定
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
