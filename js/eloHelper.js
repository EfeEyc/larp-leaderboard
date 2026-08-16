export function calculateElo(wins = 0, losses = 0) {
  const w = parseInt(wins || 0, 10);
  const l = parseInt(losses || 0, 10);
  if (w === 0 && l === 0) return 1200;
  const ratio = (w + 1) / (l + 1);
  return Math.round(1200 + 400 * Math.log10(ratio));
}
