import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuration provided by User
const firebaseConfig = {
    apiKey: "AIzaSyAMMk37tmdFOXULC9BJPJmJ3rAyB20AYBg",
    authDomain: "betalphapick.firebaseapp.com",
    projectId: "betalphapick",
    storageBucket: "betalphapick.firebasestorage.app",
    messagingSenderId: "1069329661064",
    appId: "1:1069329661064:web:69246bab3d6497dee4f33d",
    measurementId: "G-N3H568MC2K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, db };
