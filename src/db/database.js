const DB_NAME = 'irrigation-scheduler';
const DB_VERSION = 5;

const REQUIRED_STORES = ['programs', 'zones', 'schedules', 'settings', 'media', 'saves', 'valves'];

let dbInstance = null;
let openPromise = null;
let openGeneration = 0;

function hasRequiredStores(db) {
  return REQUIRED_STORES.every(name => db.objectStoreNames.contains(name));
}

function zoneNumberFromRow(zone) {
  if (Number.isFinite(zone?.zone_number)) return zone.zone_number;
  const match = (zone.name ?? '').match(/^(?:Zone|Valve) (\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function migrateZonesToValves(tx) {
  const zonesStore = tx.objectStore('zones');
  const valvesStore = tx.objectStore('valves');
  const request = zonesStore.getAll();

  request.onsuccess = () => {
    const zones = request.result ?? [];
    const valveIdByNumber = new Map();

    for (const zone of zones) {
      if (zone.valve_id) continue;

      const num = zoneNumberFromRow(zone);
      if (num == null) continue;

      let valveId = valveIdByNumber.get(num);
      if (!valveId) {
        valveId = crypto.randomUUID();
        valvesStore.add({
          id: valveId,
          zone_number: num,
          name: zone.name ?? `Valve ${num}`,
          color: zone.color ?? 'emerald',
          profile_image_id: zone.profile_image_id ?? null,
          created_at: zone.created_at ?? new Date().toISOString(),
          updated_at: zone.updated_at ?? new Date().toISOString(),
        });
        valveIdByNumber.set(num, valveId);
      }

      zonesStore.put({
        id: zone.id,
        program_id: zone.program_id,
        valve_id: valveId,
        status: zone.status ?? 'active',
        created_at: zone.created_at,
        updated_at: zone.updated_at,
      });
    }
  };
}

function createMissingStores(db, oldVersion = 0, tx = null) {
  if (!db.objectStoreNames.contains('programs')) {
    db.createObjectStore('programs', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('zones')) {
    const zones = db.createObjectStore('zones', { keyPath: 'id' });
    zones.createIndex('program_id', 'program_id', { unique: false });
    zones.createIndex('valve_id', 'valve_id', { unique: false });
  } else if (tx) {
    const zones = tx.objectStore('zones');
    if (!zones.indexNames.contains('valve_id')) {
      zones.createIndex('valve_id', 'valve_id', { unique: false });
    }
  }
  if (!db.objectStoreNames.contains('valves')) {
    const valves = db.createObjectStore('valves', { keyPath: 'id' });
    valves.createIndex('zone_number', 'zone_number', { unique: true });
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
  if (!db.objectStoreNames.contains('saves')) {
    db.createObjectStore('saves', { keyPath: 'id' });
  }

  if (oldVersion > 0 && oldVersion < 5 && tx && db.objectStoreNames.contains('zones') && db.objectStoreNames.contains('valves')) {
    migrateZonesToValves(tx);
  }
}

export function openDB() {
  if (dbInstance && hasRequiredStores(dbInstance)) {
    return Promise.resolve(dbInstance);
  }
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  if (openPromise) return openPromise;

  const generation = openGeneration;
  openPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      createMissingStores(event.target.result, event.oldVersion, event.target.transaction);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      if (generation !== openGeneration) {
        db.close();
        return;
      }

      if (!hasRequiredStores(db)) {
        const nextVersion = db.version + 1;
        db.close();
        dbInstance = null;
        openPromise = null;
        const retry = indexedDB.open(DB_NAME, nextVersion);
        retry.onupgradeneeded = (upgrade) => createMissingStores(upgrade.target.result, upgrade.oldVersion, upgrade.target.transaction);
        retry.onsuccess = (retryEvent) => {
          const upgraded = retryEvent.target.result;
          upgraded.onversionchange = () => {
            upgraded.close();
            if (dbInstance === upgraded) dbInstance = null;
          };
          dbInstance = upgraded;
          openPromise = null;
          resolve(upgraded);
        };
        retry.onerror = () => reject(retry.error);
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

    request.onblocked = () => {
      resetDBInstance();
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
