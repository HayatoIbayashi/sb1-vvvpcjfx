import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';


function PasswordResetPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage('パスワードリセットのメールを送信しました。');
        } catch (error) {
        setError('パスワードリセットに失敗しました。');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
            <h1 className="text-2xl font-bold text-white mb-6">パスワードリセット</h1>
            {message && <p className="text-green-500 mb-4">{message}</p>}
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handlePasswordReset}>
            <div className="mb-6">
                <label className="block text-gray-300 mb-2" htmlFor="email">
                メールアドレス
                </label>
                <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded"
                required
                />
            </div>
            <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
            >
                リセットメールを送信
            </button>
            </form>
            <div className="mt-4 text-center">
            <Link to="/login" className="text-blue-400 hover:text-blue-300">
                ログインページへ戻る
            </Link>
            </div>
        </div>
        </div>
    );
    }

export default PasswordResetPage;