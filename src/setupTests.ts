// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom/extend-expect';

// Mock matchmedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
  } as unknown as MediaQueryList;
};

// Mock indexedDB for node/jsdom tests
if (typeof indexedDB === 'undefined') {
  (window as unknown as { indexedDB: unknown }).indexedDB = {
    open: () => ({
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: {
        objectStoreNames: { contains: () => false },
        createObjectStore: () => ({
          createIndex: () => {},
        }),
        transaction: () => ({
          objectStore: () => ({
            put: () => ({ onsuccess: null, onerror: null }),
            get: () => ({ onsuccess: null, onerror: null }),
            getAll: () => ({ onsuccess: null, onerror: null, result: [] }),
            delete: () => ({ onsuccess: null, onerror: null }),
            clear: () => ({ onsuccess: null, onerror: null }),
            count: () => ({ onsuccess: null, onerror: null, result: 0 }),
          }),
        }),
      },
    }),
  };
}
