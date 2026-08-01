import { firebaseService } from '../firebaseService.js';

export function renderHeader(activeTab, activeWeekTitle) {
  const isFbConnected = firebaseService.isConfigured();

  return `
    <header class="sticky top-0 z-40 glass-panel border-b border-amber-500/20 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          
          <!-- Logo & Brand -->
          <div class="flex items-center space-x-3 cursor-pointer" id="nav-logo">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-0.5 shadow-lg shadow-amber-500/20">
              <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span class="text-2xl">🏆</span>
              </div>
            </div>
            <div>
              <h1 class="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-gradient-gold">
                LARP LEADERBOARD
              </h1>
              <p class="text-xs text-amber-400/70 font-mono uppercase tracking-widest">
                ${activeWeekTitle || 'Weekly Roster & Rankings'}
              </p>
            </div>
          </div>

          <!-- Public Navigation Tabs -->
          <nav class="hidden md:flex items-center space-x-2 bg-slate-950/60 p-1.5 rounded-2xl border border-white/10">
            <button id="tab-btn-leaderboard" class="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
              activeTab === 'leaderboard' 
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30' 
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }">
              <span>🏆</span>
              <span>Leaderboard</span>
            </button>

            <button id="tab-btn-tournament" class="relative flex items-center space-x-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
              activeTab === 'tournament' 
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30' 
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }">
              <span>⚔️</span>
              <span>Weekly 1v1 Vote</span>
            </button>
          </nav>

          <!-- Status & Force Sync Reload Button -->
          <div class="flex items-center space-x-3">
            
            <!-- Force Sync Reload Button -->
            <button id="btn-force-sync-reload" class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-mono text-xs flex items-center space-x-1.5 transition-transform active:scale-95 shadow-md">
              <span class="text-sm">🔄</span>
              <span class="hidden sm:inline">Sync Database</span>
            </button>

            <div class="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-mono border ${
              isFbConnected 
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                : 'border-slate-700 bg-slate-900/80 text-gray-400'
            }">
              <span class="w-2 h-2 rounded-full ${isFbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}"></span>
              <span>${isFbConnected ? 'Firebase Live' : 'Local Data'}</span>
            </div>

            <!-- Mobile Menu Toggle Button -->
            <button id="mobile-menu-btn" class="md:hidden p-2 rounded-lg bg-slate-900 border border-white/10 text-gray-300 hover:text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>

        </div>

        <!-- Mobile Drawer -->
        <div id="mobile-drawer" class="hidden md:hidden pb-4 pt-2 border-t border-white/10 space-y-2">
          <button id="mob-btn-leaderboard" class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left font-medium text-sm ${activeTab === 'leaderboard' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-gray-300 bg-slate-900/60'}">
            <span>🏆</span><span>Leaderboard</span>
          </button>
          <button id="mob-btn-tournament" class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left font-medium text-sm ${activeTab === 'tournament' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-gray-300 bg-slate-900/60'}">
            <span>⚔️</span><span>Weekly 1v1 Vote</span>
          </button>
        </div>

      </div>
    </header>
  `;
}
