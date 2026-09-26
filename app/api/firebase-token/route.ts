import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminAuth } from '@/lib/firebaseAdmin';

/**
 * Membuat Firebase custom token untuk user yang sedang login lewat NextAuth,
 * supaya browser bisa login ke Firebase Auth dan memakai fitur realtime
 * Firestore (onSnapshot) dengan aman. Role user disisipkan sebagai custom
 * claim di token ini, dipakai oleh Firestore security rules.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 });
  }

  try {
    const uid = (session.user as any).id as string;
    const role = (session.user as any).role as string;
    const token = await getAdminAuth().createCustomToken(uid, { role });
    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Gagal membuat token realtime.' },
      { status: 500 }
    );
  }
}
