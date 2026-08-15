const DB_NAME = 'irrigation-scheduler';
const DB_VERSION = 2;

let dbInstance = null;
let openPromise = null;
let openGeneration = 0;

export function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (openPromise) return openPromise;

  const generation = openGeneration;
  openPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('programs')) {
        db.createObjectStore('programs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('zones')) {
        const zones = db.createObjectStore('zones', { keyPath: 'id' });
        zones.createIndex('program_id', 'program_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('schedules')) {
        const schedules = db.createObjectStore('schedules', { keyPath: 'id' });
        schedules.createIndex('zone_id', 'zone_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('media')) {
        const media = db.createObjectStore('media', { keyPath: 'id' });
        media.createIndex('owner_id', 'owner_id', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      if (generation !== openGeneration) {
        db.close();
        return;
      }

      db.onversionchange = () => {
        db.close();
        if (dbInstance === db) dbInstance = null;
      };

      dbInstance = db;
      openPromise = null;
      resolve(db);
    };

    request.onerror = () => {
      openPromise = null;
      reject(request.error);
    };
  });

  return openPromise;
}

export function resetDBInstance() {
  openGeneration += 1;
  openPromise = null;
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function deleteDatabase() {
  resetDBInstance();

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);

    const timeout = setTimeout(() => {
      reject(new Error('Could not clear data — close other tabs using this app and try again.'));
    }, 4000);

    request.onsuccess = () => {
      clearTimeout(timeout);
      resolve();
    };
    request.onerror = () => {
      clearTimeout(timeout);
      reject(request.error);
    };
    request.onblocked = () => {
      resetDBInstance();
    };
  });
}
