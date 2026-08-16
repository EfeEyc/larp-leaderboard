import { storage } from './storageService.js?v=8.2.0';
import { renderHeader } from './components/Header.js?v=8.2.0';
import { renderLeaderboard } from './components/Leaderboard.js?v=8.2.0';
import { renderTournamentVote, TournamentVoteManager } from './components/TournamentVote.js?v=8.2.0';
import { renderAdminPortal } from './components/AdminPortal.js?v=8.2.0';
import { renderEntryModal } from './components/EntryModal.js?v=8.2.0';
import { renderGoatLeaderboard, GoatVoteManager } from './components/GoatLeaderboard.js?v=8.2.0';
import { convertGoogleDriveUrl, parseGoogleDriveFileIds, formatFileNameToTitle } from './gdriveHelper.js?v=8.2.0';
import { compressImageFile } from './imageHelper.js?v=8.2.0';
import { hashPassword, DEFAULT_ADMIN_HASH } from './cryptoHelper.js?v=8.2.0';

const CURRENT_VERSION = 'v8.2.0';

class App {
  constructor() {
    this.activeTab = 'leaderboard';
    this.filterCategory = 'All';
    this.searchQuery = '';
    this.sortBy = 'wins';
    
    this.goatSearchQuery = '';
    this.goatSortBy = 'wins';
    this.goatSubTab = 'rankings';

    this.uploadMode = 'gdrive';
    this.selectedImageFiles = [];
    this.pendingBatchDriveItems = null;

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

    const activeEl = document.activeElement;
    if (activeEl && (activeEl.id === 'search-input' || activeEl.id === 'goat-search-input')) {
      this.focusedElementId = activeEl.id;
      this.focusedCursorPos = activeEl.selectionStart || activeEl.value.length;
    }

    const entries = storage.getEntries();
    const activeWeek = storage.getActiveWeek();
    const activeWeekId = activeWeek ? activeWeek.id : 'week-1';

    let mainContent = '';

    if (this.activeTab === 'leaderboard') {
      const weeklyActiveEntries = entries.filter(e => e.weekId === activeWeekId);
      mainContent = renderLeaderboard(weeklyActiveEntries, this.filterCategory, this.searchQuery, this.sortBy);
    } else if (this.activeTab === 'tournament') {
      mainContent = renderTournamentVote(this.tourneyManager, storage, () => this.setTab('leaderboard'));
    } else if (this.activeTab === 'goats') {
      const activatedEntries = entries.filter(e => e.weekId && e.weekId !== 'pending');
      mainContent = renderGoatLeaderboard(activatedEntries, this.goatSearchQuery, this.goatSortBy, this.goatSubTab, this.goatManager, storage);
    } else if (this.activeTab === 'admin') {
      mainContent = renderAdminPortal(storage, this.isAdminAuthenticated, this.pendingBatchDriveItems);
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

    // GOAT Search Input
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

    // Leaderboard Search Input
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
      if (
        card.tagName === 'SELECT' || 
        card.tagName === 'BUTTON' || 
        card.tagName === 'INPUT' || 
        card.classList.contains('battle-card') || 
        card.closest('.battle-card') ||
        card.classList.contains('select-entry-week') ||
        card.classList.contains('btn-delete-entry')
      ) return;

      card.addEventListener('click', (e) => {
        if (e.target.closest('select') || e.target.closest('button') || e.target.closest('input')) return;
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

    // Upload Mode Switcher
    const setUploadMode = (mode) => {
      this.uploadMode = mode;
      document.getElementById('section-upload-gdrive')?.classList.toggle('hidden', mode !== 'gdrive');
      document.getElementById('section-upload-file')?.classList.toggle('hidden', mode !== 'file');
      document.getElementById('section-upload-url')?.classList.toggle('hidden', mode !== 'url');

      const btnGdrive = document.getElementById('upload-tab-gdrive');
      const btnFile = document.getElementById('upload-tab-file');
      const btnUrl = document.getElementById('upload-tab-url');

      if (btnGdrive && btnFile && btnUrl) {
        btnGdrive.className = mode === 'gdrive' 
          ? 'px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-amber-500 text-slate-950 shadow-md flex items-center space-x-2'
          : 'px-5 py-2.5 rounded-xl font-mono text-xs text-gray-400 hover:text-white bg-slate-900 border border-white/10 flex items-center space-x-2';

        btnFile.className = mode === 'file' 
          ? 'px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-amber-500 text-slate-950 shadow-md flex items-center space-x-2'
          : 'px-5 py-2.5 rounded-xl font-mono text-xs text-gray-400 hover:text-white bg-slate-900 border border-white/10 flex items-center space-x-2';

        btnUrl.className = mode === 'url' 
          ? 'px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-amber-500 text-slate-950 shadow-md flex items-center space-x-2'
          : 'px-5 py-2.5 rounded-xl font-mono text-xs text-gray-400 hover:text-white bg-slate-900 border border-white/10 flex items-center space-x-2';
      }
    };

    document.getElementById('upload-tab-gdrive')?.addEventListener('click', () => setUploadMode('gdrive'));
    document.getElementById('upload-tab-file')?.addEventListener('click', () => setUploadMode('file'));
    document.getElementById('upload-tab-url')?.addEventListener('click', () => setUploadMode('url'));

    // Instant Batch Naming Window opener (0ms network calls!)
    const openBatchNamingModalForDriveText = (text) => {
      if (!text) return;
      
      const ids = parseGoogleDriveFileIds(text);
      if (ids.length === 0) {
        alert('Could not detect photo file IDs.\n\nTo import multiple photos at once:\n1. Open your folder in Google Drive\n2. Select photos -> Right-click -> Copy links\n3. Paste the links here!');
        return;
      }

      const items = ids.map((id, idx) => ({
        id,
        imageUrl: `https://lh3.googleusercontent.com/d/${id}=s1600`,
        title: `LARPer #${idx + 1}`
      }));

      this.pendingBatchDriveItems = items;
      this.render();
    };

    // Google Drive Quick Prompt Button
    document.getElementById('btn-open-gdrive-picker')?.addEventListener('click', () => {
      const linksPasted = prompt('☁️ Paste your Google Drive photo share link(s) below:\n\nExample: https://drive.google.com/file/d/1ABC...');
      if (linksPasted) {
        openBatchNamingModalForDriveText(linksPasted);
      }
    });

    // Batch Google Drive Link Import Button
    document.getElementById('btn-import-batch-gdrive')?.addEventListener('click', () => {
      const text = document.getElementById('input-batch-gdrive-links')?.value || '';
      if (!text) {
        alert('Please paste one or more Google Drive photo share links!');
        return;
      }
      openBatchNamingModalForDriveText(text);
    });

    // Batch Naming Window Modal Handlers
    document.querySelectorAll('.batch-name-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.batchIdx, 10);
        if (this.pendingBatchDriveItems && this.pendingBatchDriveItems[idx]) {
          this.pendingBatchDriveItems[idx].title = e.target.value;
        }
      });
    });

    document.getElementById('btn-confirm-batch-import')?.addEventListener('click', async () => {
      if (!this.pendingBatchDriveItems || this.pendingBatchDriveItems.length === 0) return;

      const itemsToSave = [...this.pendingBatchDriveItems];
      const confirmBtn = document.getElementById('btn-confirm-batch-import');
      if (confirmBtn) confirmBtn.innerHTML = '⌛ Saving to Roster Pool...';

      let count = 0;
      const targetWeek = document.getElementById('upload-target-week')?.value || 'pending';
      for (const item of itemsToSave) {
        await storage.addOrUpdateEntry({
          title: item.title.trim() || 'Untitled LARPer',
          imageUrl: item.imageUrl,
          weekId: targetWeek
        });
        count++;
      }

      alert(`✓ Successfully saved ${count} custom-named LARPers to your selected week roster!`);
      this.pendingBatchDriveItems = null;
      if (document.getElementById('input-batch-gdrive-links')) {
        document.getElementById('input-batch-gdrive-links').value = '';
      }
      this.render();
    });

    document.getElementById('btn-cancel-batch')?.addEventListener('click', () => {
      this.pendingBatchDriveItems = null;
      this.render();
    });
    document.getElementById('btn-close-batch-modal')?.addEventListener('click', () => {
      this.pendingBatchDriveItems = null;
      this.render();
    });

    // File Input Preview Handler
    const fileInput = document.getElementById('entry-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        this.selectedImageFiles = files;

        const container = document.getElementById('file-previews-container');
        if (container) {
          container.innerHTML = '';
          container.classList.remove('hidden');

          for (const file of files) {
            try {
              const dataUrl = await compressImageFile(file);
              const previewCard = document.createElement('div');
              previewCard.className = 'p-2 bg-slate-900 rounded-xl border border-white/10 text-center space-y-1';
              previewCard.innerHTML = `
                <img src="${dataUrl}" class="w-full h-24 object-cover rounded-lg border border-white/10" />
                <p class="text-[10px] font-mono text-amber-300 truncate">${formatFileNameToTitle(file.name)}</p>
              `;
              container.appendChild(previewCard);
            } catch (err) {
              console.error('Error compressing file preview:', err);
            }
          }
        }
      });
    }

    // Direct File Upload Submit Handler
    document.getElementById('btn-submit-file-upload')?.addEventListener('click', async () => {
      const fileInput = document.getElementById('entry-file-input');
      const titleInput = document.getElementById('entry-title-file')?.value.trim() || '';
      const files = fileInput ? Array.from(fileInput.files) : [];
      const targetWeek = document.getElementById('upload-target-week')?.value || 'pending';

      if (files.length === 0) {
        alert('Please select at least one photo file!');
        return;
      }

      let countSaved = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const autoTitle = formatFileNameToTitle(file.name);
        const itemTitle = files.length === 1 && titleInput ? titleInput : autoTitle;

        try {
          const compressedDataUrl = await compressImageFile(file);
          await storage.addOrUpdateEntry({
            title: itemTitle,
            imageUrl: compressedDataUrl,
            weekId: targetWeek
          });
          countSaved++;
        } catch (err) {
          console.error('Failed to save photo:', err);
        }
      }

      alert(`✓ Uploaded ${countSaved} photo(s) to selected roster! Names auto-set from filenames.`);
      fileInput.value = '';
      if (document.getElementById('entry-title-file')) document.getElementById('entry-title-file').value = '';
      document.getElementById('file-previews-container')?.classList.add('hidden');
      this.render();
    });

    // Single URL Form Submit Handler
    document.getElementById('form-entry-add-url')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('entry-title-url').value.trim();
      const imageUrl = document.getElementById('entry-image-url').value.trim();
      const targetWeek = document.getElementById('upload-target-week')?.value || 'pending';

      if (!imageUrl) return;

      const saved = await storage.addOrUpdateEntry({
        title: titleInput || 'Untitled LARPer',
        imageUrl: convertGoogleDriveUrl(imageUrl),
        weekId: targetWeek
      });

      if (saved) {
        alert(`✓ Uploaded "${titleInput || 'LARPer'}" to selected roster!`);
        document.getElementById('form-entry-add-url').reset();
        document.getElementById('image-preview-container')?.classList.add('hidden');
        this.render();
      }
    });

    // Change Entry Assigned Week Dropdown Handler in Table
    document.querySelectorAll('.select-entry-week').forEach(select => {
      select.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      select.addEventListener('change', async (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.weekEntryId || e.currentTarget.dataset.entryId;
        const targetWeek = e.currentTarget.value;
        await storage.setEntryWeek(id, targetWeek);
        this.render();
      });
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

    // Image Preview Tester for URL mode
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
