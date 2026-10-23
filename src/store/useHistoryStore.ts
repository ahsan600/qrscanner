import { create } from 'zustand';
import type { HistoryItem } from './types';
import { historyRepo } from '../services/historyRepo';
import { useSettingsStore } from './useSettingsStore';

interface HistoryState {
  items: HistoryItem[];
  isLoading: boolean;

  loadHistory: () => Promise<void>;
  addItem: (item: HistoryItem) => Promise<void>;
  removeItem: (id: string) => Promise<HistoryItem | undefined>;
  removeMany: (ids: string[]) => Promise<HistoryItem[]>;
  toggleFavorite: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  restoreItems: (items: HistoryItem[]) => Promise<void>;
  enforceLimit: (limit: number) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  isLoading: false,

  loadHistory: async () => {
    set({ isLoading: true });
    try {
      const items = await historyRepo.getAll();
      set({ items, isLoading: false });
    } catch (e) {
      console.error('Failed to load history', e);
      set({ isLoading: false });
    }
  },

  addItem: async (item: HistoryItem) => {
    try {
      await historyRepo.add(item);
      const limit = useSettingsStore.getState().historyLimit;
      if (limit > 0) {
        await historyRepo.trimToLimit(limit);
        const all = await historyRepo.getAll();
        set({ items: all });
      } else {
        set((state) => ({ items: [item, ...state.items] }));
      }
    } catch (e) {
      console.error('Failed to add history item', e);
    }
  },

  enforceLimit: async (limit: number) => {
    try {
      if (limit > 0) {
        await historyRepo.trimToLimit(limit);
        const all = await historyRepo.getAll();
        set({ items: all });
      }
    } catch (e) {
      console.error('Failed to enforce history limit', e);
    }
  },

  removeItem: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    try {
      await historyRepo.remove(id);
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    } catch (e) {
      console.error('Failed to remove history item', e);
    }
    return item;
  },

  removeMany: async (ids: string[]) => {
    const removedItems = get().items.filter((i) => ids.includes(i.id));
    try {
      await historyRepo.removeMany(ids);
      set((state) => ({
        items: state.items.filter((i) => !ids.includes(i.id)),
      }));
    } catch (e) {
      console.error('Failed to remove history items', e);
    }
    return removedItems;
  },

  toggleFavorite: async (id: string) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const updated = { ...item, favorite: !item.favorite };
    try {
      await historyRepo.update(updated);
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? updated : i)),
      }));
    } catch (e) {
      console.error('Failed to toggle favorite', e);
    }
  },

  clearAll: async () => {
    try {
      await historyRepo.clear();
      set({ items: [] });
    } catch (e) {
      console.error('Failed to clear history', e);
    }
  },

  restoreItems: async (items: HistoryItem[]) => {
    try {
      for (const item of items) {
        await historyRepo.add(item);
      }
      const all = await historyRepo.getAll();
      set({ items: all });
    } catch (e) {
      console.error('Failed to restore items', e);
    }
  },
}));
