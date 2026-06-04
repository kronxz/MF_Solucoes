import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* PROD - original (commented) */
const firebaseConfigProd = {
  apiKey: "AIzaSyD8OBOl1hUfsrWWT0-L19uuI-F273IvBgU",
  authDomain: "mf-solucoes-crm.firebaseapp.com",
  projectId: "mf-solucoes-crm",
  storageBucket: "mf-solucoes-crm.firebasestorage.app",
  messagingSenderId: "492242482187",
  appId: "1:492242482187:web:34c99a57f3b99c2260030e"
};

// Singleton pattern
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfigProd);
    console.log('FIREBASE APP (PROD):', app);
} else {
    app = getApp();
}

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
let analytics = null;

try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics not initialized", e);
}

// ─── WAIT FOR AUTH ────────────────────────────────────────────
function waitForAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export { app, db, storage, auth, analytics, waitForAuth, collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where, limit };
