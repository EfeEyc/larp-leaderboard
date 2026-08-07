export class TournamentVoteManager {
  constructor(storage, onVoteCompleted, onTournamentFinished) {
    this.storage = storage;
    this.onVoteCompleted = onVoteCompleted;
    this.onTournamentFinished = onTournamentFinished;
    this.activeWeekId = null;
    this.currentMatch = null;
    this.roundSize = 8;
    this.tournamentQueue = [];
    this.nextRoundQueue = [];
    this.currentRoundName = 'Quarterfinals';
    this.roundNumber = 1;
    this.lastMatchResult = null;
    this.champion = null;
    this.isRevealing = false;
  }

  startNewTournament() {
    this.activeWeekId = this.storage.getActiveWeekId();
    const weekEntries = [...this.storage.getActiveWeekEntries()];
    if (weekEntries.length < 2) {
      return;
    }

    // Include ALL active week LARPers in the tournament bracket
    const selected = weekEntries.sort(() => Math.random() - 0.5);

    this.tournamentQueue = selected;
    this.nextRoundQueue = [];
    this.champion = null;
    this.lastMatchResult = null;
    this.updateRoundName(selected.length);
    this.nextMatch();
  }

  updateRoundName(remainingCount) {
    if (remainingCount >= 32) this.currentRoundName = 'Round of 32';
    else if (remainingCount >= 16) this.currentRoundName = 'Round of 16';
    else if (remainingCount >= 8) this.currentRoundName = 'Quarterfinals (Round of 8)';
    else if (remainingCount >= 4) this.currentRoundName = 'Semifinals (Round of 4)';
    else if (remainingCount >= 2) this.currentRoundName = '🏆 GRAND FINAL 🏆';
    else this.currentRoundName = 'Tournament Matches';
  }

  nextMatch() {
    this.isRevealing = false;
    this.lastMatchResult = null;

    if (this.tournamentQueue.length >= 2) {
      const contestantA = this.tournamentQueue.shift();
      const contestantB = this.tournamentQueue.shift();
      this.currentMatch = { a: contestantA, b: contestantB };
    } else if (this.tournamentQueue.length === 1) {
      this.nextRoundQueue.push(this.tournamentQueue.shift());
      this.advanceRound();
    } else {
      this.advanceRound();
    }
  }

  advanceRound() {
    if (this.nextRoundQueue.length === 1) {
      this.champion = this.nextRoundQueue[0];
      this.currentMatch = null;
      this.storage.markVotedCurrentWeek();
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
      this.startNewTournament(this.roundSize);
    }
  }

  async vote(winnerId, loserId) {
    if (this.isRevealing) return;
    this.isRevealing = true;

    const result = await this.storage.recordMatchVote(winnerId, loserId);
    this.lastMatchResult = { winnerId, loserId, result };

    const winnerEntry = this.storage.getEntryById(winnerId);
    if (winnerEntry) {
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

export function renderTournamentVote(manager, storage, onGoToLeaderboard) {
  const activeWeek = storage.getActiveWeek();
  const activeWeekId = activeWeek ? activeWeek.id : 'week-1';

  if (manager.activeWeekId !== activeWeekId) {
    manager.activeWeekId = activeWeekId;
    manager.currentMatch = null;
    manager.champion = null;
    manager.tournamentQueue = [];
    manager.nextRoundQueue = [];
  }

  const hasVoted = storage.hasVotedCurrentWeek();
  const weekEntries = storage.getActiveWeekEntries();

  if (weekEntries.length < 2) {
    return `
      <div class="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div class="glass-panel p-10 rounded-3xl border border-amber-500/40 space-y-4">
          <div class="text-4xl">⚔️</div>
          <h2 class="font-cinzel text-2xl font-bold text-gradient-gold">NO VOTING ROSTER AVAILABLE YET</h2>
          <p class="text-slate-300 text-sm max-w-md mx-auto">
            Please ask the administrator to upload at least 2 LARPers to the current weekly roster in <code class="text-amber-400">#admin</code>!
          </p>
        </div>
      </div>
    `;
  }

  if (hasVoted && !manager.champion && !manager.currentMatch) {
    return `
      <div class="max-w-4xl mx-auto px-4 py-16 text-center space-y-8 animate-fade-in">
        <div class="glass-panel p-10 rounded-3xl border border-amber-500/40 space-y-6">
          <div class="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-4xl">
            ✅
          </div>
          <div>
            <h2 class="font-cinzel text-3xl font-bold text-gradient-gold">WEEKLY VOTE COMPLETED</h2>
            <p class="text-slate-300 text-sm mt-2 max-w-md mx-auto">
              You have already completed your 1v1 Would You Rather tournament vote for <strong>${activeWeek.title || 'this week\'s roster'}</strong>!
            </p>
          </div>
          <p class="text-xs font-mono text-slate-400">
            Your votes have been submitted to the global standings. Check back next week for a fresh roster!
          </p>
          <div class="pt-4">
            <button id="btn-goto-leaderboard-from-voted" class="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-300 text-slate-950 font-black font-cinzel text-base rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-105 transition-transform">
              🏆 VIEW LEADERBOARD & RANKINGS
            </button>
          </div>
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
            🏆 YOUR WEEKLY CHAMPION PICK 🏆
          </div>

          <div class="w-64 h-64 mx-auto rounded-3xl overflow-hidden border-4 border-amber-400 shadow-2xl relative mb-6 bg-slate-950 flex items-center justify-center p-2">
            <img src="${champion.imageUrl}" alt="${champion.title}" class="w-full h-full object-contain" />
          </div>

          <h2 class="font-cinzel text-3xl sm:text-5xl font-black text-amber-300 mb-6">
            ${champion.title}
          </h2>

          <div class="flex justify-center space-x-6 max-w-xs mx-auto bg-slate-950/80 p-4 rounded-2xl border border-white/10 font-mono text-sm mb-8">
            <div>
              <span class="text-xs text-slate-400 block uppercase">TOTAL WINS</span>
              <strong class="text-emerald-400 text-xl font-bold">${champion.wins || 0}</strong>
            </div>
            <div class="w-px bg-white/10"></div>
            <div>
              <span class="text-xs text-slate-400 block uppercase">LOSSES</span>
              <strong class="text-rose-400 text-xl font-bold">${champion.losses || 0}</strong>
            </div>
          </div>

          <button id="btn-goto-leaderboard" class="px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black font-cinzel text-lg rounded-2xl shadow-xl shadow-amber-500/30 hover:scale-105 transition-transform">
            🏆 SEE LEADERBOARD & FULL RANKINGS
          </button>
        </div>
      </div>
    `;
  }

  if (!match) return '';

  const { a, b } = match;
  const totalMatchVotes = (a.totalVotes || 0) + (b.totalVotes || 0) || 1;
  const pctA = Math.round(((a.totalVotes || 1) / totalMatchVotes) * 100);
  const pctB = 100 - pctA;

  return `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      
      <div class="glass-panel p-6 rounded-3xl border border-amber-500/30 text-center">
        <h2 class="font-cinzel text-2xl sm:text-4xl font-extrabold text-white">
          WOULD YOU RATHER?
        </h2>
        <p class="text-xs text-slate-400 mt-1">Choose between the two LARPers below to determine this week's rankings!</p>
      </div>

      <!-- Main 1v1 Battle Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative items-stretch">
        
        <!-- VS Badge -->
        <div class="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 via-amber-500 to-yellow-300 p-1 shadow-2xl battle-card-vs">
          <div class="w-full h-full bg-slate-950 rounded-full flex items-center justify-center font-cinzel font-black text-xl text-amber-300">
            VS
          </div>
        </div>

        <!-- Contestant A -->
        <div 
          class="battle-card glass-panel rounded-3xl border-2 border-white/10 p-6 flex flex-col justify-between group cursor-pointer" 
          id="card-vote-a"
          data-entry-id="${a.id}"
          data-loser-id="${b.id}"
        >
          <div class="space-y-4">
            <div class="w-full h-80 sm:h-[420px] rounded-2xl overflow-hidden relative border border-white/10 bg-slate-950 flex items-center justify-center p-2">
              <img src="${a.imageUrl}" alt="${a.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
              <div class="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md text-emerald-400 font-mono text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10">
                ${a.wins || 0} Wins / ${a.losses || 0} Losses
              </div>
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
                  <span class="text-amber-400">Community Choice</span>
                  <span class="text-emerald-400 font-bold">${pctA}%</span>
                </div>
                <div class="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                  <div class="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full" style="width: ${pctA}%"></div>
                </div>
              </div>
            ` : `
              <button class="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 text-slate-950 font-black font-cinzel text-base tracking-wider shadow-lg shadow-amber-500/20 group-hover:scale-[1.02] transition-transform">
                ⚔️ CHOOSE ${a.title.toUpperCase()}
              </button>
            `}
          </div>
        </div>

        <!-- Contestant B -->
        <div 
          class="battle-card glass-panel rounded-3xl border-2 border-white/10 p-6 flex flex-col justify-between group cursor-pointer" 
          id="card-vote-b"
          data-entry-id="${b.id}"
          data-loser-id="${a.id}"
        >
          <div class="space-y-4">
            <div class="w-full h-80 sm:h-[420px] rounded-2xl overflow-hidden relative border border-white/10 bg-slate-950 flex items-center justify-center p-2">
              <img src="${b.imageUrl}" alt="${b.title}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
              <div class="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md text-emerald-400 font-mono text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10">
                ${b.wins || 0} Wins / ${b.losses || 0} Losses
              </div>
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
                  <span class="text-amber-400">Community Choice</span>
                  <span class="text-emerald-400 font-bold">${pctB}%</span>
                </div>
                <div class="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                  <div class="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full" style="width: ${pctB}%"></div>
                </div>
              </div>
            ` : `
              <button class="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 text-slate-950 font-black font-cinzel text-base tracking-wider shadow-lg shadow-amber-500/20 group-hover:scale-[1.02] transition-transform">
                ⚔️ CHOOSE ${b.title.toUpperCase()}
              </button>
            `}
          </div>
        </div>

      </div>

    </div>
  `;
}
