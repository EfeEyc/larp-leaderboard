import { calculateElo } from '../eloHelper.js';

export function renderLeaderboard(entries, filterCategory, searchQuery) {
  let filtered = entries.filter(e => {
    const matchesSearch = !searchQuery || 
      e.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  filtered.sort((a, b) => {
    const eloA = calculateElo(a.wins, a.losses);
    const eloB = calculateElo(b.wins, b.losses);
    return eloB - eloA;
  });

  const top3 = filtered.slice(0, 3);

  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      <!-- Hero Banner -->
      <div class="text-center space-y-3 relative py-4">
        <h2 class="font-cinzel text-3xl sm:text-5xl font-extrabold text-gradient-gold tracking-wide">
          HALL OF CHAMPIONS
        </h2>
        <p class="text-slate-400 max-w-xl mx-auto text-sm sm:text-base font-light">
          Weekly leaderboard ranked by LARP Rating.
        </p>
      </div>

      <!-- Podium Section (Top 3) -->
      ${top3.length >= 3 && !searchQuery ? `
        <div class="flex flex-col md:grid md:grid-cols-3 gap-6 items-end pt-6 pb-2">
          
          <!-- 1st Place Gold -->
          <div class="w-full order-1 md:order-2 podium-1 rounded-3xl p-8 relative cursor-pointer glass-panel-hover transform md:-translate-y-4" data-entry-id="${top3[0].id}">
            <div class="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black px-6 py-1.5 rounded-full text-xs font-mono tracking-widest shadow-lg shadow-amber-500/40 animate-pulse">
              👑 1ST PLACE CHAMPION
            </div>
            <div class="mt-2 text-center space-y-4">
              <div class="w-44 h-44 mx-auto rounded-2xl overflow-hidden border-4 border-amber-400 shadow-2xl relative gold-glow bg-slate-950 flex items-center justify-center p-1">
                <img src="${top3[0].imageUrl}" alt="${top3[0].title}" class="w-full h-full object-contain" />
              </div>
              <div>
                <h3 class="font-cinzel text-xl sm:text-2xl font-black text-amber-300">${top3[0].title}</h3>
              </div>
              <div class="text-center bg-slate-950/80 p-3.5 rounded-2xl border border-amber-500/40 font-mono space-y-0.5">
                <div class="text-amber-300 font-black text-2xl">${calculateElo(top3[0].wins, top3[0].losses)}</div>
                <div class="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">LARP Rating</div>
                <div class="text-[11px] text-slate-400 pt-0.5">${top3[0].wins || 0}W / ${top3[0].losses || 0}L</div>
              </div>
            </div>
          </div>

          <!-- 2nd Place Silver -->
          <div class="w-full order-2 md:order-1 podium-2 rounded-3xl p-6 relative cursor-pointer glass-panel-hover" data-entry-id="${top3[1].id}">
            <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-950 font-bold px-4 py-1 rounded-full text-xs font-mono tracking-widest shadow-md">
              🥈 2ND PLACE
            </div>
            <div class="mt-2 text-center space-y-4">
              <div class="w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-slate-300 shadow-xl relative bg-slate-950 flex items-center justify-center p-1">
                <img src="${top3[1].imageUrl}" alt="${top3[1].title}" class="w-full h-full object-contain" />
              </div>
              <div>
                <h3 class="font-cinzel text-lg font-bold text-white">${top3[1].title}</h3>
              </div>
              <div class="text-center bg-slate-950/60 p-2.5 rounded-xl border border-white/10 font-mono space-y-0.5">
                <div class="text-slate-200 font-extrabold text-xl">${calculateElo(top3[1].wins, top3[1].losses)}</div>
                <div class="text-[9px] font-semibold uppercase tracking-wider text-slate-400">LARP Rating</div>
                <div class="text-[10px] text-slate-400">${top3[1].wins || 0}W / ${top3[1].losses || 0}L</div>
              </div>
            </div>
          </div>

          <!-- 3rd Place Bronze -->
          <div class="w-full order-3 md:order-3 podium-3 rounded-3xl p-6 relative cursor-pointer glass-panel-hover" data-entry-id="${top3[2].id}">
            <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-800 text-amber-100 font-bold px-4 py-1 rounded-full text-xs font-mono tracking-widest shadow-md">
              🥉 3RD PLACE
            </div>
            <div class="mt-2 text-center space-y-4">
              <div class="w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-amber-700 shadow-xl relative bg-slate-950 flex items-center justify-center p-1">
                <img src="${top3[2].imageUrl}" alt="${top3[2].title}" class="w-full h-full object-contain" />
              </div>
              <div>
                <h3 class="font-cinzel text-lg font-bold text-white">${top3[2].title}</h3>
              </div>
              <div class="text-center bg-slate-950/60 p-2.5 rounded-xl border border-white/10 font-mono space-y-0.5">
                <div class="text-amber-500 font-extrabold text-xl">${calculateElo(top3[2].wins, top3[2].losses)}</div>
                <div class="text-[9px] font-semibold uppercase tracking-wider text-amber-500/80">LARP Rating</div>
                <div class="text-[10px] text-slate-400">${top3[2].wins || 0}W / ${top3[2].losses || 0}L</div>
              </div>
            </div>
          </div>

        </div>
      ` : ''}

      <!-- Search Control -->
      <div class="glass-panel p-4 rounded-2xl flex items-center justify-between">
        <div class="relative w-full sm:w-80">
          <input 
            type="text" 
            id="search-input" 
            placeholder="Search by name..." 
            value="${searchQuery || ''}" 
            class="w-full bg-slate-950/80 border border-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <!-- Leaderboard List -->
      <div class="glass-panel rounded-3xl overflow-hidden">
        <div class="divide-y divide-white/5">
          
          ${filtered.length === 0 ? `
            <div class="p-16 text-center text-slate-400 font-mono space-y-3">
              <span class="text-4xl">🏆</span>
              <p class="text-base font-bold text-white">No LARPers uploaded yet.</p>
              <p class="text-xs text-slate-500">Go to the admin page (<code class="text-amber-400">#admin</code>) to upload materials!</p>
            </div>
          ` : filtered.map((entry, idx) => {
            const elo = calculateElo(entry.wins, entry.losses);
            const rank = idx + 1;

            return `
              <div 
                class="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-800/40 transition-colors cursor-pointer group" 
                data-entry-id="${entry.id}"
              >
                <div class="flex items-center space-x-4 sm:space-x-6 min-w-0">
                  <div class="w-8 sm:w-10 text-center font-cinzel font-black text-base sm:text-xl ${
                    rank === 1 ? 'text-amber-400 text-2xl' : 
                    rank === 2 ? 'text-slate-300' : 
                    rank === 3 ? 'text-amber-600' : 'text-slate-500'
                  }">
                    #${rank}
                  </div>

                  <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-white/10 group-hover:border-amber-500/50 transition-colors shrink-0 bg-slate-950 flex items-center justify-center p-1">
                    <img src="${entry.imageUrl}" alt="${entry.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                  </div>

                  <div class="min-w-0">
                    <h4 class="font-cinzel text-base sm:text-lg font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                      ${entry.title}
                    </h4>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <div class="inline-flex items-baseline space-x-1.5 bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/30">
                    <span class="text-base sm:text-lg font-mono font-black text-amber-300">${elo}</span>
                    <span class="text-[10px] font-mono font-semibold uppercase text-amber-400/80 tracking-wider">LARP Rating</span>
                  </div>
                  <div class="text-[11px] font-mono text-slate-400 mt-1">
                    ${entry.wins || 0}W / ${entry.losses || 0}L
                  </div>
                </div>

              </div>
            `;
          }).join('')}

        </div>
      </div>

    </div>
  `;
}
