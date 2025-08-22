// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlIhhiTEWmX4sl0N4pqJi8NbdwCvnbltA",
  authDomain: "vadodara-hackathon-60-portal.firebaseapp.com",
  projectId: "vadodara-hackathon-60-portal",
  storageBucket: "vadodara-hackathon-60-portal.appspot.com",
  messagingSenderId: "493806724265",
  appId: "1:493806724265:web:8556c5865871ec6b7ef5b8"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
