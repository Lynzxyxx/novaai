import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

/**
 * Admin SDK dipakai di server (API routes) untuk baca/tulis Firestore dan
 * membuat custom token (dipakai client untuk login ke Firebase supaya bisa
 * pakai fitur realtime / onSnapshot).
 *
 * Butuh Service Account dari Firebase Console:
 * Project settings -> Service accounts -> Generate new private key
 */
function initAdmin() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin belum dikonfigurasi. Isi FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, dan FIREBASE_PRIVATE_KEY di Environment Variables.'
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

let _db: Firestore | null = null;
let _auth: Auth | null = null;

export function getAdminDb(): Firestore {
  if (!_db) _db = getFirestore(initAdmin());
  return _db;
}

export function getAdminAuth(): Auth {
  if (!_auth) _auth = getAuth(initAdmin());
  return _auth;
}
