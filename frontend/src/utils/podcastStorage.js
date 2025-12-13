const DB_NAME = "podcast-store";
const STORE_NAME = "episodes";
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
};

export const savePodcastBlob = async (id, title, blob) => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    tx.objectStore(STORE_NAME).put({ title, blob }, String(id));
  }).finally(() => db.close());
};

export const getPodcastBlob = async (id) => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    tx.onerror = () => reject(tx.error);

    const req = tx.objectStore(STORE_NAME).get(String(id));
    req.onsuccess = () => {
      const record = req.result;
      resolve(record?.blob || null);
    };
  }).finally(() => db.close());
};

export const listStoredPodcastIds = async () => {
  const entries = await listStoredPodcasts();
  return entries.map((item) => item.id);
};

export const listStoredPodcasts = async () => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const result = [];

    tx.onerror = () => reject(tx.error);

    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        result.push({
          id: cursor.key,
          title: cursor.value?.title || `Offline Podcast ${result.length + 1}`,
        });
        cursor.continue();
      } else {
        resolve(result);
      }
    };
  }).finally(() => db.close());
};
