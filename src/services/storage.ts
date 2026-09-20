import { WorkItem, AuthorFullData } from '../types';

const DB_NAME = 'openalex_comparison_db';
const DB_VERSION = 1;
const STORE_NAME = 'author_works';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'authorId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface CachedAuthorRecord {
  authorId: string;
  works: WorkItem[];
  totalWorksCount: number;
  savedAt: string;
}

/**
 * Retrieve cached works for an author from IndexedDB.
 */
export async function getCachedAuthorWorks(authorId: string): Promise<WorkItem[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(authorId);

      request.onsuccess = () => {
        const record = request.result as CachedAuthorRecord | undefined;
        if (record && Array.isArray(record.works) && record.works.length > 0) {
          resolve(record.works);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB read failed, continuing without cache:', err);
    return null;
  }
}

/**
 * Save all fetched works for an author to IndexedDB.
 */
export async function saveCachedAuthorWorks(
  authorId: string,
  works: WorkItem[],
  totalWorksCount: number
): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record: CachedAuthorRecord = {
        authorId,
        works,
        totalWorksCount,
        savedAt: new Date().toISOString(),
      };
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB write failed:', err);
  }
}

/**
 * Clear all cached records in IndexedDB.
 */
export async function clearAllCachedWorks(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to clear IndexedDB:', err);
  }
}

/**
 * Exports full author dataset (author metadata + all works) as a local JSON file download.
 */
export function exportAuthorDataToJson(author: AuthorFullData): void {
  const exportPayload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      openAlexId: author.id,
      displayName: author.displayName,
      worksCount: author.worksCount,
      downloadedWorksCount: author.works.length,
      citedByCount: author.citedByCount,
      hIndex: author.hIndex,
      i10Index: author.i10Index,
      institutions: author.institutions,
      countsByYear: author.countsByYear,
    },
    topJournals: author.top10Journals,
    topFields: author.top10Fields,
    works: author.works,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = author.displayName.replace(/[^a-zA-Z0-9_\-\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/g, '_');
  a.download = `openalex_${author.shortId}_${safeName}_all_works.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
