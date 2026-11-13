/** IndexedDB に1スロットで保存する(使えない環境では localStorage) */
import type { SaveData } from './types';

const DB = 'agent-factory';
const STORE = 'save';
const KEY = 'slot1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadGame(): Promise<SaveData | null> {
  try {
    const db = await openDb();
    const data = await new Promise<SaveData | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result as SaveData | undefined);
      req.onerror = () => reject(req.error);
    });
    return data?.v === 1 ? data : null;
  } catch {
    try {
      const raw = localStorage.getItem(`${DB}:${KEY}`);
      return raw ? (JSON.parse(raw) as SaveData) : null;
    } catch {
      return null;
    }
  }
}

export async function saveGame(data: SaveData): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try {
      localStorage.setItem(`${DB}:${KEY}`, JSON.stringify(data));
    } catch {
      /* 保存できなくても遊べる */
    }
  }
}

export async function clearGame(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* noop */
  }
  try {
    localStorage.removeItem(`${DB}:${KEY}`);
  } catch {
    /* noop */
  }
}
