import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { AppSettings } from '@/lib/types';

const DEFAULT_SETTINGS: AppSettings = {
  assistantName: 'Nova AI',
  creatorAnswer: 'Saya dibuat dan dikembangkan secara mandiri oleh tim di balik aplikasi ini.',
  nameAnswer: 'Nama saya Nova AI, asisten AI yang siap membantu kamu.',
  systemPrompt: 'Kamu adalah asisten AI yang ramah, jelas, dan membantu. Jawab dengan bahasa yang sama dengan pengguna.',
  defaultDailyLimit: Number(process.env.DEFAULT_DAILY_LIMIT || 50),
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getAdminDb();
  const ref = db.collection('settings').doc('app');
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set(DEFAULT_SETTINGS);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
  return NextResponse.json(snap.data());
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const db = getAdminDb();
  const ref = db.collection('settings').doc('app');

  const update: Partial<AppSettings> = {
    assistantName: body.assistantName,
    creatorAnswer: body.creatorAnswer,
    nameAnswer: body.nameAnswer,
    systemPrompt: body.systemPrompt,
    defaultDailyLimit:
      typeof body.defaultDailyLimit === 'number' ? body.defaultDailyLimit : undefined,
  };
  Object.keys(update).forEach((k) => update[k as keyof AppSettings] === undefined && delete update[k as keyof AppSettings]);

  await ref.set(update, { merge: true });
  const newSnap = await ref.get();
  return NextResponse.json({ ok: true, settings: newSnap.data() });
}
