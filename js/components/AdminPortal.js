import { convertGoogleDriveUrl } from '../gdriveHelper.js';
import { firebaseService } from '../firebaseService.js';

export function renderAdminPortal(storage, isAuthenticated) {
  const config = storage.getConfig();
  const entries = storage.getEntries();
  const activeWeek = storage.getActiveWeek();

  if (!isAuthenticated) {
    return `
      <div class="max-w-md mx-auto px-4 py-16">
        <div class="glass-panel p-8 rounded-3xl border border-amber-500/30 text-center space-y-6">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl">
            👑
          </div>
          <div>
            <h2 class="font-cinzel text-2xl font-bold text-white">ADMIN PORTAL</h2>
            <p class="text-xs text-slate-400 mt-1">Enter admin key to manage LARP Leaderboard rosters</p>
          </div>
          <form id="admin-auth-form" class="space-y-4">
            <input 
              type="password" 
              id="admin-pass-input" 
              placeholder="Enter Admin Password (default: admin)" 
              class="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white text-center placeholder-gray-500 focus:outline-none focus:border-amber-500"
              required
            />
            <button type="submit" class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 font-black font-cinzel text-sm shadow-lg shadow-amber-500/20">
              UNLOCK ADMIN ACCESS
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
          <p class="text-xs text-slate-400 mt-1">Upload LARPers (Name + Image), manage weekly rosters, configure password & Firebase.</p>
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

      <!-- Weekly Rotation Roster Control Panel -->
      <div class="glass-panel p-8 rounded-3xl space-y-6 border border-amber-500/40">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span class="text-xs font-mono text-amber-400 block uppercase">ACTIVE WEEKLY ROSTER</span>
            <h3 class="font-cinzel text-2xl font-bold text-white">${activeWeek.title || 'Current Week'}</h3>
          </div>
          <button id="btn-advance-week" class="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 font-black font-cinzel text-xs rounded-xl shadow-lg shadow-amber-500/20">
            🔄 START NEW WEEKLY ROTATION
          </button>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          Starting a new weekly rotation publishes a new weekly roster and resets visitor completion state so everyone can vote on the new roster!
        </p>
      </div>

      <!-- Add New LARP Material Form -->
      <div class="glass-panel p-8 rounded-3xl space-y-6">
        <h3 class="font-cinzel text-xl font-bold text-amber-300 border-b border-white/10 pb-3 flex items-center space-x-2">
          <span>➕</span><span>UPLOAD NEW LARPER</span>
        </h3>

        <form id="form-entry-add" class="space-y-6">
          <div class="space-y-1">
            <label class="text-xs font-mono text-slate-300">LARPer / Material Name *</label>
            <input 
              type="text" 
              id="entry-title" 
              required 
              placeholder="e.g. Sir Cedric of Oakhaven" 
              class="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500" 
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-xs font-mono text-slate-300">Image Source (Google Drive Share Link or Web Direct URL) *</label>
              <span class="text-[11px] font-mono text-amber-400">Google Drive share links auto-convert</span>
            </div>
            <div class="flex gap-3">
              <input 
                type="text" 
                id="entry-image-url" 
                required 
                placeholder="Paste Google Drive share link (e.g. https://drive.google.com/file/d/.../view) or image URL" 
                class="flex-1 bg-slate-950 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500" 
              />
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
            💾 UPLOAD LARPER TO LEADERBOARD
          </button>
        </form>
      </div>

      <!-- Security: Change Admin Password Panel -->
      <div class="glass-panel p-8 rounded-3xl space-y-6 border border-amber-500/30">
        <h3 class="font-cinzel text-xl font-bold text-amber-400 border-b border-white/10 pb-3 flex items-center space-x-2">
          <span>🔑</span><span>CHANGE ADMIN PASSWORD</span>
        </h3>
        <form id="form-change-password" class="space-y-4 max-w-md">
          <div class="space-y-1">
            <label class="text-xs font-mono text-slate-300">New Admin Password</label>
            <input type="password" id="input-new-pass" required placeholder="Enter new secret password" class="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500" />
          </div>
          <button type="submit" class="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-lg shadow-amber-500/20">
            🔒 UPDATE ADMIN PASSWORD
          </button>
        </form>
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

      <!-- Manage Materials Table -->
      <div class="glass-panel p-8 rounded-3xl space-y-6">
        <h3 class="font-cinzel text-xl font-bold text-amber-300 border-b border-white/10 pb-3 flex items-center space-x-2">
          <span>📋</span><span>UPLOADED LARPERS (${entries.length})</span>
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs font-mono">
            <thead>
              <tr class="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                <th class="py-3 px-4">LARPer</th>
                <th class="py-3 px-4">Record (W / L)</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              ${entries.map(e => `
                <tr class="hover:bg-slate-900/50">
                  <td class="py-3 px-4 flex items-center space-x-3">
                    <img src="${e.imageUrl}" alt="${e.title}" class="w-12 h-12 object-cover rounded-lg border border-white/10" />
                    <div class="font-bold text-white font-cinzel text-sm">${e.title}</div>
                  </td>
                  <td class="py-3 px-4 text-emerald-400 font-bold">${e.wins || 0}W / ${e.losses || 0}L</td>
                  <td class="py-3 px-4 text-right">
                    <button class="btn-delete-entry px-3 py-1 bg-red-950 hover:bg-red-900 border border-red-500/40 text-red-300 rounded-lg" data-entry-id="${e.id}">
                      Delete
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}
