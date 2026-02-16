// MP Storage - IndexedDB Layer for Persistent MP Data
// Handles storage of 650 MPs, voting records, and promises with fallback to localStorage

import { MPProfile, VotingRecord, MPPromise } from './mp-system';

// ===========================
// IndexedDB Configuration
// ===========================

const DB_NAME = 'chancellor-game-db';
const DB_VERSION = 1;

const STORE_MPS = 'mps';
const STORE_VOTING_RECORDS = 'votingRecords';
const STORE_PROMISES = 'promises';

// ===========================
// IndexedDB Initialization
// ===========================

/**
 * Initialize the IndexedDB database
 */
export async function initMPDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORE_MPS)) {
        const mpStore = db.createObjectStore(STORE_MPS, { keyPath: 'id' });
        mpStore.createIndex('party', 'party', { unique: false });
        mpStore.createIndex('faction', 'faction', { unique: false });
        mpStore.createIndex('region', 'constituency.region', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_VOTING_RECORDS)) {
        db.createObjectStore(STORE_VOTING_RECORDS, { keyPath: 'mpId' });
      }

      if (!db.objectStoreNames.contains(STORE_PROMISES)) {
        const promiseStore = db.createObjectStore(STORE_PROMISES, { keyPath: 'id' });
        promiseStore.createIndex('category', 'category', { unique: false });
        promiseStore.createIndex('broken', 'broken', { unique: false });
      }
    };
  });
}

// ===========================
// MP CRUD Operations
// ===========================

/**
 * Save all MPs to IndexedDB
 */
export async function saveMPs(mps: Map<string, MPProfile>): Promise<void> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_MPS], 'readwrite');
    const store = transaction.objectStore(STORE_MPS);

    // Clear existing MPs
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add all MPs
    const promises: Promise<void>[] = [];
    mps.forEach((mp) => {
      promises.push(
        new Promise<void>((resolve, reject) => {
          const request = store.add(mp);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
      );
    });

    await Promise.all(promises);
    db.close();
  } catch (error) {
    console.error('Failed to save MPs to IndexedDB, falling back to localStorage:', error);
    // Fallback to localStorage
    try {
      const mpArray = Array.from(mps.values());
      localStorage.setItem('chancellor-mps', JSON.stringify(mpArray));
    } catch (localStorageError) {
      console.error('Failed to save MPs to localStorage:', localStorageError);
      throw new Error('Failed to persist MP data');
    }
  }
}

/**
 * Load all MPs from IndexedDB
 */
export async function loadMPs(): Promise<Map<string, MPProfile> | null> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_MPS], 'readonly');
    const store = transaction.objectStore(STORE_MPS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const mps = new Map<string, MPProfile>();
        (request.result as MPProfile[]).forEach((mp) => {
          mps.set(mp.id, mp);
        });

        db.close();

        // If no MPs in IndexedDB, try localStorage fallback
        if (mps.size === 0) {
          const localStorageData = localStorage.getItem('chancellor-mps');
          if (localStorageData) {
            try {
              const mpArray = JSON.parse(localStorageData) as MPProfile[];
              mpArray.forEach((mp) => mps.set(mp.id, mp));
            } catch (err) {
              console.error('Failed to parse MPs from localStorage:', err);
            }
          }
        }

        resolve(mps.size > 0 ? mps : null);
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to load MPs from IndexedDB, trying localStorage:', error);
    // Fallback to localStorage
    try {
      const localStorageData = localStorage.getItem('chancellor-mps');
      if (localStorageData) {
        const mpArray = JSON.parse(localStorageData) as MPProfile[];
        const mps = new Map<string, MPProfile>();
        mpArray.forEach((mp) => mps.set(mp.id, mp));
        return mps.size > 0 ? mps : null;
      }
    } catch (localStorageError) {
      console.error('Failed to load MPs from localStorage:', localStorageError);
    }
    return null;
  }
}

/**
 * Save a single MP (update)
 */
export async function saveMP(mp: MPProfile): Promise<void> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_MPS], 'readwrite');
    const store = transaction.objectStore(STORE_MPS);

    return new Promise<void>((resolve, reject) => {
      const request = store.put(mp);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to save MP to IndexedDB:', error);
    // Note: For single MP updates, we'd need to load all, update one, and save all for localStorage
    // For now, we'll skip localStorage fallback for single MP updates
    throw error;
  }
}

// ===========================
// Voting Record Operations
// ===========================

/**
 * Save voting records for all MPs
 */
export async function saveVotingRecords(
  votingRecords: Map<string, VotingRecord>
): Promise<void> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_VOTING_RECORDS], 'readwrite');
    const store = transaction.objectStore(STORE_VOTING_RECORDS);

    // Clear existing records
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add all voting records
    const promises: Promise<void>[] = [];
    votingRecords.forEach((record) => {
      promises.push(
        new Promise<void>((resolve, reject) => {
          const request = store.add(record);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
      );
    });

    await Promise.all(promises);
    db.close();
  } catch (error) {
    console.error('Failed to save voting records to IndexedDB:', error);
    // Fallback to localStorage
    try {
      const recordArray = Array.from(votingRecords.values());
      localStorage.setItem('chancellor-voting-records', JSON.stringify(recordArray));
    } catch (localStorageError) {
      console.error('Failed to save voting records to localStorage:', localStorageError);
    }
  }
}

/**
 * Load all voting records from IndexedDB
 */
export async function loadVotingRecords(): Promise<Map<string, VotingRecord>> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_VOTING_RECORDS], 'readonly');
    const store = transaction.objectStore(STORE_VOTING_RECORDS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const records = new Map<string, VotingRecord>();
        (request.result as VotingRecord[]).forEach((record) => {
          records.set(record.mpId, record);
        });

        db.close();

        // Fallback to localStorage if empty
        if (records.size === 0) {
          const localStorageData = localStorage.getItem('chancellor-voting-records');
          if (localStorageData) {
            try {
              const recordArray = JSON.parse(localStorageData) as VotingRecord[];
              recordArray.forEach((record) => records.set(record.mpId, record));
            } catch (err) {
              console.error('Failed to parse voting records from localStorage:', err);
            }
          }
        }

        resolve(records);
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to load voting records from IndexedDB:', error);
    // Fallback to localStorage
    const localStorageData = localStorage.getItem('chancellor-voting-records');
    if (localStorageData) {
      try {
        const recordArray = JSON.parse(localStorageData) as VotingRecord[];
        const records = new Map<string, VotingRecord>();
        recordArray.forEach((record) => records.set(record.mpId, record));
        return records;
      } catch (localStorageError) {
        console.error('Failed to load voting records from localStorage:', localStorageError);
      }
    }
    return new Map();
  }
}

/**
 * Record a budget vote for an MP
 */
export async function recordBudgetVote(
  mpId: string,
  budgetId: string,
  month: number,
  choice: 'aye' | 'noe' | 'abstain',
  reasoning: string,
  coerced?: boolean
): Promise<void> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_VOTING_RECORDS], 'readwrite');
    const store = transaction.objectStore(STORE_VOTING_RECORDS);

    return new Promise<void>((resolve, reject) => {
      // Try to get existing record
      const getRequest = store.get(mpId);

      getRequest.onsuccess = () => {
        let record: VotingRecord = getRequest.result;

        if (!record) {
          // Create new record
          record = {
            mpId,
            budgetVotes: [],
            rebellionCount: 0,
            loyaltyScore: 100,
          };
        }

        // Add new vote
        record.budgetVotes.push({
          budgetId,
          month,
          choice,
          reasoning,
          coerced,
        });

        // Update rebellion count (if Labour MP voted against)
        // Note: We'd need MP party info here, but for simplicity we'll rely on external calculation

        // Update loyalty score (simple: 100 - rebellionCount * 2)
        record.loyaltyScore = Math.max(0, 100 - record.rebellionCount * 2);

        // Save updated record
        const putRequest = store.put(record);
        putRequest.onsuccess = () => {
          db.close();
          resolve();
        };
        putRequest.onerror = () => {
          db.close();
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    });
  } catch (error) {
    console.error('Failed to record budget vote to IndexedDB:', error);
    throw error;
  }
}

/**
 * Batch record multiple budget votes (for performance)
 */
export async function batchRecordBudgetVotes(
  votes: Array<{
    mpId: string;
    budgetId: string;
    month: number;
    choice: 'aye' | 'noe' | 'abstain';
    reasoning: string;
    coerced?: boolean;
  }>
): Promise<void> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_VOTING_RECORDS], 'readwrite');
    const store = transaction.objectStore(STORE_VOTING_RECORDS);

    const promises: Promise<void>[] = votes.map((vote) => {
      return new Promise<void>((resolve, reject) => {
        const getRequest = store.get(vote.mpId);

        getRequest.onsuccess = () => {
          let record: VotingRecord = getRequest.result;

          if (!record) {
            record = {
              mpId: vote.mpId,
              budgetVotes: [],
              rebellionCount: 0,
              loyaltyScore: 100,
            };
          }

          record.budgetVotes.push({
            budgetId: vote.budgetId,
            month: vote.month,
            choice: vote.choice,
            reasoning: vote.reasoning,
            coerced: vote.coerced,
          });

          // Keep only last 20 votes for performance
          if (record.budgetVotes.length > 20) {
            record.budgetVotes = record.budgetVotes.slice(-20);
          }

          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
      });
    });

    await Promise.all(promises);
    db.close();
  } catch (error) {
    console.error('Failed to batch record budget votes to IndexedDB:', error);
    throw error;
  }
}

// ===========================
// Promise Operations
// ===========================

/**
 * Save all promises
 */
export async function savePromises(promises: Map<string, MPPromise>): Promise<void> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_PROMISES], 'readwrite');
    const store = transaction.objectStore(STORE_PROMISES);

    // Clear existing promises
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add all promises
    const promiseOps: Promise<void>[] = [];
    promises.forEach((promise) => {
      promiseOps.push(
        new Promise<void>((resolve, reject) => {
          const request = store.add(promise);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
      );
    });

    await Promise.all(promiseOps);
    db.close();
  } catch (error) {
    console.error('Failed to save promises to IndexedDB:', error);
    // Fallback to localStorage
    try {
      const promiseArray = Array.from(promises.values());
      localStorage.setItem('chancellor-promises', JSON.stringify(promiseArray));
    } catch (localStorageError) {
      console.error('Failed to save promises to localStorage:', localStorageError);
    }
  }
}

/**
 * Load all promises from IndexedDB
 */
export async function loadPromises(): Promise<Map<string, MPPromise>> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_PROMISES], 'readonly');
    const store = transaction.objectStore(STORE_PROMISES);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const promises = new Map<string, MPPromise>();
        (request.result as MPPromise[]).forEach((promise) => {
          promises.set(promise.id, promise);
        });

        db.close();

        // Fallback to localStorage if empty
        if (promises.size === 0) {
          const localStorageData = localStorage.getItem('chancellor-promises');
          if (localStorageData) {
            try {
              const promiseArray = JSON.parse(localStorageData) as MPPromise[];
              promiseArray.forEach((promise) => promises.set(promise.id, promise));
            } catch (err) {
              console.error('Failed to parse promises from localStorage:', err);
            }
          }
        }

        resolve(promises);
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to load promises from IndexedDB:', error);
    // Fallback to localStorage
    const localStorageData = localStorage.getItem('chancellor-promises');
    if (localStorageData) {
      try {
        const promiseArray = JSON.parse(localStorageData) as MPPromise[];
        const promises = new Map<string, MPPromise>();
        promiseArray.forEach((promise) => promises.set(promise.id, promise));
        return promises;
      } catch (localStorageError) {
        console.error('Failed to load promises from localStorage:', localStorageError);
      }
    }
    return new Map();
  }
}

/**
 * Save a single promise
 */
export async function savePromise(promise: MPPromise): Promise<void> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_PROMISES], 'readwrite');
    const store = transaction.objectStore(STORE_PROMISES);

    return new Promise<void>((resolve, reject) => {
      const request = store.add(promise);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to save promise to IndexedDB:', error);
    throw error;
  }
}

/**
 * Mark a promise as broken
 */
export async function markPromiseBroken(
  promiseId: string,
  month: number
): Promise<void> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_PROMISES], 'readwrite');
    const store = transaction.objectStore(STORE_PROMISES);

    return new Promise<void>((resolve, reject) => {
      const getRequest = store.get(promiseId);

      getRequest.onsuccess = () => {
        const promise: MPPromise = getRequest.result;

        if (promise) {
          promise.broken = true;
          promise.brokenInMonth = month;

          const putRequest = store.put(promise);
          putRequest.onsuccess = () => {
            db.close();
            resolve();
          };
          putRequest.onerror = () => {
            db.close();
            reject(putRequest.error);
          };
        } else {
          db.close();
          reject(new Error('Promise not found'));
        }
      };

      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    });
  } catch (error) {
    console.error('Failed to mark promise as broken in IndexedDB:', error);
    throw error;
  }
}

/**
 * Mark a promise as fulfilled
 */
export async function markPromiseFulfilled(promiseId: string): Promise<void> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_PROMISES], 'readwrite');
    const store = transaction.objectStore(STORE_PROMISES);

    return new Promise<void>((resolve, reject) => {
      const getRequest = store.get(promiseId);

      getRequest.onsuccess = () => {
        const promise: MPPromise = getRequest.result;

        if (promise) {
          promise.fulfilled = true;

          const putRequest = store.put(promise);
          putRequest.onsuccess = () => {
            db.close();
            resolve();
          };
          putRequest.onerror = () => {
            db.close();
            reject(putRequest.error);
          };
        } else {
          db.close();
          reject(new Error('Promise not found'));
        }
      };

      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    });
  } catch (error) {
    console.error('Failed to mark promise as fulfilled in IndexedDB:', error);
    throw error;
  }
}

/**
 * Get all broken promises
 */
export async function getBrokenPromises(): Promise<MPPromise[]> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction([STORE_PROMISES], 'readonly');
    const store = transaction.objectStore(STORE_PROMISES);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        // Filter for broken promises manually
        const allPromises = request.result as MPPromise[];
        const brokenPromises = allPromises.filter(p => p.broken === true);
        db.close();
        resolve(brokenPromises);
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to get broken promises from IndexedDB:', error);
    return [];
  }
}

// ===========================
// Utility Functions
// ===========================

/**
 * Clear all MP data (for testing or reset)
 */
export async function clearAllMPData(): Promise<void> {
  try {
    const db = await initMPDatabase();
    const transaction = db.transaction(
      [STORE_MPS, STORE_VOTING_RECORDS, STORE_PROMISES],
      'readwrite'
    );

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORE_MPS).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORE_VOTING_RECORDS).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORE_PROMISES).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
    ]);

    db.close();

    // Also clear localStorage fallback
    localStorage.removeItem('chancellor-mps');
    localStorage.removeItem('chancellor-voting-records');
    localStorage.removeItem('chancellor-promises');
  } catch (error) {
    console.error('Failed to clear MP data:', error);
    throw error;
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return !!window.indexedDB;
}

/**
 * Estimate storage usage (rough approximation)
 */
export async function estimateStorageUsage(): Promise<{ used: number; total: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      total: estimate.quota || 0,
    };
  }
  return { used: 0, total: 0 };
}
