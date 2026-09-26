'use client';

import { useState, useEffect } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);

  useEffect(() => {
    getProviders().then((p) => setHasGoogle(!!p?.google));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Gagal mendaftar.');
      setLoading(false);
      return;
    }

    const signInRes = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.push('/login');
    } else {
      router.push('/chat');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-base-900 via-base-800 to-[#1a1230]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-fuchsia-500 text-2xl font-bold mb-3 shadow-lg shadow-accent-600/30">
            N
          </div>
          <h1 className="text-2xl font-semibold text-white">Buat akun baru</h1>
          <p className="text-gray-400 text-sm mt-1">Mulai mengobrol dengan Nova AI dalam hitungan detik</p>
        </div>

        <div className="bg-base-800/80 backdrop-blur border border-base-600 rounded-2xl p-6 shadow-xl">
          {hasGoogle && (
            <>
              <button
                onClick={() => signIn('google', { callbackUrl: '/chat' })}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-base-600 bg-white text-gray-800 font-medium py-2.5 hover:bg-gray-100 transition"
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16 3 9 7.6 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.6 2.3-7.2 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9 40.3 16 45 24 45z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 36 44 30.7 44 24c0-1.4-.1-2.4-.4-3.5z"/>
                </svg>
                Daftar dengan Google
              </button>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-base-600 flex-1" />
                <span className="text-xs text-gray-500">atau daftar dengan email</span>
                <div className="h-px bg-base-600 flex-1" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Nama</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-base-700 border border-base-600 px-4 py-2.5 text-white outline-none focus:border-accent-500"
                placeholder="Nama kamu"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-base-700 border border-base-600 px-4 py-2.5 text-white outline-none focus:border-accent-500"
                placeholder="kamu@email.com"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-base-700 border border-base-600 px-4 py-2.5 text-white outline-none focus:border-accent-500"
                placeholder="Minimal 6 karakter"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-accent-600 to-fuchsia-600 py-2.5 font-medium text-white hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Daftar'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-5">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-accent-500 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
