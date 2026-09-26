import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getAdminDb } from './firebaseAdmin';
import { emailToId, todayStr } from './utils';
import { AppSettings } from './types';

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const db = getAdminDb();
      const id = emailToId(credentials.email);
      const snap = await db.collection('users').doc(id).get();
      if (!snap.exists) return null;
      const data = snap.data()!;
      if (!data.passwordHash) return null; // akun ini daftar via Google
      const valid = await bcrypt.compare(credentials.password, data.passwordHash);
      if (!valid) return null;
      return { id, name: data.name, email: data.email };
    },
  })
);

async function getDefaultDailyLimit(): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection('settings').doc('app').get();
  if (snap.exists) {
    const s = snap.data() as AppSettings;
    return s.defaultDailyLimit ?? Number(process.env.DEFAULT_DAILY_LIMIT || 50);
  }
  return Number(process.env.DEFAULT_DAILY_LIMIT || 50);
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const db = getAdminDb();
      const id = emailToId(user.email);
      const ref = db.collection('users').doc(id);
      const snap = await ref.get();

      if (!snap.exists) {
        const isAdmin =
          !!process.env.ADMIN_EMAIL && id === emailToId(process.env.ADMIN_EMAIL);
        const dailyLimit = await getDefaultDailyLimit();

        await ref.set({
          name: user.name || id.split('@')[0],
          email: user.email,
          provider: account?.provider === 'google' ? 'google' : 'credentials',
          role: isAdmin ? 'admin' : 'user',
          dailyLimit,
          usageToday: 0,
          usageDate: todayStr(),
          createdAt: new Date().toISOString(),
        });
      }
      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const db = getAdminDb();
        const id = emailToId(token.email as string);
        const snap = await db.collection('users').doc(id).get();
        if (snap.exists) {
          token.uid = id;
          token.role = snap.data()!.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role || 'user';
      }
      return session;
    },
  },
};
