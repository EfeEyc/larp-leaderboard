import { convertGoogleDriveUrl } from '../gdriveHelper.js';
import { firebaseService } from '../firebaseService.js';

export function renderAdminPortal(storage, isAuthenticated, pendingBatchDriveItems = null) {
  const config = storage.getConfig();
  const entries = storage.getEntries();
  const activeWeek = storage.getActiveWeek();
  const activeWeekId = activeWeek.id || 'week-1';

  const activeEntries = entries.filter(e => e.weekId === activeWeekId);
  const pendingEntries = entries.filter(e => !e.weekId || e.weekId === 'pending' || e.weekId !== activeWeekId);

  if (!isAuthenticated) {
    return `
      <div class="max-w-md mx-auto px-4 py-16">
        <div class="glass-panel p-8 rounded-3xl border border-amber-500/30 text-center space-y-6">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl">
            👑
          </div>
          <div>
            <h2 class="font-cinzel text-2xl font-bold text-white">ADMIN PORTAL LOGIN</h2>
            <p class="text-xs text-slate-400 mt-1">Enter your admin key to unlock dashboard.</p>
          </div>
          <form id="admin-auth-form" class="space-y-4">
            <input 
              type="password" 
              id="admin-pass-input" 
              placeholder="Enter Admin Password" 
              class="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white text-center placeholder-gray-500 focus:outline-none focus:border-amber-500"
              required
            />
            <button type="submit" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 font-black font-cinzel text-sm shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform">
              🔓 UNLOCK ADMIN DASHBOARD
            </button>
          </form>
        </div>
      </div>
    `;
  }

  const fbConfig = config.firebaseConfig || {};

  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      <!-- Admin Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-amber-500/30">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xl">👑</span>
            <h2 class="font-cinzel text-2xl font-bold text-gradient-gold">ADMINISTRATION DASHBOARD</h2>
          </div>
          <p class="text-xs text-slate-400 mt-1">Google Drive Picker, photo uploads, weekly roster activation, Firebase settings.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button id="btn-export-json" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-amber-500/30 rounded-xl text-xs font-mono text-amber-300 flex items-center space-x-2">
            <span>📥 Export data.json for GitHub Pages</span>
          </button>
          <label class="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-mono text-gray-300 cursor-pointer flex items-center space-x-2">
            <span>📤 Import data.json</span>
            <input type="file" id="input-import-json" accept=".json" class="hidden" />
          </label>
        </div>
      </div>

      <!-- Weekly Activation Control Panel -->
      <div class="glass-panel p-8 rounded-3xl space-y-6 border-2 border-amber-500/50 shadow-2xl">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span class="text-xs font-mono text-amber-400 block uppercase">CURRENT WEEK STATUS</span>
            <h3 class="font-cinzel text-2xl font-bold text-white">${activeWeek.title || 'Current Week'} (${activeEntries.length} Active LARPers)</h3>
          </div>

          <div class="flex items-center space-x-3">
            <button id="btn-activate-accumulated" class="px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black font-cinzel text-sm rounded-xl shadow-xl shadow-amber-500/30 hover:scale-105 transition-transform">
              🚀 ACTIVATE NEW WEEKLY ROSTER (${pendingEntries.length} Pending)
            </button>
          </div>
        </div>
        
        <p class="text-xs text-slate-300 leading-relaxed">
          <strong>How Weekly Rotations Work:</strong> Upload LARPers as they come in during the week. They will accumulate in your database. When you are ready for a new week, click <strong>🚀 ACTIVATE NEW WEEKLY ROSTER</strong> to start the new week's 1v1 battle voting!
        </p>
      </div>

      <!-- Upload Section with Google Drive Picker & Direct Photo Upload -->
      <div class="glass-panel p-8 rounded-3xl space-y-6">
        <h3 class="font-cinzel text-xl font-bold text-amber-300 border-b border-white/10 pb-3 flex items-center space-x-2">
          <span>📸</span><span>UPLOAD NEW LARPERS</span>
        </h3>

        <!-- Mode Selector: Google Drive Picker vs Direct Photo Upload vs URL -->
        <div class="flex flex-wrap gap-2 border-b border-white/10 pb-4">
          <button type="button" id="upload-tab-gdrive" class="px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-amber-500 text-slate-950 shadow-md flex items-center space-x-2">
            <span>☁️ Choose from Google Drive</span>
          </button>
          <button type="button" id="upload-tab-file" class="px-5 py-2.5 rounded-xl font-mono text-xs text-gray-400 hover:text-white bg-slate-900 border border-white/10 flex items-center space-x-2">
            <span>📁 Direct Photo Upload</span>
          </button>
          <button type="button" id="upload-tab-url" class="px-5 py-2.5 rounded-xl font-mono text-xs text-gray-400 hover:text-white bg-slate-900 border border-white/10 flex items-center space-x-2">
            <span>🔗 Paste Link / URLs</span>
          </button>
        </div>

        <!-- Section 1: Google Drive Mode -->
        <div id="section-upload-gdrive" class="space-y-4">
          <div class="p-6 bg-slate-950/80 rounded-2xl border border-amber-500/30 text-center space-y-4">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
              ☁️
            </div>
            <div>
              <h4 class="font-cinzel text-lg font-bold text-white">Import Photos from Google Drive</h4>
              <p class="text-xs text-slate-400 font-mono mt-1">
                Paste your Google Drive share links or folder link below to open the interactive naming window!
              </p>
            </div>

            <button type="button" id="btn-open-gdrive-picker" class="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 font-black font-cinzel text-sm rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform inline-flex items-center space-x-2">
              <span>☁️ PASTE DRIVE LINKS & SET NAMES</span>
            </button>
          </div>

          <!-- Batch Drive Link Paste Form -->
          <div class="p-4 bg-slate-950/60 rounded-2xl border border-white/10 space-y-3">
            <label class="text-xs font-mono text-amber-300 font-bold block">Paste Google Drive Share Link(s) or Folder Link:</label>
            <textarea 
              id="input-batch-gdrive-links" 
              rows="3" 
              placeholder="Paste one or more Google Drive links (e.g. https://drive.google.com/file/d/1A2b3C.../view)..." 
              class="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono"
            ></textarea>
            <button type="button" id="btn-import-batch-gdrive" class="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-cinzel text-xs font-black rounded-xl shadow-md">
              ✨ OPEN PHOTO NAMING WINDOW FOR IMPORTS
            </button>
          </div>
        </div>

        <!-- Section 2: Direct File Upload Dropzone Mode -->
        <div id="section-upload-file" class="hidden space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-mono text-slate-300">LARPer / Material Name (Optional)</label>
            <input 
              type="text" 
              id="entry-title-file" 
              placeholder="Leave empty to auto-use filename (e.g. Sir Cedric)" 
              class="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500" 
            />
          </div>

          <div 
            id="dropzone-area" 
            class="border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-slate-950/60 hover:bg-slate-900/80 rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 relative group"
          >
            <input type="file" id="entry-file-input" accept="image/*" multiple class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            
            <div class="space-y-3 pointer-events-none">
              <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                📁
              </div>
              <div>
                <p class="font-cinzel text-base font-bold text-white">Click to Select Photos or Drag & Drop Here</p>
                <p class="text-xs text-slate-400 font-mono mt-1">Supports PNG, JPG, JPEG, WEBP (Multiple selection supported!)</p>
              </div>
            </div>
          </div>

          <div id="file-previews-container" class="hidden grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3"></div>

          <button type="button" id="btn-submit-file-upload" class="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black font-cinzel text-base shadow-xl shadow-amber-500/20 hover:scale-[1.01] transition-transform">
            💾 UPLOAD SELECTED PHOTOS TO ROSTER POOL
          </button>
        </div>

        <!-- Section 3: Web URL Mode -->
        <div id="section-upload-url" class="hidden space-y-4">
          <form id="form-entry-add-url" class="space-y-4">
            <div class="space-y-1">
              <label class="text-xs font-mono text-slate-300">LARPer Name *</label>
              <input type="text" id="entry-title-url" placeholder="e.g. Sir Cedric of Oakhaven" class="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500" required />
            </div>

            <div class="space-y-2">
              <label class="text-xs font-mono text-slate-300">Google Drive Share Link or Web Direct Image URL *</label>
              <div class="flex gap-3">
                <input type="text" id="entry-image-url" placeholder="Paste link e.g. https://drive.google.com/file/d/.../view" class="flex-1 bg-slate-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500" required />
                <button type="button" id="btn-preview-image" class="px-5 py-3 bg-slate-800 border border-white/10 text-amber-300 text-xs font-mono rounded-xl hover:bg-slate-700">
                  Test Preview
                </button>
              </div>
              <div id="image-preview-container" class="hidden mt-3 p-3 bg-slate-950/80 rounded-2xl border border-white/10 flex items-center space-x-4">
                <img id="image-preview-img" src="" alt="Preview" class="w-20 h-20 object-cover rounded-xl border border-white/10" />
                <div class="text-xs font-mono space-y-1">
                  <p class="text-emerald-400 font-bold">✓ Direct Embed URL Generated:</p>
                  <p id="image-preview-url" class="text-slate-400 break-all text-[10px]"></p>
                </div>
              </div>
            </div>

            <button type="submit" class="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black font-cinzel text-base shadow-xl shadow-amber-500/20">
              💾 UPLOAD LARPER TO ROSTER POOL
            </button>
          </form>
        </div>

      </div>

      <!-- Manage Materials Table -->
      <div class="glass-panel p-8 rounded-3xl space-y-6">
        <h3 class="font-cinzel text-xl font-bold text-amber-300 border-b border-white/10 pb-3 flex items-center space-x-2">
          <span>📋</span><span>ALL UPLOADED LARPERS (${entries.length})</span>
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs font-mono">
            <thead>
              <tr class="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                <th class="py-3 px-4">LARPer</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">All-Time Record (W / L)</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              ${entries.map(e => {
                const isCurrent = e.weekId === activeWeekId;
                return `
                  <tr class="hover:bg-slate-900/50">
                    <td class="py-3 px-4 flex items-center space-x-3">
                      <img src="${e.imageUrl}" alt="${e.title}" class="w-12 h-12 object-cover rounded-lg border border-white/10" />
                      <div class="font-bold text-white font-cinzel text-sm">${e.title}</div>
                    </td>
                    <td class="py-3 px-4">
                      ${isCurrent ? `
                        <span class="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-[11px] font-bold">
                          ✓ Active Week Roster
                        </span>
                      ` : `
                        <span class="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-[11px] font-bold">
                          ⏳ Pending New Week
                        </span>
                      `}
                    </td>
                    <td class="py-3 px-4 text-emerald-400 font-bold">${e.wins || 0}W / ${e.losses || 0}L</td>
                    <td class="py-3 px-4 text-right">
                      <button class="btn-delete-entry px-3 py-1 bg-red-950 hover:bg-red-900 border border-red-500/40 text-red-300 rounded-lg" data-entry-id="${e.id}">
                        Delete
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Firebase Credentials Settings Panel -->
      <div class="glass-panel p-8 rounded-3xl space-y-6 border border-emerald-500/30">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 class="font-cinzel text-xl font-bold text-emerald-400 flex items-center space-x-2">
            <span>🔥</span><span>FREE FIREBASE CLOUD CONFIGURATION</span>
          </h3>
          <span class="text-xs font-mono text-slate-400">${firebaseService.isConfigured() ? '✅ Connected to Firestore' : '⚠️ Local Storage Mode'}</span>
        </div>

        <form id="form-firebase-config" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-[11px] font-mono text-slate-300">API Key (apiKey)</label>
            <input type="text" id="fb-apiKey" value="${fbConfig.apiKey || ''}" placeholder="AIzaSy..." class="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500" />
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-mono text-slate-300">Project ID (projectId)</label>
            <input type="text" id="fb-projectId" value="${fbConfig.projectId || ''}" placeholder="larp-leaderboard-123" class="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500" />
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-mono text-slate-300">Auth Domain (authDomain)</label>
            <input type="text" id="fb-authDomain" value="${fbConfig.authDomain || ''}" placeholder="larp-leaderboard.firebaseapp.com" class="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500" />
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-mono text-slate-300">Storage Bucket (storageBucket)</label>
            <input type="text" id="fb-storageBucket" value="${fbConfig.storageBucket || ''}" placeholder="larp-leaderboard.appspot.com" class="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500" />
          </div>
          <div class="md:col-span-2 pt-2">
            <button type="submit" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-lg shadow-emerald-500/20">
              ⚡ CONNECT FIREBASE LIVE SYNC
            </button>
          </div>
        </form>
      </div>

      <!-- Batch Naming Window Modal for Google Drive Imports -->
      ${pendingBatchDriveItems && pendingBatchDriveItems.length > 0 ? `
        <div id="modal-gdrive-batch" class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div class="glass-panel p-6 sm:p-8 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col space-y-6 border-2 border-amber-500/50 shadow-2xl">
            
            <div class="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <span class="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">GOOGLE DRIVE BATCH IMPORT</span>
                <h3 class="font-cinzel text-xl sm:text-2xl font-bold text-white">NAME YOUR IMPORTED LARPERS (${pendingBatchDriveItems.length})</h3>
              </div>
              <button id="btn-close-batch-modal" class="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white font-bold text-lg">
                &times;
              </button>
            </div>

            <p class="text-xs text-slate-300">Type or edit the name for each photo below before saving to your pending roster pool:</p>

            <div id="batch-items-list" class="flex-1 overflow-y-auto space-y-3 pr-2">
              ${pendingBatchDriveItems.map((item, idx) => `
                <div class="p-3 bg-slate-900/90 rounded-2xl border border-white/10 flex items-center space-x-4">
                  <div class="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-slate-950 flex items-center justify-center">
                    <img src="${item.imageUrl}" alt="Photo ${idx + 1}" class="w-full h-full object-contain" />
                  </div>
                  <div class="flex-1 space-y-1">
                    <label class="text-[10px] font-mono text-amber-400 font-bold block">Photo #${idx + 1} Name *</label>
                    <input 
                      type="text" 
                      data-batch-idx="${idx}"
                      value="${item.title}" 
                      placeholder="e.g. Sir Cedric of Oakhaven" 
                      class="batch-name-input w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-cinzel font-bold" 
                    />
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="border-t border-white/10 pt-4 flex justify-between items-center">
              <button id="btn-cancel-batch" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-mono rounded-xl">
                Cancel
              </button>
              <button id="btn-confirm-batch-import" class="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black font-cinzel text-sm rounded-xl shadow-xl shadow-amber-500/30 hover:scale-105 transition-transform">
                💾 CONFIRM & SAVE ALL (${pendingBatchDriveItems.length}) TO ROSTER
              </button>
            </div>

          </div>
        </div>
      ` : ''}

    </div>
  `;
}
