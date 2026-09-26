import { STARTING_WEAPON } from './weapons';

// Everything here survives death: weapons found, relics found, and a few stats.

export interface SaveData {
  weapons: string[];
  /** Up to four weapons carried in the quick slots. */
  loadout: string[];
  relics: string[];
  runs: number;
  deaths: number;
  seenIntro: boolean;
}

const KEY = 'thistlequest.save.v1';

export function freshSave(): SaveData {
  return { weapons: [STARTING_WEAPON], loadout: [STARTING_WEAPON], relics: [], runs: 1, deaths: 0, seenIntro: false };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const data = { ...freshSave(), ...JSON.parse(raw) } as SaveData;
    if (!data.weapons.includes(STARTING_WEAPON)) data.weapons.unshift(STARTING_WEAPON);
    data.loadout = (data.loadout ?? []).filter((w) => data.weapons.includes(w));
    if (data.loadout.length === 0) data.loadout = data.weapons.slice(0, 4);
    return data;
  } catch {
    return freshSave();
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable (private windows); the game still plays, it just won't remember.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
