import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

// Konfigurasi resmi proyek Firebase kafilasuci4
export const firebaseConfig = {
  apiKey: 'AIzaSyD5iCMLt6XFMI2Wb-JB97a7_DY8tbfLJW4',
  authDomain: 'kafilasuci4.firebaseapp.com',
  projectId: 'kafilasuci4',
  storageBucket: 'kafilasuci4.firebasestorage.app',
  messagingSenderId: '125487710715',
  appId: '1:125487710715:web:337d5032dba2029eb1cb5e',
};

// Initialize Firebase (Singleton app instance)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with Persistent IndexedDB Local Cache
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required by skill (dengan session guard agar tidak boros read saat reload)
export async function testConnection(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem('fb_conn_ok')) {
      return true;
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection verified');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fb_conn_ok', '1');
    }
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, check connection.');
      return false;
    }
    // Document not existing is normal and means online connection works
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fb_conn_ok', '1');
    }
    return true;
  }
}

// Trigger initial test
testConnection();
