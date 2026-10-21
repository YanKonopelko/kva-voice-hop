import { LEVELS } from './levels.js?v=c204956e4ef6';
import { HATS } from './cosmetics.js?v=c204956e4ef6';
const KEY = 'kva-save-v1';
export const freshSave = () => ({ schema: 2, unlocked: 0, level: 0, sensitivity: 50, sound: false, best: {}, wallet: 0, ownedHats: ['none'], equippedHat: 'none', rewardedRuns: [] });
export function readSave(storage) {
  try {
    storage ??= globalThis.localStorage;
    const value = JSON.parse(storage.getItem(KEY));
    if (!value || typeof value !== 'object') return freshSave();
    const best = {};
    for (const level of LEVELS) {
      const record = value.best?.[level.id];
      if (!record || typeof record !== 'object' || !Number.isFinite(record.coins)) continue;
      best[level.id] = { coins: Math.max(0, Math.min(level.coins.length, Math.floor(record.coins))), time: Number.isFinite(record.time) && record.time > 0 ? record.time : 36000 };
    }
    const ownedHats = ['none', ...HATS.filter(h => h.id !== 'none' && Array.isArray(value.ownedHats) && value.ownedHats.includes(h.id)).map(h => h.id)];
    // First shop update credits historical best runs once; subsequent reads use
    // the stored wallet, preserving purchases and old completed levels.
    const legacyCoins = Object.values(best).reduce((sum, record) => sum + record.coins, 0);
    const wallet = value.schema === 2 ? Math.max(0, Math.min(1000000000, Number.isFinite(value.wallet) ? Math.floor(value.wallet) : 0)) : legacyCoins;
    return {
      schema: 2,
      unlocked: Math.max(0, Math.min(LEVELS.length - 1, Number.isInteger(value.unlocked) ? value.unlocked : 0)),
      level: Math.max(0, Math.min(LEVELS.length - 1, Number.isInteger(value.level) ? value.level : 0)),
      sensitivity: Math.max(0, Math.min(100, Number.isFinite(value.sensitivity) ? value.sensitivity : 50)),
      sound: value.sound === true,
      best, wallet, ownedHats,
      equippedHat: ownedHats.includes(value.equippedHat) ? value.equippedHat : 'none',
      rewardedRuns: Array.isArray(value.rewardedRuns) ? value.rewardedRuns.filter(id => typeof id === 'string' && id.length <= 80).slice(-64) : []
    };
  } catch { return freshSave(); }
}
export function writeSave(value, storage) {
  try { (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(value)); return true; } catch { return false; }
}
