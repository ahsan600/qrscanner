// History repository - abstraction over IndexedDB (Dexie-free, native IndexedDB)
// This module abstracts storage so we can swap to SQLite later if needed.

import type { HistoryItem } from '../store/types';

const DB_NAME = 'scanpro_history';
const STORE_NAME = 'items';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('favorite', 'favorite', { unique: false });
        store.createIndex('source', 'source', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return getDb().then((db) => {
    const transaction = db.transaction(STORE_NAME, mode);
    return transaction.objectStore(STORE_NAME);
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const historyRepo = {
  async init(): Promise<void> {
    await getDb();
  },

  async add(item: HistoryItem): Promise<void> {
    const store = await tx('readwrite');
    await reqToPromise(store.put(item));
  },

  async getAll(): Promise<HistoryItem[]> {
    const store = await tx('readonly');
    const items = await reqToPromise(store.getAll());
    return (items as HistoryItem[]).sort((a, b) => b.timestamp - a.timestamp);
  },

  async getById(id: string): Promise<HistoryItem | undefined> {
    const store = await tx('readonly');
    return reqToPromise(store.get(id)) as Promise<HistoryItem | undefined>;
  },

  async update(item: HistoryItem): Promise<void> {
    const store = await tx('readwrite');
    await reqToPromise(store.put(item));
  },

  async remove(id: string): Promise<void> {
    const store = await tx('readwrite');
    await reqToPromise(store.delete(id));
  },

  async removeMany(ids: string[]): Promise<void> {
    const store = await tx('readwrite');
    await Promise.all(ids.map((id) => reqToPromise(store.delete(id))));
  },

  async clear(): Promise<void> {
    const store = await tx('readwrite');
    await reqToPromise(store.clear());
  },

  async count(): Promise<number> {
    const store = await tx('readonly');
    return reqToPromise(store.count());
  },

  async trimToLimit(limit: number): Promise<void> {
    if (limit <= 0) return; // unlimited
    const items = await this.getAll();
    if (items.length <= limit) return;
    // Keep favorites, trim oldest non-favorites
    const favorites = items.filter((i) => i.favorite);
    const nonFavorites = items.filter((i) => !i.favorite);
    const maxNonFavorites = Math.max(0, limit - favorites.length);
    const toRemove = nonFavorites.slice(maxNonFavorites);
    if (toRemove.length > 0) {
      await this.removeMany(toRemove.map((i) => i.id));
    }
  },

  async search(query: string): Promise<HistoryItem[]> {
    const all = await this.getAll();
    const q = query.toLowerCase();
    return all.filter(
      (item) =>
        item.content.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
    );
  },
};
