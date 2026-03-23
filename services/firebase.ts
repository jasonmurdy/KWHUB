
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDceesZatzsTxoo9xomrqm7QETDkyECfp0",
  authDomain: "projectflow-c5584.firebaseapp.com",
  projectId: "projectflow-c5584",
  storageBucket: "projectflow-c5584.firebasestorage.app",
  messagingSenderId: "274671963147",
  appId: "1:274671963147:web:ccc07292e84b1f69044b0e",
  measurementId: "G-JD91Y9PZ2E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Firebase Storage
const storage = getStorage(app);

// Initialize Cloud Functions
const functions = getFunctions(app);

// Export the Google Auth Provider for use in the AuthContext
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}


export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo = {
    error: errorMessage,
    operationType,
    path,
    authInfo: 'Auth info omitted to prevent circular structure'
  };
  
  let errString = '';
  try {
    errString = JSON.stringify(errInfo);
  } catch {
    errString = JSON.stringify({ error: errorMessage, operationType, path, authInfo: 'Complex Object' });
  }
  console.error('Firestore Error: ', errString);
  throw new Error(errString);
}

export { db, auth, storage, functions, googleProvider, app };
