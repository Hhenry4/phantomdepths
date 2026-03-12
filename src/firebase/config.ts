import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBYQx3392f0ILTFL6naOYA2mx9L-FJCv8M",
  authDomain: "phantomdepthsstorage.firebaseapp.com",
  databaseURL: "https://phantomdepthsstorage-default-rtdb.firebaseio.com",
  projectId: "phantomdepthsstorage",
  storageBucket: "phantomdepthsstorage.firebasestorage.app",
  messagingSenderId: "172119538295",
  appId: "1:172119538295:web:4e5a848138c5392b63a472",
  measurementId: "G-MT82XNNE4Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
