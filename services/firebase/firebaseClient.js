// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Firebase Client Infrastructure
// Cloud-first Firebase Auth, named Firestore and Storage configuration.
// ════════════════════════════════════════════════════════════════════════════

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import appletConfig from "../../firebase-applet-config.json" with { type: "json" };

export function getEnvVar(key) {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key] !== undefined) return import.meta.env[key];
  if (typeof process !== "undefined" && process.env && process.env[key] !== undefined) return process.env[key];
  return undefined;
}

export function getFirebaseConfig() {
  if (appletConfig && appletConfig.projectId && appletConfig.apiKey) {
    return {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
      firestoreDatabaseId: appletConfig.firestoreDatabaseId || undefined,
    };
  }

  return {
    apiKey: getEnvVar("VITE_FIREBASE_API_KEY") || "",
    authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN") || "",
    projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID") || "",
    storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET") || "",
    messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID") || "",
    appId: getEnvVar("VITE_FIREBASE_APP_ID") || "",
    firestoreDatabaseId: getEnvVar("VITE_FIREBASE_DATABASE_ID") || undefined,
  };
}

export function isFirebaseConfigured() {
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.apiKey !== "placeholder" && cfg.projectId !== "placeholder");
}

export function getStorageMode() {
  const mode = String(getEnvVar("VITE_DECKVERSE_STORAGE_MODE") || "").trim().toLowerCase();
  if (mode === "local") return "local";
  if (mode === "firebase") return "firebase";
  // A configured production build must not silently fall back to the demo/local admin.
  return isFirebaseConfigured() ? "firebase" : "local";
}

let appInstance = null;
let dbInstance = null;
let authInstance = null;
let storageInstance = null;

export function getFirebaseApp() {
  if (appInstance) return appInstance;
  if (!isFirebaseConfigured()) throw new Error("[FirebaseClient] Configuração do Firebase incompleta.");
  const config = getFirebaseConfig();
  appInstance = getApps().length === 0 ? initializeApp(config) : getApp();
  return appInstance;
}

export function getFirestoreDb() {
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  const config = getFirebaseConfig();
  dbInstance = config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)"
    ? getFirestore(app, config.firestoreDatabaseId)
    : getFirestore(app);
  return dbInstance;
}

export function getFirebaseAuth() {
  if (authInstance) return authInstance;
  authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

export function getFirebaseStorage() {
  if (storageInstance) return storageInstance;
  storageInstance = getStorage(getFirebaseApp());
  return storageInstance;
}
