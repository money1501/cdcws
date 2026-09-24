export interface StoredPersonalFile {
  id: string;
  boardId: string;
  userId: string;
  name: string;
  size: number;
  type: string;
  blob: Blob;
  createdAt: number;
  lastModified: number;
}

const DB_NAME = 'drawgon_personal_files_v1';
const DB_VERSION = 1;
const STORE_NAME = 'files';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('boardId', 'boardId', { unique: false });
        store.createIndex('boardId_userId', ['boardId', 'userId'], { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

/** Retrieve all private files for this board and user. */
export async function getPersonalFiles(
  boardId: string,
  userId = 'local_user',
): Promise<StoredPersonalFile[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('boardId');
      const request = index.getAll(IDBKeyRange.only(boardId));

      request.onsuccess = () => {
        const results = (request.result as StoredPersonalFile[]) || [];
        // Filter by user if userId provided or return board-scoped private files
        const filtered = results
          .filter((f) => !f.userId || f.userId === userId || userId === 'local_user')
          .sort((a, b) => b.createdAt - a.createdAt);
        resolve(filtered);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('Failed to get personal files:', err);
    return [];
  }
}

/** Store a new private file in IndexedDB. */
export async function savePersonalFile(
  boardId: string,
  file: File,
  userId = 'local_user',
): Promise<StoredPersonalFile> {
  const db = await openDb();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const record: StoredPersonalFile = {
    id,
    boardId,
    userId,
    name: file.name,
    size: file.size,
    type: file.type || getMimeTypeFallback(file.name),
    blob: file,
    createdAt: Date.now(),
    lastModified: file.lastModified || Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => {
      resolve(record);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/** Delete a private file from IndexedDB. */
export async function deletePersonalFile(fileId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(fileId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Guess mime type if file.type is empty. */
export function getMimeTypeFallback(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    case 'md':
      return 'text/markdown';
    case 'json':
      return 'application/json';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'svg':
      return 'image/svg+xml';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'py':
    case 'html':
    case 'css':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

/** Helper to format file size cleanly. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
