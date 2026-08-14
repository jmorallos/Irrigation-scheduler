import { openDB } from './database';

export const schedulesRepository = {
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('schedules', 'readonly').objectStore('schedules').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getByZoneId(zoneId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('schedules', 'readonly').objectStore('schedules');
      const request = store.index('zone_id').getAll(zoneId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('schedules', 'readonly').objectStore('schedules').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async create(data) {
    const db = await openDB();
    const now = new Date().toISOString();
    const schedule = { ...data, id: crypto.randomUUID(), created_at: now, updated_at: now };
    return new Promise((resolve, reject) => {
      const request = db.transaction('schedules', 'readwrite').objectStore('schedules').add(schedule);
      request.onsuccess = () => resolve(schedule);
      request.onerror = () => reject(request.error);
    });
  },

  async update(id, data) {
    const db = await openDB();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Schedule not found');
    const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
    return new Promise((resolve, reject) => {
      const request = db.transaction('schedules', 'readwrite').objectStore('schedules').put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('schedules', 'readwrite').objectStore('schedules').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async putRaw(schedule) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('schedules', 'readwrite').objectStore('schedules').put(schedule);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('schedules', 'readwrite').objectStore('schedules').clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};
