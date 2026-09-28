/**
 * board-stash.ts
 * Reliable stash-and-resume storage for anonymous boards.
 *
 * Uses sessionStorage (per-tab isolation) with an IndexedDB fallback
 * for large snapshots (e.g., boards with embedded images, documents, or large vector sets).
 */

export interface StashedBoard {
  title: string;
  snapshot: Record<string, unknown>;
  timestamp: number;
  tabId: string;
}

const STORAGE_KEY = 'drawgon_pending_board_save';
const REF_KEY = 'drawgon_pending_board_save_ref';
const TAB_ID_KEY = 'drawgon_tab_id';
const MAX_STASH_AGE_MS = 60 * 60 * 1000; // 1 hour

const IDB_NAME = 'drawgon_stash_db';
const IDB_VERSION = 1;
const IDB_STORE = 'stashes';

/**
 * Returns a stable unique ID for the current browser tab.
 * Stored in sessionStorage so closing the tab discards it.
 */
export function getTabId(): string {
  try {
    let tabId = sessionStorage.getItem(TAB_ID_KEY);
    if (!tabId) {
      tabId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(TAB_ID_KEY, tabId);
    }
    return tabId;
  } catch {
    return 'default_tab';
  }
}

/**
 * Open or upgrade the IndexedDB for board stashes.
 */
function openStashDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'tabId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Save stashed board to IndexedDB keyed by tabId.
 */
async function saveToIndexedDB(data: StashedBoard): Promise<void> {
  const db = await openStashDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to put record in IndexedDB'));
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

/**
 * Retrieve stashed board from IndexedDB for current tabId.
 */
async function getFromIndexedDB(tabId: string): Promise<StashedBoard | null> {
  try {
    const db = await openStashDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(tabId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('Failed to read from IndexedDB'));
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        db.close();
        reject(err);
      }
    });
  } catch (err) {
    console.warn('IndexedDB read error:', err);
    return null;
  }
}

/**
 * Delete stashed board from IndexedDB for tabId.
 */
async function deleteFromIndexedDB(tabId: string): Promise<void> {
  try {
    const db = await openStashDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        const req = store.delete(tabId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        db.close();
        reject(err);
      }
    });
  } catch (err) {
    console.warn('IndexedDB delete error:', err);
  }
}

/**
 * Synchronously checks if a pending board save exists in the current session.
 * Used for immediate routing decisions (e.g. RootRoute) without asynchronous delay.
 */
export function hasPendingBoardSync(): boolean {
  try {
    const direct = sessionStorage.getItem(STORAGE_KEY);
    if (direct) {
      const parsed = JSON.parse(direct);
      if (parsed?.timestamp && Date.now() - parsed.timestamp < MAX_STASH_AGE_MS) {
        return true;
      }
      // Expired
      sessionStorage.removeItem(STORAGE_KEY);
    }

    const ref = sessionStorage.getItem(REF_KEY);
    if (ref) {
      const parsed = JSON.parse(ref);
      if (parsed?.timestamp && Date.now() - parsed.timestamp < MAX_STASH_AGE_MS) {
        return true;
      }
      // Expired
      sessionStorage.removeItem(REF_KEY);
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Synchronously reads the stashed snapshot if it fits in sessionStorage.
 * Used for fast canvas initial state hydration before async effects run.
 */
export function getPendingBoardSync(): StashedBoard | null {
  try {
    const direct = sessionStorage.getItem(STORAGE_KEY);
    if (direct) {
      const parsed: StashedBoard = JSON.parse(direct);
      if (parsed?.timestamp && Date.now() - parsed.timestamp < MAX_STASH_AGE_MS) {
        return parsed;
      }
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to read sync stashed board:', e);
  }
  return null;
}

/**
 * Stashes the board snapshot before authentication starts.
 * Attempts sessionStorage first; falls back to IndexedDB if quota is exceeded.
 */
export async function stashPendingBoard(
  snapshot: Record<string, unknown>,
  title: string,
): Promise<{ success: boolean; error?: string }> {
  const tabId = getTabId();
  const stashed: StashedBoard = {
    title: title || 'Untitled board',
    snapshot,
    timestamp: Date.now(),
    tabId,
  };

  // Try sessionStorage first (fastest and strictly tab-isolated)
  try {
    const serialized = JSON.stringify(stashed);
    sessionStorage.setItem(STORAGE_KEY, serialized);
    sessionStorage.removeItem(REF_KEY);
    // Also clean any previous IndexedDB entry for this tabId
    void deleteFromIndexedDB(tabId);
    return { success: true };
  } catch (sessionErr: any) {
    console.warn(
      'sessionStorage quota exceeded or error occurred while stashing board, falling back to IndexedDB:',
      sessionErr,
    );
  }

  // Fallback to IndexedDB (for large images, docs, complex drawings)
  try {
    await saveToIndexedDB(stashed);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.setItem(
      REF_KEY,
      JSON.stringify({
        type: 'idb',
        tabId,
        timestamp: stashed.timestamp,
      }),
    );
    return { success: true };
  } catch (idbErr: any) {
    console.error('Failed to stash board in IndexedDB as fallback:', idbErr);
    return {
      success: false,
      error:
        'Browser storage is full or disabled. Please export your drawing before logging in to avoid losing changes.',
    };
  }
}

/**
 * Retrieves the pending board stash (sessionStorage or IndexedDB).
 * Discards stashes older than 1 hour.
 */
export async function getPendingBoard(): Promise<StashedBoard | null> {
  const tabId = getTabId();

  // 1. Check direct sessionStorage stash
  try {
    const direct = sessionStorage.getItem(STORAGE_KEY);
    if (direct) {
      const parsed: StashedBoard = JSON.parse(direct);
      if (parsed?.timestamp && Date.now() - parsed.timestamp < MAX_STASH_AGE_MS) {
        return parsed;
      }
      // Expired
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Error reading pending board from sessionStorage:', err);
  }

  // 2. Check IndexedDB pointer
  try {
    const ref = sessionStorage.getItem(REF_KEY);
    if (ref) {
      const parsedRef = JSON.parse(ref);
      if (parsedRef?.timestamp && Date.now() - parsedRef.timestamp < MAX_STASH_AGE_MS) {
        const idbData = await getFromIndexedDB(parsedRef.tabId || tabId);
        if (idbData && Date.now() - idbData.timestamp < MAX_STASH_AGE_MS) {
          return idbData;
        }
      }
      // Expired or missing
      sessionStorage.removeItem(REF_KEY);
      void deleteFromIndexedDB(tabId);
    }
  } catch (err) {
    console.warn('Error reading pending board from IndexedDB ref:', err);
  }

  return null;
}

/**
 * Atomically clears any pending board stash from sessionStorage and IndexedDB.
 */
export async function clearPendingBoard(): Promise<void> {
  const tabId = getTabId();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(REF_KEY);
  } catch {
    // ignore
  }

  try {
    await deleteFromIndexedDB(tabId);
  } catch {
    // ignore
  }
}
