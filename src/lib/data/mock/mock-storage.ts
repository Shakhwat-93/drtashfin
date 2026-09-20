/**
 * ==============================================================================
 * SECURITY WARNING:
 * Mock persistence is for development only and must not be used for real patient data.
 * Real patient health information (PHI) must comply with medical data protection
 * regulations and must reside securely in PostgreSQL with Row Level Security (RLS)
 * behind encrypted transport, never in unencrypted client-side web storage.
 * ==============================================================================
 */

class MemoryStorageAdapter {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const memoryStore = new MemoryStorageAdapter();

export class MockStorage {
  private static prefix = "doctor_pms_dev_";

  private static getStorage(): {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
  } {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    return memoryStore;
  }

  public static get<T>(key: string): T | null {
    try {
      const storage = this.getStorage();
      const raw = storage.getItem(this.prefix + key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  public static set<T>(key: string, value: T): void {
    try {
      const storage = this.getStorage();
      storage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      // Fallback to memory store if localStorage is full or disabled
      memoryStore.setItem(this.prefix + key, JSON.stringify(value));
    }
  }

  public static remove(key: string): void {
    try {
      const storage = this.getStorage();
      storage.removeItem(this.prefix + key);
    } catch {
      memoryStore.removeItem(this.prefix + key);
    }
  }

  public static clear(): void {
    try {
      const storage = this.getStorage();
      storage.clear();
    } catch {
      memoryStore.clear();
    }
  }
}
