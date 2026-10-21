import { LEVELS } from './levels.js?v=c204956e4ef6';
import { HATS } from './cosmetics.js?v=c204956e4ef6';

export function buyOrEquipHat(save, id) {
  const hat = HATS.find(h => h.id === id);
  if (!hat) return { ok: false, reason: 'unknown' };
  if (save.ownedHats.includes(id)) { save.equippedHat = id; return { ok: true, bought: false, spent: 0 }; }
  if (save.wallet < hat.price) return { ok: false, reason: 'funds', missing: hat.price - save.wallet };
  save.wallet -= hat.price;
  save.ownedHats.push(id);
  save.equippedHat = id;
  return { ok: true, bought: true, spent: hat.price };
}

export function completeRun(save, { runId, levelIndex, coins, seconds }) {
  if (typeof runId !== 'string' || !runId || !LEVELS[levelIndex]) return { awarded: 0, invalid: true };
  if (save.rewardedRuns.includes(runId)) return { awarded: 0, duplicate: true };
  const level = LEVELS[levelIndex];
  const awarded = Math.max(0, Math.min(level.coins.length, Number.isFinite(coins) ? Math.floor(coins) : 0));
  const time = Number.isFinite(seconds) && seconds > 0 ? seconds : 36000;
  const old = save.best[level.id];
  save.best[level.id] = { coins: Math.max(old?.coins || 0, awarded), time: Math.min(old?.time || Infinity, time) };
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length - 1, levelIndex + 1));
  save.level = Math.min(LEVELS.length - 1, levelIndex + 1);
  save.wallet += awarded;
  save.rewardedRuns = [...save.rewardedRuns, runId].slice(-64);
  return { awarded, duplicate: false };
}
