import { openDB } from './database';

export const valvesRepository = {
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('valves', 'readonly').objectStore('valves').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('valves', 'readonly').objectStore('valves').get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  },

  async getByNumber(zoneNumber) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('valves', 'readonly').objectStore('valves');
      const request = store.index('zone_number').get(Number(zoneNumber));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  },

  async create(data) {
    const db = await openDB();
    const now = new Date().toISOString();
    const valve = {
      ...data,
      id: crypto.randomUUID(),
      profile_image_id: data.profile_image_id ?? null,
      created_at: now,
      updated_at: now,
    };
    return new Promise((resolve, reject) => {
      const request = db.transaction('valves', 'readwrite').objectStore('valves').add(valve);
      request.onsuccess = () => resolve(valve);
      request.onerror = () => reject(request.error);
    });
  },

  async update(id, data) {
    const db = await openDB();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Valve not found.');
    const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
    return new Promise((resolve, reject) => {
      const request = db.transaction('valves', 'readwrite').objectStore('valves').put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('valves', 'readwrite').objectStore('valves').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async putRaw(valve) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('valves', 'readwrite').objectStore('valves').put(valve);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('valves', 'readwrite').objectStore('valves').clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};
