/**
 * `window` mínimo para probar stores persistidos de zustand sin navegador: un
 * `localStorage` en memoria y el evento `storage` disparado a mano (como lo
 * haría el navegador en las DEMÁS pestañas). Se importa ANTES que los stores:
 * `persist` hidrata al crearse.
 */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

export const storage = new MemoryStorage();
export const storageListeners: Array<(event: { key: string | null; storageArea: unknown }) => void> = [];
/** Otra pestaña escribe `key`: el navegador avisa a esta con el evento `storage`. */
export const writeFromOtherTab = (key: string, value: unknown) => {
  storage.setItem(key, JSON.stringify(value));
  storageListeners.forEach((listener) => listener({ key, storageArea: storage }));
};
export const stored = (key: string) => JSON.parse(storage.getItem(key) ?? "null");


// Lo que dejaba la v2 del workspace: un `branchSwitching: true` guardado por una
// recarga dentro de los 1800 ms del cambio de sucursal.
storage.setItem(
  "workspace-storage",
  JSON.stringify({
    state: {
      selectedBranch: { id: 1, codigo: "S-1", nombre: "Sucursal 1" },
      companyLabel: null,
      branchSwitching: true,
      hasHydrated: true,
    },
    version: 2,
  })
);
(globalThis as unknown as { window: unknown }).window = {
  localStorage: storage,
  addEventListener: (type: string, listener: (typeof storageListeners)[number]) => {
    if (type === "storage") storageListeners.push(listener);
  },
};
