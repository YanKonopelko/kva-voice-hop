const KEY = 'kva-save-v1';
export const freshSave = () => ({ unlocked: 0, level: 0, sensitivity: 50, sound: false, best: {} });
export function readSave(storage) {
  try {
    storage ??= globalThis.localStorage;
    const value = JSON.parse(storage.getItem(KEY));
    if (!value || typeof value !== 'object') return freshSave();
    return {
      unlocked: Math.max(0, Math.min(2, Number.isInteger(value.unlocked) ? value.unlocked : 0)),
      level: Math.max(0, Math.min(2, Number.isInteger(value.level) ? value.level : 0)),
      sensitivity: Math.max(0, Math.min(100, Number.isFinite(value.sensitivity) ? value.sensitivity : 50)),
      sound: value.sound === true,
      best: value.best && typeof value.best === 'object' && !Array.isArray(value.best) ? value.best : {}
    };
  } catch { return freshSave(); }
}
export function writeSave(value, storage) {
  try { (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(value)); return true; } catch { return false; }
}
