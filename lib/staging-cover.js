// Staging area pra capa do post quando usuário vem via "Postar" do histórico.
// Resolve dois problemas:
//   1. Blob URLs (Free user, IndexedDB local) morrem ao navegar entre páginas.
//   2. Signed URLs (Pro user, Supabase Storage privado) bloqueiam fetch CORS.
// Solução: salva o Blob num IndexedDB compartilhado com chave única (uuid),
// navega com ?staging=<uuid>, a página destino consome (lê + deleta) o Blob.

const DB_NAME = 'innova-staging';
const STORE = 'covers';
const DB_VERSION = 1;
const TTL_MS = 10 * 60 * 1000; // 10min — limpa órfãos antigos

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function stageCover(blob) {
  if (!(blob instanceof Blob)) throw new Error('stageCover: precisa de Blob');
  const id = uuid();
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ id, blob, createdAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  cleanupOld(db).catch(() => {});
  return id;
}

export async function consumeStagedCover(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const row = getReq.result;
      if (row) store.delete(id);
      resolve(row?.blob || null);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

async function cleanupOld(db) {
  const now = Date.now();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cur = cursorReq.result;
      if (!cur) return resolve();
      if (now - (cur.value.createdAt || 0) > TTL_MS) cur.delete();
      cur.continue();
    };
    cursorReq.onerror = () => resolve();
  });
}
