import { openDB } from './database';

export const mediaRepository = {
  async getById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('media', 'readonly').objectStore('media').get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('media', 'readonly').objectStore('media').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveForOwner(ownerType, ownerId, blob, mimeType, existingId = null) {
    const db = await openDB();
    const id = existingId || crypto.randomUUID();
    const record = {
      id,
      owner_type: ownerType,
      owner_id: ownerId,
      blob,
      mime_type: mimeType,
      size_bytes: blob.size,
      updated_at: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const request = db.transaction('media', 'readwrite').objectStore('media').put(record);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteById(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('media', 'readwrite').objectStore('media').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async putRaw(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('media', 'readwrite').objectStore('media').put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction('media', 'readwrite').objectStore('media').clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};
