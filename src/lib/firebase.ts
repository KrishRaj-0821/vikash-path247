// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCO5xLfpLrwLk23l0ZZtqT_nro3BL8zDjk",
  authDomain: "community-hero247.firebaseapp.com",
  projectId: "community-hero247",
  storageBucket: "community-hero247.firebasestorage.app",
  messagingSenderId: "409123030262",
  appId: "1:409123030262:web:03e5b48fb358f513de58d7",
  measurementId: "G-JC82VR30H6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and Google Auth Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Runs the signInWithPopup flow, handles the promise, logs the user data on success, and catches potential errors.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Successfully signed in with Google:", user);
    return user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
}

/**
 * Runs the signOut flow to clear the session.
 */
export async function logOut() {
  try {
    await signOut(auth);
    console.log("Successfully logged out");
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
}
