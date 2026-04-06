import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface PhotoRecord {
  id: string; // Unique code
  type: 'photo' | 'video';
  dataUrl?: string; // Base64 image data
  blob?: Blob; // For video
  timestamp: number;
  user: string;
  zone: string;
  latitude: number;
  longitude: number;
  address: string;
  synced: boolean;
}

interface LogisticaDB extends DBSchema {
  photos: {
    key: string;
    value: PhotoRecord;
    indexes: { 'by-sync': boolean };
  };
}

let dbPromise: Promise<IDBPDatabase<LogisticaDB>>;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<LogisticaDB>('logistica-db', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('photos', { keyPath: 'id' });
          store.createIndex('by-sync', 'synced');
        }
      },
    });
  }
  return dbPromise;
}

export async function savePhoto(photo: PhotoRecord) {
  const db = await initDB();
  await db.put('photos', photo);
}

export async function getPhotos() {
  const db = await initDB();
  return db.getAll('photos');
}

export async function getUnsyncedPhotos() {
  const db = await initDB();
  return db.getAllFromIndex('photos', 'by-sync', false);
}

export async function markPhotoSynced(id: string) {
  const db = await initDB();
  const photo = await db.get('photos', id);
  if (photo) {
    photo.synced = true;
    await db.put('photos', photo);
  }
}

export async function deletePhoto(id: string) {
  const db = await initDB();
  await db.delete('photos', id);
}
