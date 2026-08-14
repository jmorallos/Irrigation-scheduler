const DB_NAME = 'irrigation-scheduler';
const DB_VERSION = 2;

let dbInstance = null;

export function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
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
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

export function resetDBInstance() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function deleteDatabase() {
  resetDBInstance();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Could not clear data — close other tabs using this app and try again."));
  });
}
