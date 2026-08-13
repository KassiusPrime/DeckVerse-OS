// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Auth Provider Abstraction (Phase 4A)
// Standardized Auth layer supporting Local and Firebase Auth with Admin Role verification.
// No hardcoded emails or passwords. Uses users/{uid} document for role verification.
// ════════════════════════════════════════════════════════════════════════════

import { db as localDb } from "../../deckverseClient.js";
import { getStorageMode, isFirebaseConfigured, getFirebaseAuth, getFirestoreDb } from "./firebaseClient.js";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

class AuthProvider {
  constructor() {
    this.currentUser = null;
    this.authListeners = new Set();

    if (getStorageMode() === "firebase" && isFirebaseConfigured()) {
      try {
        const auth = getFirebaseAuth();
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            const adminStatus = await this.checkAdminRoleInFirestore(user.uid);
            this.currentUser = {
              uid: user.uid,
              id: user.uid,
              email: user.email,
              name: user.displayName || user.email?.split("@")[0] || "User",
              photoURL: user.photoURL,
              role: adminStatus ? "admin" : "user",
              isAdmin: adminStatus
            };
          } else {
            this.currentUser = null;
          }
          this.notifyListeners();
        });
      } catch (err) {
        console.warn("[AuthProvider] Firebase auth listener setup skipped:", err.message);
      }
    }
  }

  notifyListeners() {
    this.authListeners.forEach(listener => listener(this.currentUser));
  }

  onAuthChange(callback) {
    this.authListeners.add(callback);
    return () => this.authListeners.delete(callback);
  }

  async checkAdminRoleInFirestore(uid) {
    if (!uid) return false;
    try {
      const firestore = getFirestoreDb();
      const userRef = doc(firestore, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        return data.role === "admin" && data.status === "active";
      }
    } catch (err) {
      console.warn("[AuthProvider] Error checking admin role in Firestore:", err);
    }
    return false;
  }

  async getCurrentUser() {
    const mode = getStorageMode();
    if (mode === "local") {
      const localMe = await localDb.auth.me();
      return {
        uid: localMe.id,
        id: localMe.id,
        name: localMe.name,
        email: localMe.email,
        role: localMe.role || "admin",
        isAdmin: (localMe.role || "admin") === "admin"
      };
    }

    if (this.currentUser) return this.currentUser;

    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (user) {
        const adminStatus = await this.checkAdminRoleInFirestore(user.uid);
        this.currentUser = {
          uid: user.uid,
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split("@")[0] || "User",
          photoURL: user.photoURL,
          role: adminStatus ? "admin" : "user",
          isAdmin: adminStatus
        };
        return this.currentUser;
      }
    }

    return null;
  }

  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return Boolean(user);
  }

  async isAdmin() {
    const user = await this.getCurrentUser();
    return Boolean(user && (user.role === "admin" || user.isAdmin === true));
  }

  async signIn(email, password) {
    const mode = getStorageMode();
    if (mode === "local") {
      const user = await this.getCurrentUser();
      return { success: true, user };
    }

    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não está configurado. Verifique as variáveis de ambiente.");
    }

    const auth = getFirebaseAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const adminStatus = await this.checkAdminRoleInFirestore(cred.user.uid);
    this.currentUser = {
      uid: cred.user.uid,
      id: cred.user.uid,
      email: cred.user.email,
      name: cred.user.displayName || cred.user.email?.split("@")[0] || "User",
      role: adminStatus ? "admin" : "user",
      isAdmin: adminStatus
    };
    return { success: true, user: this.currentUser };
  }

  async signInWithGoogle() {
    const mode = getStorageMode();
    if (mode === "local") {
      const user = await this.getCurrentUser();
      return { success: true, user };
    }

    if (!isFirebaseConfigured()) {
      throw new Error("Firebase não está configurado.");
    }

    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const adminStatus = await this.checkAdminRoleInFirestore(cred.user.uid);

    this.currentUser = {
      uid: cred.user.uid,
      id: cred.user.uid,
      email: cred.user.email,
      name: cred.user.displayName || cred.user.email?.split("@")[0] || "User",
      role: adminStatus ? "admin" : "user",
      isAdmin: adminStatus
    };

    return { success: true, user: this.currentUser };
  }

  async signOut() {
    const mode = getStorageMode();
    if (mode === "local") {
      this.currentUser = null;
      return { success: true };
    }

    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
      this.currentUser = null;
    }
    return { success: true };
  }

  async setAdminRole(uid, status = "active") {
    if (getStorageMode() === "local") {
      return { success: true, uid, role: "admin" };
    }
    const firestore = getFirestoreDb();
    const userRef = doc(firestore, "users", uid);
    await setDoc(userRef, { role: "admin", status, updatedAt: new Date().toISOString() }, { merge: true });
    return { success: true, uid, role: "admin" };
  }
}

export const authProvider = new AuthProvider();
export default authProvider;
