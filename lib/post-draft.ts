// The post being written on /create, kept in this browser so it survives a reload or a
// detour through sign-in. Text goes to localStorage; the cover image to IndexedDB, which
// stores files as they are. Storage can be unavailable (private windows, blocked site
// data), so every call fails quietly.

export interface SavedPostText {
  title: string;
  subtitle: string;
  content: string;
  contentHtml: string;
  minRead: number;
  topic: string;
}

const TEXT_KEY = "the-web-room:create-draft";
const DB_NAME = "the-web-room";
const STORE = "drafts";
const IMAGE_KEY = "create-image";

export function savePostText(text: SavedPostText) {
  try {
    localStorage.setItem(TEXT_KEY, JSON.stringify(text));
  } catch {}
}

export function loadPostText(): Partial<SavedPostText> | null {
  try {
    const raw = localStorage.getItem(TEXT_KEY);
    return raw ? (JSON.parse(raw) as Partial<SavedPostText>) : null;
  } catch {
    return null;
  }
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest) {
  return new Promise<T | undefined>((resolve) => {
    try {
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(STORE);
      open.onerror = () => resolve(undefined);
      open.onsuccess = () => {
        const db = open.result;
        const request = run(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => resolve(undefined);
        request.transaction?.addEventListener("complete", () => db.close());
      };
    } catch {
      resolve(undefined);
    }
  });
}

export async function savePostImage(image: File | undefined) {
  await withStore("readwrite", (store) =>
    image ? store.put(image, IMAGE_KEY) : store.delete(IMAGE_KEY)
  );
}

export async function loadPostImage(): Promise<File | null> {
  const image = await withStore<unknown>("readonly", (store) => store.get(IMAGE_KEY));
  return image instanceof File ? image : null;
}

export async function clearSavedPost() {
  try {
    localStorage.removeItem(TEXT_KEY);
  } catch {}
  await savePostImage(undefined);
}
