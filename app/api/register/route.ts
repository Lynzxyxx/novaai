import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { emailToId, todayStr } from '@/lib/utils';
import { AppSettings } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nama, email, dan password wajib diisi.' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const id = emailToId(email);
    const ref = db.collection('users').doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar. Silakan login.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isAdmin =
      !!process.env.ADMIN_EMAIL && id === emailToId(process.env.ADMIN_EMAIL);

    const settingsSnap = await db.collection('settings').doc('app').get();
    const dailyLimit = settingsSnap.exists
      ? ((settingsSnap.data() as AppSettings).defaultDailyLimit ??
        Number(process.env.DEFAULT_DAILY_LIMIT || 50))
      : Number(process.env.DEFAULT_DAILY_LIMIT || 50);

    await ref.set({
      name,
      email,
      passwordHash,
      provider: 'credentials',
      role: isAdmin ? 'admin' : 'user',
      dailyLimit,
      usageToday: 0,
      usageDate: todayStr(),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
