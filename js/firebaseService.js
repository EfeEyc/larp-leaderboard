// Import Firebase Web SDK v10 modules via ESM CDN
import { initializeApp, getApps, deleteApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

let app = null;
let db = null;
let storage = null;
let unsubscribeEntries = null;

export const firebaseService = {
  isConfigured() {
    return db !== null;
  },

  init(config) {
    if (!config || !config.apiKey || !config.projectId) {
      console.log('Firebase config missing or incomplete.');
      db = null;
      storage = null;
      return false;
    }

    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        // Clear existing
        app = existingApps[0];
      } else {
        app = initializeApp(config);
      }
      db = getFirestore(app);
      try {
        storage = getStorage(app);
      } catch (err) {
        console.warn('Firebase Storage disabled or not configured:', err);
      }
      console.log('Firebase initialized successfully!');
      return true;
    } catch (err) {
      console.error('Failed to initialize Firebase:', err);
      db = null;
      return false;
    }
  },

  subscribeToEntries(callback) {
    if (!db) return null;
    try {
      const entriesRef = collection(db, 'entries');
      if (unsubscribeEntries) unsubscribeEntries();

      unsubscribeEntries = onSnapshot(entriesRef, (snapshot) => {
        const entries = [];
        snapshot.forEach((docSnap) => {
          entries.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(entries);
      }, (error) => {
        console.error('Firebase snapshot error:', error);
      });
      return unsubscribeEntries;
    } catch (e) {
      console.error('Error subscribing to Firebase entries:', e);
      return null;
    }
  },

  async syncAllEntries(entries) {
    if (!db) return;
    try {
      for (const entry of entries) {
        const entryRef = doc(db, 'entries', entry.id);
        await setDoc(entryRef, entry, { merge: true });
      }
      console.log('Synced all entries to Firebase!');
    } catch (err) {
      console.error('Failed to sync entries to Firebase:', err);
    }
  },

  async saveEntry(entry) {
    if (!db) return false;
    try {
      const entryRef = doc(db, 'entries', entry.id);
      await setDoc(entryRef, entry, { merge: true });
      return true;
    } catch (err) {
      console.error('Failed to save entry in Firebase:', err);
      return false;
    }
  },

  async updateEntryStats(entryId, statsUpdate) {
    if (!db) return false;
    try {
      const entryRef = doc(db, 'entries', entryId);
      await updateDoc(entryRef, statsUpdate);
      return true;
    } catch (err) {
      console.error('Failed to update stats in Firebase:', err);
      return false;
    }
  },

  async deleteEntry(entryId) {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'entries', entryId));
      return true;
    } catch (err) {
      console.error('Failed to delete entry in Firebase:', err);
      return false;
    }
  },

  async uploadImage(file, pathStr) {
    if (!storage) throw new Error('Firebase Storage is not initialized');
    const storageRef = ref(storage, pathStr || `larp-images/${Date.now()}_${file.name}`);
    const uploadTask = await uploadBytesResumable(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadTask.ref);
    return downloadUrl;
  }
};
