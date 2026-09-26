'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Msg[];
}

function newConversation(): Conversation {
  return { id: crypto.randomUUID(), title: 'Percakapan baru', messages: [] };
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([newConversation()]);
  const [activeId, setActiveId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (conversations.length && !activeId) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const active = conversations.find((c) => c.id === activeId) || conversations[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages.length, loading]);

  function updateActive(messages: Msg[], title?: string) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === active.id ? { ...c, messages, title: title ?? c.title } : c
      )
    );
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    setError('');
    const userMsg: Msg = { role: 'user', content: input.trim() };
    const newMessages = [...active.messages, userMsg];
    const title =
      active.messages.length === 0 ? input.trim().slice(0, 30) : undefined;
    updateActive(newMessages, title);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan.');
      } else {
        updateActive([...newMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch (e) {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-900 text-gray-400">
        Memuat...
      </div>
    );
  }

  const isAdmin = (session.user as any)?.role === 'admin';

  return (
    <div className="flex h-screen bg-base-900 text-gray-100">
      {/* Sidebar */}
      <div className="w-64 shrink-0 bg-base-800 border-r border-base-700 flex flex-col">
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 rounded-lg border border-base-600 px-3 py-2 text-sm hover:bg-base-700 transition"
          >
            + Percakapan baru
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left truncate rounded-lg px-3 py-2 text-sm transition ${
                c.id === active?.id ? 'bg-base-700 text-white' : 'text-gray-400 hover:bg-base-700/60'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-base-700 space-y-1">
          {isAdmin && (
            <Link
              href="/admin"
              className="block w-full text-center rounded-lg border border-base-600 px-3 py-2 text-sm hover:bg-base-700 transition"
            >
              ⚙️ Panel Admin
            </Link>
          )}
          <div className="flex items-center justify-between px-1 pt-2">
            <span className="text-xs text-gray-400 truncate">{session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs text-red-400 hover:underline"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {active?.messages.length === 0 && (
              <div className="text-center mt-24">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-fuchsia-500 text-3xl font-bold mb-4">
                  N
                </div>
                <h2 className="text-xl font-semibold">Ada yang bisa dibantu?</h2>
                <p className="text-gray-400 text-sm mt-1">Ketik pertanyaanmu di bawah untuk mulai mengobrol.</p>
              </div>
            )}

            {active?.messages.map((m, i) => (
              <div key={i} className={`flex mb-5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 prose-chat ${
                    m.role === 'user'
                      ? 'bg-accent-600 text-white rounded-br-sm'
                      : 'bg-base-700 text-gray-100 rounded-bl-sm'
                  }`}
                >
                  <p>{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start mb-5">
                <div className="bg-base-700 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                  <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}

            {error && (
              <div className="text-center text-sm text-red-400 mb-4">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-base-700 p-4">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Tulis pesan..."
              className="flex-1 resize-none rounded-xl bg-base-700 border border-base-600 px-4 py-3 text-sm outline-none focus:border-accent-500 max-h-40"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-gradient-to-r from-accent-600 to-fuchsia-600 px-5 py-3 text-sm font-medium disabled:opacity-40"
            >
              Kirim
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            Nova AI bisa saja membuat kesalahan. Periksa kembali informasi penting.
          </p>
        </div>
      </div>
    </div>
  );
}
