import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// User provided Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCn-r_16gTN7Vi91tMuwOQrxuhrXF7PR1E",
    authDomain: "badminton-tactics-shot-14e3a.firebaseapp.com",
    projectId: "badminton-tactics-shot-14e3a",
    storageBucket: "badminton-tactics-shot-14e3a.firebasestorage.app",
    messagingSenderId: "853318004151",
    appId: "1:853318004151:web:e737ddbc8c164dfcd24c32",
    measurementId: "G-SZBWCTKFSQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/youtube.upload');
