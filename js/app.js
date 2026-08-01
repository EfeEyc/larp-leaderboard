import { storage } from './storageService.js';
import { renderHeader } from './components/Header.js';
import { renderLeaderboard } from './components/Leaderboard.js';
import { renderTournamentVote, TournamentVoteManager } from './components/TournamentVote.js';
import { renderAdminPortal } from './components/AdminPortal.js';
import { renderEntryModal } from './components/EntryModal.js';
import { renderGoatLeaderboard, GoatVoteManager } from './components/GoatLeaderboard.js';
import { convertGoogleDriveUrl } from './gdriveHelper.js';
import { hashPassword, DEFAULT_ADMIN_HASH } from './cryptoHelper.js';

const CURRENT_VERSION = 'v3.3.0';

class App {
  constructor() {
    this.activeTab = 'leaderboard';
    this.filterCategory = 'All';
    this.searchQuery = '';
    this.sortBy = 'wins';
    
    this.goatSearchQuery = '';
    this.goatSortBy = 'wins';
    this.goatSubTab = 'rankings';

    this.selectedEntryModal = null;
    this.isAdminAuthenticated = false;
    this.tourneyManager = null;
    this.goatManager = null;
    this.focusedElementId = null;
    this.focusedCursorPos = 0;
  }

  async init() {
    const lastVer = sessionStorage.getItem('larp_app_ver');
    if (lastVer !== CURRENT_VERSION) {
      sessionStorage.setItem('larp_app_ver', CURRENT_VERSION);
      await storage.init(true);
    } else {
      await storage.init();
    }
    
    this.checkInitialRoute();

    this.tourneyManager = new TournamentVoteManager(
      storage,
      () => this.render(),
      (champion) => {
        this.render();
      }
    );

    this.goatManager = new GoatVoteManager(
      storage,
      () => this.render(),
      (champion) => {
        this.render();
      }
    );

    storage.subscribe(() => {
      this.render();
    });

    window.addEventListener('hashchange', () => {
      this.checkInitialRoute();
      this.render();
    });

    this.render();
    this.attachEventListeners();
  }

  checkInitialRoute() {
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();

    if (hash === '#admin' || hash === '#/admin' || search.includes('page=admin')) {
      this.activeTab = 'admin';
    } else if (hash === '#goats') {
      this.activeTab = 'goats';
    } else {
      const hasVoted = storage.hasVotedCurrentWeek();
      if (!hasVoted) {
        this.activeTab = 'tournament';
      } else {
        this.activeTab = 'leaderboard';
      }
    }
  }

  render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    // Track active element before DOM re-render
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.id === 'search-input' || activeEl.id === 'goat-search-input')) {
      this.focusedElementId = activeEl.id;
      this.focusedCursorPos = activeEl.selectionStart || activeEl.value.length;
    }

    const entries = storage.getEntries();
    const activeWeek = storage.getActiveWeek();

    let mainContent = '';

    if (this.activeTab === 'leaderboard') {
      mainContent = renderLeaderboard(entries, this.filterCategory, this.searchQuery, this.sortBy);
    } else if (this.activeTab === 'tournament') {
      mainContent = renderTournamentVote(this.tourneyManager, storage, () => this.setTab('leaderboard'));
    } else if (this.activeTab === 'goats') {
      mainContent = renderGoatLeaderboard(entries, this.goatSearchQuery, this.goatSortBy, this.goatSubTab, this.goatManager, storage);
    } else if (this.activeTab === 'admin') {
      mainContent = renderAdminPortal(storage, this.isAdminAuthenticated);
    }

    const modalContent = this.selectedEntryModal ? renderEntryModal(this.selectedEntryModal) : '';

    appEl.innerHTML = `
      ${renderHeader(this.activeTab, activeWeek.title)}
      <main class="pb-16">
        ${mainContent}
      </main>
      ${modalContent}
    `;

    this.rebindDOMEvents();

    // Restore focus and cursor position after re-render!
    if (this.focusedElementId) {
      const restoredInput = document.getElementById(this.focusedElementId);
      if (restoredInput) {
        restoredInput.focus();
        try {
          restoredInput.setSelectionRange(this.focusedCursorPos, this.focusedCursorPos);
        } catch (e) {}
      }
      this.focusedElementId = null;
    }
  }

  setTab(tab) {
    this.activeTab = tab;
    this.render();
  }

  rebindDOMEvents() {
    document.getElementById('tab-btn-leaderboard')?.addEventListener('click', () => this.setTab('leaderboard'));
    document.getElementById('tab-btn-tournament')?.addEventListener('click', () => this.setTab('tournament'));
    document.getElementById('tab-btn-goats')?.addEventListener('click', () => this.setTab('goats'));
    document.getElementById('nav-logo')?.addEventListener('click', () => this.setTab('leaderboard'));

    document.getElementById('mob-btn-leaderboard')?.addEventListener('click', () => this.setTab('leaderboard'));
    document.getElementById('mob-btn-tournament')?.addEventListener('click', () => this.setTab('tournament'));
    document.getElementById('mob-btn-goats')?.addEventListener('click', () => this.setTab('goats'));

    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      const drawer = document.getElementById('mobile-drawer');
      if (drawer) drawer.classList.toggle('hidden');
    });

    document.getElementById('btn-force-sync-reload')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-force-sync-reload');
      if (btn) btn.innerHTML = '⌛ Syncing...';
      await storage.forceSyncReload();
      this.render();
      alert('✓ Synced data.json & reconnected to Firebase live database!');
    });

    document.getElementById('btn-goto-leaderboard')?.addEventListener('click', () => this.setTab('leaderboard'));
    document.getElementById('btn-goto-leaderboard-from-voted')?.addEventListener('click', () => this.setTab('leaderboard'));

    // GOAT Sub-Tab Switches
    document.getElementById('goat-tab-rankings')?.addEventListener('click', () => {
      this.goatSubTab = 'rankings';
      this.render();
    });

    document.getElementById('goat-tab-battle')?.addEventListener('click', () => {
      this.goatSubTab = 'battle';
      this.render();
    });

    // GOAT Search Input with Focus Preservation
    const goatSearchInput = document.getElementById('goat-search-input');
    if (goatSearchInput) {
      goatSearchInput.addEventListener('input', (e) => {
        this.goatSearchQuery = e.target.value;
        this.focusedElementId = 'goat-search-input';
        this.focusedCursorPos = e.target.selectionStart || e.target.value.length;
        this.render();
      });
    }

    const goatSortSelect = document.getElementById('goat-sort-select');
    if (goatSortSelect) {
      goatSortSelect.addEventListener('change', (e) => {
        this.goatSortBy = e.target.value;
        this.render();
      });
    }

    // GOAT Tournament Battle Cards
    document.getElementById('goat-card-vote-a')?.addEventListener('click', (e) => {
      const winnerId = e.currentTarget.dataset.entryId;
      const loserId = e.currentTarget.dataset.loserId;
      this.goatManager.vote(winnerId, loserId);
      setTimeout(() => {
        this.goatManager.nextMatch();
        this.render();
      }, 1200);
    });

    document.getElementById('goat-card-vote-b')?.addEventListener('click', (e) => {
      const winnerId = e.currentTarget.dataset.entryId;
      const loserId = e.currentTarget.dataset.loserId;
      this.goatManager.vote(winnerId, loserId);
      setTimeout(() => {
        this.goatManager.nextMatch();
        this.render();
      }, 1200);
    });

    // Leaderboard Search Input with Focus Preservation
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.focusedElementId = 'search-input';
        this.focusedCursorPos = e.target.selectionStart || e.target.value.length;
        this.render();
      });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.render();
      });
    }

    document.querySelectorAll('[data-entry-id]').forEach(card => {
      if (card.classList.contains('battle-card') || card.closest('.battle-card')) return;
      card.addEventListener('click', () => {
        const id = card.dataset.entryId;
        this.selectedEntryModal = storage.getEntryById(id);
        this.render();
      });
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
      this.selectedEntryModal = null;
      this.render();
    });
    document.getElementById('entry-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'entry-modal-backdrop') {
        this.selectedEntryModal = null;
        this.render();
      }
    });

    // Weekly Tournament Cards
    document.getElementById('card-vote-a')?.addEventListener('click', (e) => {
      const winnerId = e.currentTarget.dataset.entryId;
      const loserId = e.currentTarget.dataset.loserId;
      this.tourneyManager.vote(winnerId, loserId);
      setTimeout(() => {
        this.tourneyManager.nextMatch();
        this.render();
      }, 1200);
    });

    document.getElementById('card-vote-b')?.addEventListener('click', (e) => {
      const winnerId = e.currentTarget.dataset.entryId;
      const loserId = e.currentTarget.dataset.loserId;
      this.tourneyManager.vote(winnerId, loserId);
      setTimeout(() => {
        this.tourneyManager.nextMatch();
        this.render();
      }, 1200);
    });

    // Admin Auth Form
    document.getElementById('admin-auth-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputPass = document.getElementById('admin-pass-input').value;
      const computedHash = await hashPassword(inputPass);
      const currentConfig = storage.getConfig();
      const actualHash = currentConfig.adminPasswordHash || DEFAULT_ADMIN_HASH;

      if (computedHash === actualHash) {
        this.isAdminAuthenticated = true;
        this.render();
      } else {
        alert('Incorrect admin password!');
      }
    });

    // Activate Weekly Roster Button in Admin
    const handleAdvanceWeek = async () => {
      const weeksCount = (storage.data.weeks || []).length + 1;
      const newTitle = prompt('Enter a title for the new weekly roster:', `Week ${weeksCount}`);
      if (newTitle) {
        await storage.advanceToNewWeek(newTitle);
        alert(`✓ Activated "${newTitle}"! All accumulated LARPers are now live for voting.`);
        this.render();
      }
    };

    document.getElementById('btn-advance-week')?.addEventListener('click', handleAdvanceWeek);
    document.getElementById('btn-activate-accumulated')?.addEventListener('click', handleAdvanceWeek);

    // Image Preview Tester in Admin
    document.getElementById('btn-preview-image')?.addEventListener('click', () => {
      const inputUrl = document.getElementById('entry-image-url').value;
      if (!inputUrl) return;
      const converted = convertGoogleDriveUrl(inputUrl);
      const container = document.getElementById('image-preview-container');
      const img = document.getElementById('image-preview-img');
      const urlText = document.getElementById('image-preview-url');

      if (container && img && urlText) {
        img.src = converted;
        urlText.textContent = converted;
        container.classList.remove('hidden');
      }
    });

    // Add Entry Form
    document.getElementById('form-entry-add')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const title = document.getElementById('entry-title').value;
      const imageUrl = document.getElementById('entry-image-url').value;

      const saved = await storage.addOrUpdateEntry({
        title, imageUrl, weekId: 'pending'
      });

      if (saved) {
        alert(`✓ Uploaded "${title}" to accumulation pool! Click "ACTIVATE NEW WEEKLY ROSTER" when you want to launch the new week.`);
        form.reset();
        document.getElementById('image-preview-container')?.classList.add('hidden');
        this.render();
      }
    });

    // Firebase Config Form
    document.getElementById('form-firebase-config')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const apiKey = document.getElementById('fb-apiKey').value;
      const projectId = document.getElementById('fb-projectId').value;
      const authDomain = document.getElementById('fb-authDomain').value;
      const storageBucket = document.getElementById('fb-storageBucket').value;

      storage.updateConfig({
        firebaseConfig: { apiKey, projectId, authDomain, storageBucket }
      });

      alert('✓ Firebase configuration saved! Connected to live Firestore cloud sync.');
      this.render();
    });

    // Admin Delete Entry
    document.querySelectorAll('.btn-delete-entry').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.entryId;
        if (confirm('Are you sure you want to delete this material?')) {
          await storage.deleteEntry(id);
          this.render();
        }
      });
    });

    // Export data.json
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      storage.exportDataJson();
    });

    // Import data.json
    document.getElementById('input-import-json')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const success = storage.importDataJson(event.target.result);
          if (success) {
            alert('✓ Successfully imported data.json!');
            this.render();
          } else {
            alert('Failed to parse JSON file.');
          }
        };
        reader.readAsText(file);
      }
    });
  }

  attachEventListeners() {
    if (!window.confetti) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js';
      document.head.appendChild(script);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
