'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithCustomToken } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { clientAuth, clientDb } from '@/lib/firebaseClient';

interface SettingsForm {
  assistantName: string;
  creatorAnswer: string;
  nameAnswer: string;
  systemPrompt: string;
  defaultDailyLimit: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  dailyLimit: number;
  usageToday: number;
  provider: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [settings, setSettings] = useState<SettingsForm | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const unsubRef = useRef<() => void>();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Muat pengaturan (sekali saja, form ini yang admin edit langsung)
  useEffect(() => {
    if (status !== 'authenticated') return;
    if ((session?.user as any)?.role !== 'admin') {
      setForbidden(true);
      setLoadingData(false);
      return;
    }
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((s) => {
        setSettings(s);
        setLoadingData(false);
      });
  }, [status, session]);

  // Login ke Firebase (pakai custom token) lalu langganan realtime ke koleksi "users"
  useEffect(() => {
    if (status !== 'authenticated') return;
    if ((session?.user as any)?.role !== 'admin') return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/firebase-token');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal ambil token realtime');
        if (cancelled) return;

        await signInWithCustomToken(clientAuth, data.token);

        const q = query(collection(clientDb, 'users'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(
          q,
          (snap) => {
            const list: UserRow[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            setUsers(list);
            setRealtimeStatus('live');
          },
          () => setRealtimeStatus('error')
        );
        unsubRef.current = unsub;
      } catch {
        setRealtimeStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      unsubRef.current?.();
    };
  }, [status, session]);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function updateUser(userId: string, patch: { dailyLimit?: number; role?: 'admin' | 'user' }) {
    // Tidak perlu setState manual di sini -> tabel akan update sendiri lewat onSnapshot realtime
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...patch }),
    });
  }

  if (status !== 'authenticated' || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-900 text-gray-400">
        Memuat...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-900 text-gray-300 gap-4">
        <p>Kamu tidak punya akses ke halaman ini.</p>
        <Link href="/chat" className="text-accent-500 hover:underline">
          Kembali ke chat
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-900 text-gray-100">
      <div className="border-b border-base-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">⚙️ Panel Admin</h1>
        <Link href="/chat" className="text-sm text-accent-500 hover:underline">
          ← Kembali ke chat
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {/* Pengaturan identitas AI */}
        <section className="bg-base-800 border border-base-600 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-medium">Identitas & Jawaban AI</h2>
          <p className="text-sm text-gray-400">
            Atur nama AI dan jawaban yang dipakai saat pengguna bertanya siapa pembuatnya atau siapa namanya.
          </p>

          {settings && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Nama AI</label>
                <input
                  value={settings.assistantName}
                  onChange={(e) => setSettings({ ...settings, assistantName: e.target.value })}
                  className="w-full rounded-xl bg-base-700 border border-base-600 px-4 py-2.5 text-sm outline-none focus:border-accent-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Jawaban jika ditanya "siapa namamu?"
                </label>
                <textarea
                  value={settings.nameAnswer}
                  onChange={(e) => setSettings({ ...settings, nameAnswer: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl bg-base-700 border border-base-600 px-4 py-2.5 text-sm outline-none focus:border-accent-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Jawaban jika ditanya "siapa yang membuatmu?"
                </label>
                <textarea
                  value={settings.creatorAnswer}
                  onChange={(e) => setSettings({ ...settings, creatorAnswer: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl bg-base-700 border border-base-600 px-4 py-2.5 text-sm outline-none focus:border-accent-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Instruksi tambahan untuk AI (system prompt)
                </label>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl bg-base-700 border border-base-600 px-4 py-2.5 text-sm outline-none focus:border-accent-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">
                  Batas pesan harian default untuk user baru
                </label>
                <input
                  type="number"
                  value={settings.defaultDailyLimit}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultDailyLimit: Number(e.target.value) })
                  }
                  className="w-full rounded-xl bg-base-700 border border-base-600 px-4 py-2.5 text-sm outline-none focus:border-accent-500"
                />
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-accent-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : saved ? 'Tersimpan ✓' : 'Simpan Pengaturan'}
              </button>
            </div>
          )}
        </section>

        {/* Daftar user - realtime dari Firestore */}
        <section className="bg-base-800 border border-base-600 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-medium">Pengguna ({users.length})</h2>
            <span className="flex items-center gap-1.5 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  realtimeStatus === 'live'
                    ? 'bg-green-500 animate-pulse'
                    : realtimeStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                }`}
              />
              <span className="text-gray-400">
                {realtimeStatus === 'live'
                  ? 'Realtime aktif'
                  : realtimeStatus === 'error'
                  ? 'Realtime gagal terhubung'
                  : 'Menghubungkan...'}
              </span>
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Data di tabel ini otomatis ter-update seketika (Firestore realtime) saat ada
            pengguna baru daftar atau memakai chat, tanpa perlu refresh halaman.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-base-600">
                  <th className="py-2 pr-4">Nama</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Pakai hari ini</th>
                  <th className="py-2 pr-4">Batas harian</th>
                  <th className="py-2 pr-4">Peran</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-base-700/60">
                    <td className="py-2 pr-4">{u.name}</td>
                    <td className="py-2 pr-4 text-gray-400">{u.email}</td>
                    <td className="py-2 pr-4">{u.usageToday}</td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        defaultValue={u.dailyLimit}
                        onBlur={(e) => updateUser(u.id, { dailyLimit: Number(e.target.value) })}
                        className="w-20 rounded-lg bg-base-700 border border-base-600 px-2 py-1 outline-none focus:border-accent-500"
                        title="-1 = tak terbatas"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={u.role}
                        onChange={(e) => updateUser(u.id, { role: e.target.value as 'admin' | 'user' })}
                        className="rounded-lg bg-base-700 border border-base-600 px-2 py-1 outline-none focus:border-accent-500"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      Belum ada pengguna.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
