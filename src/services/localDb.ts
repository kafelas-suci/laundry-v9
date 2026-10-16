import { openDB } from 'idb';

const DB_NAME = 'KafelaLocalDB';
const STORE_NAME = 'media';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export const saveMedia = async (key: string, data: Blob | string) => {
  const db = await dbPromise;
  await db.put(STORE_NAME, data, key);
};

export const getMedia = async (key: string): Promise<Blob | string | undefined> => {
  const db = await dbPromise;
  return await db.get(STORE_NAME, key);
};

export const deleteMedia = async (key: string) => {
  const db = await dbPromise;
  await db.delete(STORE_NAME, key);
};
