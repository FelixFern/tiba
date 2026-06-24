// Cross-environment key/value storage.
//
// Uses react-native-mmkv when the native module is available (dev/prod builds),
// and transparently falls back to an in-memory store in Expo Go — where MMKV's
// TurboModule isn't bundled and would otherwise crash on instantiation.
// This keeps the UI runnable in Expo Go for slicing/iteration; persistence
// simply doesn't survive reloads there.

export interface KeyValueStore {
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  set(key: string, value: string | number | boolean): void;
  remove(key: string): void;
  clearAll(): void;
}

function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string | number | boolean>();
  return {
    getString: (key) => {
      const v = map.get(key);
      return typeof v === 'string' ? v : undefined;
    },
    getNumber: (key) => {
      const v = map.get(key);
      return typeof v === 'number' ? v : undefined;
    },
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
    clearAll: () => {
      map.clear();
    },
  };
}

function createStore(): KeyValueStore {
  try {
    // Lazy require so Expo Go doesn't evaluate the native module unless present.
    const { createMMKV } = require('react-native-mmkv');
    const mmkv = createMMKV();
    // Touch the instance to surface a missing-native-module error here.
    mmkv.getString('__tiba_probe__');
    return mmkv as KeyValueStore;
  } catch {
    if (__DEV__) {
      console.warn(
        '[tiba] react-native-mmkv unavailable (Expo Go?) — using in-memory storage. Persistence is disabled.',
      );
    }
    return createMemoryStore();
  }
}

export const storage = createStore();
