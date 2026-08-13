// ════════════════════════════════════════════════════════════════════════════
// DECKVERSE OS — Firebase Client Infrastructure (Phase 4A)
// Isolated client configuration for Firebase Auth, Firestore, and Storage.
// Safe initialization prevents crashes when running in local storage mode.
// ════════════════════════════════════════════════════════════════════════════

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Automatically retrieved from official Firebase provisioning tooling
import appletConfig from "../../firebase-applet-config.json" with { type: "json" };

export function getEnvVar(key) {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key] !== undefined) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  return undefined;
}

export function getStorageMode() {
  const mode = getEnvVar("VITE_DECKVERSE_STORAGE_MODE");
  if (mode && mode.toLowerCase() === "firebase") {
    return "firebase";
  }
  return "local";
}

export function getFirebaseConfig() {
  // 1. Automatic detection from firebase-applet-config.json
  if (appletConfig && appletConfig.projectId && appletConfig.apiKey) {
    return {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
      firestoreDatabaseId: appletConfig.firestoreDatabaseId || undefined
    };
  }

  // 2. Fallback to env vars if provided
  return {
    apiKey: getEnvVar("VITE_FIREBASE_API_KEY") || "",
    authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN") || "",
    projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID") || "",
    storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET") || "",
    messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID") || "",
    appId: getEnvVar("VITE_FIREBASE_APP_ID") || "",
    firestoreDatabaseId: getEnvVar("VITE_FIREBASE_DATABASE_ID") || undefined
  };
}

export function isFirebaseConfigured() {
  const cfg = getFirebaseConfig();
  return Boolean(
    cfg.apiKey &&
    cfg.projectId &&
    cfg.apiKey !== "placeholder" &&
    cfg.projectId !== "placeholder"
  );
}

let appInstance = null;
let dbInstance = null;
let authInstance = null;
let storageInstance = null;

export function getFirebaseApp() {
  if (appInstance) return appInstance;
  if (!isFirebaseConfigured()) {
    throw new Error("[FirebaseClient] Configuração do Firebase incompleta ou ausente nas variáveis de ambiente.");
  }
  const config = getFirebaseConfig();
  if (getApps().length === 0) {
    appInstance = initializeApp(config);
  } else {
    appInstance = getApp();
  }
  return appInstance;
}

export function getFirestoreDb() {
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  const config = getFirebaseConfig();
  if (config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)") {
    dbInstance = getFirestore(app, config.firestoreDatabaseId);
  } else {
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

export function getFirebaseAuth() {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  authInstance = getAuth(app);
  return authInstance;
}

export function getFirebaseStorage() {
  if (storageInstance) return storageInstance;
  const app = getFirebaseApp();
  storageInstance = getStorage(app);
  return storageInstance;
}
