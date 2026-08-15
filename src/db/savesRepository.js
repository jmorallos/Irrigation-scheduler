import { openDB } from './database';

export const savesRepository = {
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('saves', 'readonly').objectStore('saves').getAll();
      request.onsuccess = () => {
        const rows = request.result ?? [];
        rows.sort((a, b) => (b.saved_at ?? '').localeCompare(a.saved_at ?? ''));
        resolve(rows);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('saves', 'readonly').objectStore('saves').get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  },

  async create(data) {
    const db = await openDB();
    const record = {
      ...data,
      id: crypto.randomUUID(),
      saved_at: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const request = db.transaction('saves', 'readwrite').objectStore('saves').add(record);
      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  },

  async delete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('saves', 'readwrite').objectStore('saves').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async putRaw(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('saves', 'readwrite').objectStore('saves').put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('saves', 'readwrite').objectStore('saves').clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};
