import { openDB } from './database';

export const programsRepository = {
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('programs', 'readonly').objectStore('programs').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('programs', 'readonly').objectStore('programs').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async create(data) {
    const db = await openDB();
    const now = new Date().toISOString();
    const program = { ...data, id: crypto.randomUUID(), created_at: now, updated_at: now };
    return new Promise((resolve, reject) => {
      const request = db.transaction('programs', 'readwrite').objectStore('programs').add(program);
      request.onsuccess = () => resolve(program);
      request.onerror = () => reject(request.error);
    });
  },

  async update(id, data) {
    const db = await openDB();
    const existing = await this.getById(id);
    if (!existing) throw new Error('Program not found');
    const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
    return new Promise((resolve, reject) => {
      const request = db.transaction('programs', 'readwrite').objectStore('programs').put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('programs', 'readwrite').objectStore('programs').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async putRaw(program) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('programs', 'readwrite').objectStore('programs').put(program);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('programs', 'readwrite').objectStore('programs').clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};
