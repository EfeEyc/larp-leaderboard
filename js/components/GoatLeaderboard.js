import { calculateElo } from '../eloHelper.js';

export class GoatVoteManager {
  constructor(storage, onVoteCompleted, onTournamentFinished) {
    this.storage = storage;
    this.onVoteCompleted = onVoteCompleted;
    this.onTournamentFinished = onTournamentFinished;
    this.currentMatch = null;
    this.roundSize = 8;
    this.tournamentQueue = [];
    this.nextRoundQueue = [];
    this.currentRoundName = 'Tournament Matches';
    this.roundNumber = 1;
    this.lastMatchResult = null;
    this.champion = null;
    this.isRevealing = false;
  }

  isActivatedEntry(e) {
    return e && e.weekId && e.weekId !== 'pending' && e.weekId !== 'unassigned';
  }

  startNewTournament() {
    const activatedEntries = this.storage.getEntries().filter(e => this.isActivatedEntry(e));
    
    if (activatedEntries.length < 2) {
      this.currentMatch = null;
      this.tournamentQueue = [];
      return;
    }

    const selected = activatedEntries.sort(() => Math.random() - 0.5);

    this.tournamentQueue = selected;
    this.nextRoundQueue = [];
    this.champion = null;
    this.lastMatchResult = null;
    this.updateRoundName(selected.length);
    this.nextMatch();
  }

  updateRoundName(remainingCount) {
    if (remainingCount > 32) this.currentRoundName = 'Round of 64';
    else if (remainingCount > 16) this.currentRoundName = 'Round of 32';
    else if (remainingCount > 8) this.currentRoundName = 'Round of 16';
    else if (remainingCount > 4) this.currentRoundName = 'Quarterfinals (Round of 8)';
    else if (remainingCount > 2) this.currentRoundName = 'Semifinals (Round of 4)';
    else if (remainingCount === 2) this.currentRoundName = '🏆 ALL-TIME GRAND FINAL 🏆';
    else this.currentRoundName = 'GOAT Tournament Matches';
  }

  nextMatch() {
    this.isRevealing = false;
    this.lastMatchResult = null;

    this.tournamentQueue = this.tournamentQueue.filter(e => this.isActivatedEntry(e));

    if (this.tournamentQueue.length >= 2) {
      const contestantA = this.tournamentQueue.shift();
      const contestantB = this.tournamentQueue.shift();
      this.currentMatch = { a: contestantA, b: contestantB };
    } else if (this.tournamentQueue.length === 1) {
      const remaining = this.tournamentQueue.shift();
      if (this.isActivatedEntry(remaining)) {
        this.nextRoundQueue.push(remaining);
      }
      this.advanceRound();
    } else {
      this.advanceRound();
    }
  }

  advanceRound() {
    this.nextRoundQueue = this.nextRoundQueue.filter(e => this.isActivatedEntry(e));

    if (this.nextRoundQueue.length === 1) {
      this.champion = this.nextRoundQueue[0];
      this.currentMatch = null;
      this.storage.markVotedCurrentMonth();
      this.triggerConfetti();

      if (this.onTournamentFinished) {
        this.onTournamentFinished(this.champion);
      }
    } else if (this.nextRoundQueue.length >= 2) {
      this.tournamentQueue = [...this.nextRoundQueue];
      this.nextRoundQueue = [];
      this.roundNumber++;
      this.updateRoundName(this.tournamentQueue.length);
      this.nextMatch();
    } else {
      this.startNewTournament();
    }
  }

  async vote(winnerId, loserId) {
    if (this.isRevealing) return;
    this.isRevealing = true;

    const result = await this.storage.recordMatchVote(winnerId, loserId);
    this.lastMatchResult = { winnerId, loserId, result };

    const winnerEntry = this.storage.getEntryById(winnerId);
    if (winnerEntry && this.isActivatedEntry(winnerEntry)) {
      this.nextRoundQueue.push(winnerEntry);
    }

    if (this.onVoteCompleted) {
      this.onVoteCompleted();
    }
  }

  triggerConfetti() {
    if (window.confetti) {
      window.confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  }
}

export function renderGoatLeaderboard(entries, searchQuery, sortBy, subTab, goatManager, storage) {
  let filtered = entries.filter(e => e && e.weekId && e.weekId !== 'pending' && e.weekId !== 'unassigned');

  if (searchQuery) {
    filtered = filtered.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  filtered.sort((a, b) => {
    const eloA = calculateElo(a.wins, a.losses);
    const eloB = calculateElo(b.wins, b.losses);
    return eloB - eloA;
  });

  const top3 = filtered.slice(0, 3);

  return `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      <!-- GOAT Hero Banner -->
      <div class="text-center space-y-3 relative py-4">
        <div class="inline-block px-4 py-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs font-mono uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20 mb-2">
          👑 THE ALL-TIME HALL OF FAME
        </div>
        <h2 class="font-cinzel text-3xl sm:text-5xl font-black text-gradient-gold tracking-wide">
          ALL-TIME GOATs
        </h2>
        <p class="text-slate-400 max-w-xl mx-auto text-sm sm:text-base font-light">
          Master LARP Ratings & tournament bracket for all LARPers uploaded across all weeks.
        </p>
      </div>

      <!-- Sub-Tab Switcher -->
      <div class="flex justify-center">
        <div class="bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 flex space-x-2">
          <button id="goat-tab-rankings" class="px-6 py-2.5 rounded-xl font-cinzel text-xs sm:text-sm font-bold transition-all ${
            subTab === 'rankings' 
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30' 
              : 'text-gray-400 hover:text-white'
          }">
            🏆 ALL-TIME RANKINGS
          </button>
          <button id="goat-tab-battle" class="px-6 py-2.5 rounded-xl font-cinzel text-xs sm:text-sm font-bold transition-all ${
            subTab === 'battle' 
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30' 
              : 'text-gray-400 hover:text-white'
          }">
            ⚔️ MONTHLY GOAT TOURNAMENT BRACKET
          </button>
        </div>
      </div>

      ${subTab === 'battle' ? renderGoatBattleView(goatManager, storage) : renderGoatRankingsView(filtered, top3, searchQuery)}

    </div>
  `;
}

function renderGoatRankingsView(filtered, top3, searchQuery) {
  return `
    <!-- Top 3 All-Time Podium -->
    ${top3.length >= 3 && !searchQuery ? `
      <div class="flex flex-col md:grid md:grid-cols-3 gap-6 items-end pt-6 pb-2">
        
        <!-- 1st Place GOAT -->
        <div class="w-full order-1 md:order-2 podium-1 rounded-3xl p-8 relative cursor-pointer glass-panel-hover transform md:-translate-y-4" data-entry-id="${top3[0].id}">
          <div class="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black px-6 py-1.5 rounded-full text-xs font-mono tracking-widest shadow-lg shadow-amber-500/40 animate-pulse">
            👑 ALL-TIME #1 GOAT
          </div>
          <div class="mt-2 text-center space-y-4">
            <div class="w-44 h-44 mx-auto rounded-2xl overflow-hidden border-4 border-amber-400 shadow-2xl relative gold-glow bg-slate-950 flex items-center justify-center p-1">
              <img src="${top3[0].imageUrl}" alt="${top3[0].title}" class="w-full h-full object-contain" />
            </div>
            <div>
              <h3 class="font-cinzel text-xl sm:text-2xl font-black text-amber-300">${top3[0].title}</h3>
            </div>
            <div class="text-center bg-slate-950/80 p-3 rounded-2xl border border-amber-500/40 font-mono space-y-1">
              <div class="text-amber-400 font-extrabold text-base sm:text-lg">${calculateElo(top3[0].wins, top3[0].losses)} LARP Rating</div>
              <div class="text-[11px] text-slate-400 font-mono">${top3[0].wins || 0}W / ${top3[0].losses || 0}L</div>
            </div>
          </div>
        </div>

        <!-- 2nd Place -->
        <div class="w-full order-2 md:order-1 podium-2 rounded-3xl p-6 relative cursor-pointer glass-panel-hover" data-entry-id="${top3[1].id}">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-950 font-bold px-4 py-1 rounded-full text-xs font-mono tracking-widest shadow-md">
            🥈 ALL-TIME #2
          </div>
          <div class="mt-2 text-center space-y-4">
            <div class="w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-slate-300 shadow-xl relative bg-slate-950 flex items-center justify-center p-1">
              <img src="${top3[1].imageUrl}" alt="${top3[1].title}" class="w-full h-full object-contain" />
            </div>
            <div>
              <h3 class="font-cinzel text-lg font-bold text-white">${top3[1].title}</h3>
            </div>
            <div class="text-center bg-slate-950/60 p-2.5 rounded-xl border border-white/10 font-mono space-y-0.5">
              <div class="text-slate-200 font-bold text-sm">${calculateElo(top3[1].wins, top3[1].losses)} LARP Rating</div>
              <div class="text-[10px] text-slate-400 font-mono">${top3[1].wins || 0}W / ${top3[1].losses || 0}L</div>
            </div>
          </div>
        </div>

        <!-- 3rd Place -->
        <div class="w-full order-3 md:order-3 podium-3 rounded-3xl p-6 relative cursor-pointer glass-panel-hover" data-entry-id="${top3[2].id}">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-800 text-amber-100 font-bold px-4 py-1 rounded-full text-xs font-mono tracking-widest shadow-md">
            🥉 ALL-TIME #3
          </div>
          <div class="mt-2 text-center space-y-4">
            <div class="w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-amber-700 shadow-xl relative bg-slate-950 flex items-center justify-center p-1">
              <img src="${top3[2].imageUrl}" alt="${top3[2].title}" class="w-full h-full object-contain" />
            </div>
            <div>
              <h3 class="font-cinzel text-lg font-bold text-white">${top3[2].title}</h3>
            </div>
            <div class="text-center bg-slate-950/60 p-2.5 rounded-xl border border-white/10 font-mono space-y-0.5">
              <div class="text-amber-500 font-bold text-sm">${calculateElo(top3[2].wins, top3[2].losses)} LARP Rating</div>
              <div class="text-[10px] text-slate-400 font-mono">${top3[2].wins || 0}W / ${top3[2].losses || 0}L</div>
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
          id="goat-search-input" 
          placeholder="Search all-time GOATs..." 
          value="${searchQuery || ''}" 
          class="w-full bg-slate-950/80 border border-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>

    <!-- Master Table -->
    <div class="glass-panel rounded-3xl overflow-hidden">
      <div class="divide-y divide-white/5">
        ${filtered.length === 0 ? `
          <div class="p-16 text-center text-slate-400 font-mono space-y-3">
            <span class="text-4xl">👑</span>
            <p class="text-base font-bold text-white">No All-Time GOATs found.</p>
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
                <div class="text-sm sm:text-base font-mono font-black text-amber-300 bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/30 inline-block">
                  ${elo} LARP Rating
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
  `;
}

function renderGoatBattleView(manager, storage) {
  const hasVotedMonth = storage ? storage.hasVotedCurrentMonth() : false;

  if (hasVotedMonth && !manager.champion && !manager.currentMatch) {
    return `
      <div class="max-w-4xl mx-auto px-4 py-16 text-center space-y-8 animate-fade-in">
        <div class="glass-panel p-10 rounded-3xl border border-amber-500/40 space-y-6">
          <div class="w-20 h-20 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-4xl">
            👑
          </div>
          <div>
            <h2 class="font-cinzel text-3xl font-bold text-gradient-gold">MONTHLY GOAT TOURNAMENT COMPLETED</h2>
            <p class="text-slate-300 text-sm mt-2 max-w-md mx-auto">
              You have completed your Monthly GOAT Tournament Bracket vote!
            </p>
          </div>
          <p class="text-xs font-mono text-slate-400">
            Check back next month for the next Monthly GOAT battle bracket!
          </p>
        </div>
      </div>
    `;
  }

  if (!manager.currentMatch && !manager.champion) {
    manager.startNewTournament();
  }

  const match = manager.currentMatch;
  const champion = manager.champion;

  if (champion) {
    return `
      <div class="max-w-4xl mx-auto px-4 py-12 text-center space-y-8 animate-fade-in">
        <div class="glass-panel p-10 rounded-3xl border-2 border-amber-500/50 shadow-2xl relative overflow-hidden gold-glow">
          <div class="inline-block px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 font-black rounded-full text-xs font-mono uppercase tracking-widest mb-6">
            👑 YOUR MONTHLY GOAT CHAMPION PICK 👑
          </div>

          <div class="w-64 h-64 mx-auto rounded-3xl overflow-hidden border-4 border-amber-400 shadow-2xl relative mb-6 bg-slate-950 flex items-center justify-center p-2">
            <img src="${champion.imageUrl}" alt="${champion.title}" class="w-full h-full object-contain" />
          </div>

          <h2 class="font-cinzel text-3xl sm:text-5xl font-black text-amber-300 mb-6">
            ${champion.title}
          </h2>

          <div class="text-center max-w-xs mx-auto bg-slate-950/80 p-4 rounded-2xl border border-amber-500/40 font-mono space-y-1 mb-8">
            <div class="text-amber-400 font-extrabold text-xl">${calculateElo(champion.wins, champion.losses)} LARP Rating</div>
            <div class="text-xs text-slate-400">${champion.wins || 0} Wins / ${champion.losses || 0} Losses</div>
          </div>
        </div>
      </div>
    `;
  }

  if (!match) {
    return `
      <div class="max-w-4xl mx-auto px-4 py-16 text-center space-y-4 glass-panel rounded-3xl border border-amber-500/40">
        <div class="text-4xl">👑</div>
        <h3 class="font-cinzel text-2xl font-bold text-white">NEED AT LEAST 2 ACTIVATED LARPers FOR GOAT BATTLES</h3>
        <p class="text-xs text-slate-400">Activate pending LARPers into a weekly roster in the Admin panel to unlock All-Time GOAT matchups!</p>
      </div>
    `;
  }

  const { a, b } = match;
  const totalMatchVotes = (a.totalVotes || 0) + (b.totalVotes || 0) || 1;
  const pctA = Math.round(((a.totalVotes || 1) / totalMatchVotes) * 100);
  const pctB = 100 - pctA;

  return `
    <div class="max-w-6xl mx-auto px-4 py-4 space-y-8">
      
      <div class="glass-panel p-6 rounded-3xl border border-amber-500/40 text-center space-y-1">
        <span class="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">
          ${manager.currentRoundName || 'Tournament Matches'}
        </span>
        <h2 class="font-cinzel text-2xl sm:text-4xl font-extrabold text-white">
          MONTHLY GOAT 1v1 TOURNAMENT
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative items-stretch">
        
        <div class="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 via-amber-500 to-yellow-300 p-1 shadow-2xl battle-card-vs">
          <div class="w-full h-full bg-slate-950 rounded-full flex items-center justify-center font-cinzel font-black text-xl text-amber-300">
            VS
          </div>
        </div>

        <!-- Contestant A -->
        <div 
          class="battle-card glass-panel rounded-3xl border-2 border-white/10 p-6 flex flex-col justify-between group cursor-pointer" 
          id="goat-card-vote-a"
          data-entry-id="${a.id}"
          data-loser-id="${b.id}"
        >
          <div class="space-y-4">
            <div class="w-full h-80 sm:h-[420px] rounded-2xl overflow-hidden relative border border-white/10 bg-slate-950 flex items-center justify-center p-2">
              <img src="${a.imageUrl}" alt="${a.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
            </div>

            <div class="text-center py-2">
              <h3 class="font-cinzel text-2xl sm:text-3xl font-bold text-white group-hover:text-amber-300 transition-colors">
                ${a.title}
              </h3>
            </div>
          </div>

          <div class="mt-4">
            ${manager.isRevealing ? `
              <div class="space-y-1 animate-fade-in">
                <div class="flex justify-between text-xs font-mono">
                  <span class="text-amber-400">All-Time Choice</span>
                  <span class="text-emerald-400 font-bold">${pctA}%</span>
                </div>
                <div class="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                  <div class="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full" style="width: ${pctA}%"></div>
                </div>
              </div>
            ` : `
              <button class="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 text-slate-950 font-black font-cinzel text-base tracking-wider shadow-lg shadow-amber-500/20 group-hover:scale-[1.02] transition-transform">
                👑 CHOOSE ${a.title.toUpperCase()}
              </button>
            `}
          </div>
        </div>

        <!-- Contestant B -->
        <div 
          class="battle-card glass-panel rounded-3xl border-2 border-white/10 p-6 flex flex-col justify-between group cursor-pointer" 
          id="goat-card-vote-b"
          data-entry-id="${b.id}"
          data-loser-id="${a.id}"
        >
          <div class="space-y-4">
            <div class="w-full h-80 sm:h-[420px] rounded-2xl overflow-hidden relative border border-white/10 bg-slate-950 flex items-center justify-center p-2">
              <img src="${b.imageUrl}" alt="${b.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
            </div>

            <div class="text-center py-2">
              <h3 class="font-cinzel text-2xl sm:text-3xl font-bold text-white group-hover:text-amber-300 transition-colors">
                ${b.title}
              </h3>
            </div>
          </div>

          <div class="mt-4">
            ${manager.isRevealing ? `
              <div class="space-y-1 animate-fade-in">
                <div class="flex justify-between text-xs font-mono">
                  <span class="text-amber-400">All-Time Choice</span>
                  <span class="text-emerald-400 font-bold">${pctB}%</span>
                </div>
                <div class="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                  <div class="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full" style="width: ${pctB}%"></div>
                </div>
              </div>
            ` : `
              <button class="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 text-slate-950 font-black font-cinzel text-base tracking-wider shadow-lg shadow-amber-500/20 group-hover:scale-[1.02] transition-transform">
                👑 CHOOSE ${b.title.toUpperCase()}
              </button>
            `}
          </div>
        </div>

      </div>

    </div>
  `;
}
