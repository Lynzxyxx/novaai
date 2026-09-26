import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebaseAdmin';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getAdminDb();
  const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
  const users = snap.docs.map((d) => {
    const { passwordHash, ...rest } = d.data() as any;
    return { id: d.id, ...rest };
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, dailyLimit, role } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });

  const db = getAdminDb();
  const ref = db.collection('users').doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

  const update: Record<string, any> = {};
  if (typeof dailyLimit === 'number') update.dailyLimit = dailyLimit;
  if (role === 'admin' || role === 'user') update.role = role;

  await ref.update(update);
  return NextResponse.json({ ok: true });
}
