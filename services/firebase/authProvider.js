// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Firebase Auth Provider
// Per-user Firebase sessions + a single owner identity for critical tools.
// ════════════════════════════════════════════════════════════════════════════

import { db as localDb } from "../../deckverseClient.js";
import { isFirebaseConfigured, getFirebaseAuth, getFirestoreDb } from "./firebaseClient.js";
import { persistenceProvider } from "../persistence/persistenceProvider.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const DECKVERSE_OWNER_EMAIL = "cassianokaique9@gmail.com";
const DRIVE_READ_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const executionMode = () => persistenceProvider.getStorageMode();

class AuthProvider {
  constructor() {
    this.currentUser = null;
    this.googleAccessToken = null;
    this.authListeners = new Set();
    this.unsubscribeFirebase = null;
    this.initializeListener();
  }

  initializeListener() {
    if (executionMode() !== "firebase" || !isFirebaseConfigured() || this.unsubscribeFirebase) return;
    try {
      const auth = getFirebaseAuth();
      this.unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
        this.currentUser = firebaseUser ? await this.buildUser(firebaseUser, { ensureProfile: true }) : null;
        this.notifyListeners();
      });
    } catch (error) {
      console.warn("[AuthProvider] Firebase auth listener setup skipped:", error?.message || error);
    }
  }

  notifyListeners() {
    this.authListeners.forEach((listener) => listener(this.currentUser));
  }

  onAuthChange(callback) {
    this.authListeners.add(callback);
    callback(this.currentUser);
    return () => this.authListeners.delete(callback);
  }

  isOwnerEmail(email) {
    return normalizeEmail(email) === DECKVERSE_OWNER_EMAIL;
  }

  async readUserProfile(uid) {
    if (!uid || !isFirebaseConfigured()) return null;
    try {
      const snap = await getDoc(doc(getFirestoreDb(), "users", uid));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
      console.warn("[AuthProvider] User profile read failed:", error?.message || error);
      return null;
    }
  }

  async ensureUserProfile(firebaseUser, preferredName = "") {
    if (!firebaseUser?.uid || !isFirebaseConfigured()) return null;
    const existing = await this.readUserProfile(firebaseUser.uid);
    const owner = this.isOwnerEmail(firebaseUser.email);
    const timestamp = new Date().toISOString();
    const payload = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: preferredName || firebaseUser.displayName || existing?.name || firebaseUser.email?.split("@")[0] || "Usuário",
      photoURL: firebaseUser.photoURL || existing?.photoURL || null,
      role: owner ? "owner" : (existing?.role === "admin" ? "admin" : "user"),
      status: existing?.status || "active",
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };
    try {
      await setDoc(doc(getFirestoreDb(), "users", firebaseUser.uid), payload, { merge: true });
      return payload;
    } catch (error) {
      console.warn("[AuthProvider] User profile sync failed:", error?.message || error);
      return existing || payload;
    }
  }

  async buildUser(firebaseUser, { ensureProfile = false, preferredName = "" } = {}) {
    if (!firebaseUser) return null;
    const profile = ensureProfile
      ? await this.ensureUserProfile(firebaseUser, preferredName)
      : await this.readUserProfile(firebaseUser.uid);
    const owner = this.isOwnerEmail(firebaseUser.email);
    const role = owner ? "owner" : (profile?.role === "admin" ? "admin" : "user");
    const status = profile?.status || "active";
    return {
      uid: firebaseUser.uid,
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: preferredName || firebaseUser.displayName || profile?.name || firebaseUser.email?.split("@")[0] || "Usuário",
      photoURL: firebaseUser.photoURL || profile?.photoURL || null,
      role,
      status,
      isAdmin: role === "admin" || role === "owner",
      isOwner: owner,
    };
  }

  async getCurrentUser() {
    const mode = executionMode();
    if (mode === "local") {
      // Explicit local mode is a developer/test tool only. Production defaults
      // to Firebase whenever the project is configured.
      const localMe = await localDb.auth.me();
      return { ...localMe, uid: localMe.id, isOwner: false, isAdmin: true, role: "admin", status: "active" };
    }
    this.initializeListener();
    if (this.currentUser) return this.currentUser;
    if (!isFirebaseConfigured()) return null;
    const firebaseUser = getFirebaseAuth().currentUser;
    if (!firebaseUser) return null;
    this.currentUser = await this.buildUser(firebaseUser, { ensureProfile: true });
    return this.currentUser;
  }

  async isAuthenticated() {
    return Boolean(await this.getCurrentUser());
  }

  async isAdmin() {
    const user = await this.getCurrentUser();
    return Boolean(user?.isAdmin && user?.status === "active");
  }

  async isOwner() {
    const user = await this.getCurrentUser();
    return Boolean(user?.isOwner && user?.status === "active");
  }

  async signIn(email, password) {
    if (executionMode() !== "firebase") throw new Error("Login real requer modo Firebase.");
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    this.currentUser = await this.buildUser(credential.user, { ensureProfile: true });
    this.notifyListeners();
    return { success: true, user: this.currentUser };
  }

  async signUp(name, email, password) {
    if (executionMode() !== "firebase") throw new Error("Cadastro real requer modo Firebase.");
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    if (name?.trim()) await updateProfile(credential.user, { displayName: name.trim() });
    this.currentUser = await this.buildUser(credential.user, { ensureProfile: true, preferredName: name?.trim() || "" });
    this.notifyListeners();
    return { success: true, user: this.currentUser };
  }

  async signInWithGoogle({ requestDriveAccess = false } = {}) {
    if (executionMode() !== "firebase") throw new Error("Login Google requer modo Firebase.");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: requestDriveAccess ? "consent" : "select_account" });
    if (requestDriveAccess) provider.addScope(DRIVE_READ_SCOPE);
    const credential = await signInWithPopup(getFirebaseAuth(), provider);
    const oauthCredential = GoogleAuthProvider.credentialFromResult(credential);
    if (requestDriveAccess && oauthCredential?.accessToken) this.googleAccessToken = oauthCredential.accessToken;
    this.currentUser = await this.buildUser(credential.user, { ensureProfile: true });
    this.notifyListeners();
    return { success: true, user: this.currentUser, hasDriveAccess: Boolean(this.googleAccessToken) };
  }

  getGoogleAccessToken() {
    return this.googleAccessToken;
  }

  async signOut() {
    this.googleAccessToken = null;
    if (executionMode() === "firebase" && isFirebaseConfigured()) await firebaseSignOut(getFirebaseAuth());
    this.currentUser = null;
    this.notifyListeners();
    return { success: true };
  }
}

export const authProvider = new AuthProvider();
export default authProvider;
