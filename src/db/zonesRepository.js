import { openDB } from './database';

export const zonesRepository = {
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('zones', 'readonly').objectStore('zones').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getByProgramId(programId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction('zones', 'readonly').objectStore('zones');
      const request = store.index('program_id').getAll(programId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('zones', 'readonly').objectStore('zones').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async create(data) {
    const db = await openDB();
    const now = new Date().toISOString();
    const zone = { ...data, id: crypto.randomUUID(), created_at: now, updated_at: now };
    return new Promise((resolve, reject) => {
      const request = db.transaction('zones', 'readwrite').objectStore('zones').add(zone);
      request.onsuccess = () => resolve(zone);
      request.onerror = () => reject(request.error);
    });
  },

  async update(id, data) {
    const db = await openDB();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Zone not found');
    const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
    return new Promise((resolve, reject) => {
      const request = db.transaction('zones', 'readwrite').objectStore('zones').put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('zones', 'readwrite').objectStore('zones').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async putRaw(zone) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('zones', 'readwrite').objectStore('zones').put(zone);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('zones', 'readwrite').objectStore('zones').clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};
