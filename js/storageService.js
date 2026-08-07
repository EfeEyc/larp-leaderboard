import { firebaseService } from './firebaseService.js';
import { convertGoogleDriveUrl } from './gdriveHelper.js';
import { DEFAULT_ADMIN_HASH } from './cryptoHelper.js';

const LOCAL_STORAGE_KEY = 'larp_leaderboard_data_v11';
const VOTED_WEEKS_KEY = 'larp_leaderboard_voted_weeks';
const VOTED_MONTHS_KEY = 'larp_leaderboard_voted_months';

function purgeLegacyCaches() {
  const legacyKeys = [
    'larp_leaderboard_data_v1',
    'larp_leaderboard_data_v2',
    'larp_leaderboard_data_v3',
    'larp_leaderboard_data_v4',
    'larp_leaderboard_data_v5',
    'larp_leaderboard_data_v6',
    'larp_leaderboard_data_v7',
    'larp_leaderboard_data_v8',
    'larp_leaderboard_data_v9',
    'larp_leaderboard_data_v10'
  ];
  legacyKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  });
}

export class StorageService {
  constructor() {
    this.data = null;
    this.listeners = [];
  }

  async init(forceRefresh = false) {
    if (forceRefresh) {
      purgeLegacyCaches();
      this.data = null;
    }

    let defaultData = null;
    try {
      const res = await fetch('data.json?t=' + Date.now());
      if (res.ok) {
        defaultData = await res.json();
      }
    } catch (e) {
      console.warn('Could not load default data.json:', e);
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached && !forceRefresh) {
      try {
        this.data = JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached data:', e);
      }
    }

    if (!this.data || forceRefresh) {
      this.data = defaultData || {
        activeWeek: { id: 'week-1', title: 'Week 1', status: 'active' },
        weeks: [{ id: 'week-1', title: 'Week 1', status: 'active' }],
        entries: [],
        config: { adminPasswordHash: DEFAULT_ADMIN_HASH, firebaseConfig: {}, activeStorage: 'local' }
      };
    }

    if (defaultData && defaultData.config && defaultData.config.firebaseConfig && defaultData.config.firebaseConfig.apiKey) {
      this.data.config = this.data.config || {};
      this.data.config.firebaseConfig = defaultData.config.firebaseConfig;
      if (!this.data.activeWeek && defaultData.activeWeek) {
        this.data.activeWeek = defaultData.activeWeek;
      }
    }

    this.sanitizeImageUrls();
    this.saveToLocalStorage();

    this.setupFirebaseConnection();

    return this.data;
  }

  setupFirebaseConnection() {
    if (this.data && this.data.config && this.data.config.firebaseConfig && this.data.config.firebaseConfig.apiKey) {
      const fbInitSuccess = firebaseService.init(this.data.config.firebaseConfig);
      if (fbInitSuccess) {
        console.log('🔥 Subscribing to Firestore entries live feed...');
        firebaseService.subscribeToEntries((remoteEntries) => {
          if (Array.isArray(remoteEntries)) {
            if (remoteEntries.length > 0) {
              this.data.entries = remoteEntries;
            } else if (this.data.entries && this.data.entries.length > 0) {
              firebaseService.syncAllEntries(this.data.entries);
            }
            this.sanitizeImageUrls();
            this.saveToLocalStorage();
            this.notify();
          }
        });

        console.log('🔥 Subscribing to Firestore appState live feed...');
        firebaseService.subscribeToAppState((remoteState) => {
          if (remoteState && remoteState.activeWeek) {
            this.data.activeWeek = remoteState.activeWeek;
            if (Array.isArray(remoteState.weeks)) {
              this.data.weeks = remoteState.weeks;
            }
            this.saveToLocalStorage();
            this.notify();
          } else if (this.data && this.data.activeWeek) {
            firebaseService.saveAppState({
              activeWeek: this.data.activeWeek,
              weeks: this.data.weeks || []
            });
          }
        });
      }
    }
  }

  async forceSyncReload() {
    return await this.init(true);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => cb(this.data));
  }

  sanitizeImageUrls() {
    if (this.data && this.data.entries) {
      this.data.entries.forEach(entry => {
        if (entry.imageUrl) {
          entry.imageUrl = convertGoogleDriveUrl(entry.imageUrl);
        }
      });
    }
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }

  hasVotedCurrentWeek() {
    const activeWeekId = this.getActiveWeekId();
    try {
      const voted = JSON.parse(localStorage.getItem(VOTED_WEEKS_KEY) || '[]');
      return voted.includes(activeWeekId);
    } catch (e) {
      return false;
    }
  }

  markVotedCurrentWeek() {
    const activeWeekId = this.getActiveWeekId();
    try {
      const voted = JSON.parse(localStorage.getItem(VOTED_WEEKS_KEY) || '[]');
      if (!voted.includes(activeWeekId)) {
        voted.push(activeWeekId);
        localStorage.setItem(VOTED_WEEKS_KEY, JSON.stringify(voted));
      }
    } catch (e) {
      console.error('Error saving voted status:', e);
    }
  }

  getCurrentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  }

  hasVotedCurrentMonth() {
    const monthKey = this.getCurrentMonthKey();
    try {
      const voted = JSON.parse(localStorage.getItem(VOTED_MONTHS_KEY) || '[]');
      return voted.includes(monthKey);
    } catch (e) {
      return false;
    }
  }

  markVotedCurrentMonth() {
    const monthKey = this.getCurrentMonthKey();
    try {
      const voted = JSON.parse(localStorage.getItem(VOTED_MONTHS_KEY) || '[]');
      if (!voted.includes(monthKey)) {
        voted.push(monthKey);
        localStorage.setItem(VOTED_MONTHS_KEY, JSON.stringify(voted));
      }
    } catch (e) {
      console.error('Error saving voted month status:', e);
    }
  }

  getActiveWeekId() {
    return this.data && this.data.activeWeek ? this.data.activeWeek.id : 'week-1';
  }

  getActiveWeek() {
    return this.data ? this.data.activeWeek : { id: 'week-1', title: 'Week 1' };
  }

  getEntries() {
    return this.data ? this.data.entries || [] : [];
  }

  getActiveWeekEntries() {
    const activeId = this.getActiveWeekId();
    const all = this.getEntries();
    const weekEntries = all.filter(e => e.weekId === activeId);
    return weekEntries.length >= 2 ? weekEntries : all;
  }

  getEntryById(id) {
    return this.getEntries().find(e => e.id === id);
  }

  getConfig() {
    return this.data ? this.data.config || {} : {};
  }

  updateConfig(newConfig) {
    this.data.config = { ...this.data.config, ...newConfig };
    this.saveToLocalStorage();

    if (newConfig.firebaseConfig && newConfig.firebaseConfig.apiKey) {
      this.setupFirebaseConnection();
      firebaseService.syncAllEntries(this.getEntries());
    }

    this.notify();
  }

  async addOrUpdateEntry(entry) {
    if (entry.imageUrl) {
      entry.imageUrl = convertGoogleDriveUrl(entry.imageUrl);
    }

    let savedObject = null;

    const existingIndex = this.data.entries.findIndex(e => e.id === entry.id);
    if (existingIndex >= 0) {
      this.data.entries[existingIndex] = { ...this.data.entries[existingIndex], ...entry };
      savedObject = this.data.entries[existingIndex];
    } else {
      const newEntry = {
        id: entry.id || `larp-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        title: entry.title || 'Untitled LARPer',
        imageUrl: entry.imageUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800',
        wins: 0,
        losses: 0,
        totalVotes: 0,
        weekId: entry.weekId || 'pending'
      };
      this.data.entries.push(newEntry);
      savedObject = newEntry;
    }

    this.saveToLocalStorage();
    this.notify();

    if (firebaseService.isConfigured() && savedObject) {
      await firebaseService.saveEntry(savedObject);
    }

    return savedObject;
  }

  async deleteEntry(id) {
    this.data.entries = this.data.entries.filter(e => e.id !== id);
    this.saveToLocalStorage();
    this.notify();

    if (firebaseService.isConfigured()) {
      await firebaseService.deleteEntry(id);
    }
  }

  async advanceToNewWeek(newWeekTitle) {
    const newWeekId = `week-${Date.now()}`;
    const newWeek = {
      id: newWeekId,
      title: newWeekTitle || `Week ${this.data.weeks.length + 1}`,
      status: 'active',
      startDate: new Date().toISOString().split('T')[0]
    };

    if (this.data.activeWeek) {
      this.data.activeWeek.status = 'completed';
    }

    this.data.weeks = this.data.weeks || [];
    this.data.weeks.push(newWeek);
    this.data.activeWeek = newWeek;

    this.data.entries.forEach(e => {
      if (!e.weekId || e.weekId === 'pending') {
        e.weekId = newWeekId;
      }
    });

    this.saveToLocalStorage();
    this.notify();

    if (firebaseService.isConfigured()) {
      await firebaseService.saveAppState({
        activeWeek: this.data.activeWeek,
        weeks: this.data.weeks
      });
      await firebaseService.syncAllEntries(this.data.entries);
    }
  }

  async recordMatchVote(winnerId, loserId) {
    const winner = this.getEntryById(winnerId);
    const loser = this.getEntryById(loserId);

    if (!winner || !loser) return;

    winner.wins = (winner.wins || 0) + 1;
    winner.totalVotes = (winner.totalVotes || 0) + 1;

    loser.losses = (loser.losses || 0) + 1;
    loser.totalVotes = (loser.totalVotes || 0) + 1;

    this.saveToLocalStorage();
    this.notify();

    if (firebaseService.isConfigured()) {
      await firebaseService.updateEntryStats(winner.id, {
        wins: winner.wins, totalVotes: winner.totalVotes
      });
      await firebaseService.updateEntryStats(loser.id, {
        losses: loser.losses, totalVotes: loser.totalVotes
      });
    }

    return { winner, loser };
  }

  exportDataJson() {
    const jsonStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importDataJson(jsonText) {
    try {
      const imported = JSON.parse(jsonText);
      if (imported && Array.isArray(imported.entries)) {
        this.data = imported;
        this.sanitizeImageUrls();
        this.saveToLocalStorage();
        if (firebaseService.isConfigured()) {
          firebaseService.syncAllEntries(this.data.entries);
        }
        this.notify();
        return true;
      }
    } catch (err) {
      console.error('Import JSON error:', err);
    }
    return false;
  }
}

export const storage = new StorageService();
