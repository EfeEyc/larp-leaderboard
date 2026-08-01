export function renderEntryModal(entry) {
  if (!entry) return '';

  const total = entry.totalVotes || 1;
  const winRate = Math.round(((entry.wins || 0) / total) * 100);

  return `
    <div id="entry-modal-backdrop" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div class="glass-panel max-w-xl w-full rounded-3xl border-2 border-amber-500/30 overflow-hidden shadow-2xl relative">
        
        <button id="modal-close-btn" class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-slate-950/80 border border-white/20 text-gray-300 hover:text-white flex items-center justify-center font-bold text-lg">
          ✕
        </button>

        <div class="w-full h-80 sm:h-[450px] relative overflow-hidden bg-slate-950 flex items-center justify-center p-2">
          <img src="${entry.imageUrl}" alt="${entry.title}" class="w-full h-full object-contain" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
          
          <div class="absolute bottom-6 left-6 right-6">
            <h2 class="font-cinzel text-2xl sm:text-4xl font-extrabold text-amber-300">
              ${entry.title}
            </h2>
          </div>
        </div>

        <div class="p-6 sm:p-8 space-y-6">
          <div class="grid grid-cols-3 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-white/10 text-center font-mono">
            <div>
              <span class="text-[10px] text-slate-400 block uppercase">WINS</span>
              <strong class="text-emerald-400 text-xl font-bold">${entry.wins || 0}</strong>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block uppercase">LOSSES</span>
              <strong class="text-rose-400 text-xl font-bold">${entry.losses || 0}</strong>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block uppercase">WIN RATE</span>
              <strong class="text-amber-400 text-xl font-bold">${winRate}%</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}
