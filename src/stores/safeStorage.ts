import type { PersistStorage, StateStorage, StorageValue } from "zustand/middleware";

/**
 * Almacenamiento de los stores persistidos de zustand que NUNCA lanza (EC-852).
 *
 * `persist` de zustand no atrapa los errores del almacenamiento: con la cuota
 * llena o los datos del sitio bloqueados, `localStorage.setItem` lanza dentro
 * del `set` del store, y si ese `set` corre en un efecto de React la excepción
 * desmonta la página entera (`useThemeStore.hydrate()` al montar
 * `RadixThemeWrapper` tumbaba todas las rutas de (Main)). Con el sitio
 * bloqueado puede lanzar incluso el acceso a `window.localStorage` o
 * `getItem`, y entonces zustand no termina de hidratar: `onRehydrateStorage`
 * no llega a correr y `hasHydrated` del workspace se queda en `false`.
 *
 * Aquí cada operación se intenta y, si falla, se avisa en consola (una vez por
 * operación y clave) y sigue como si no hubiera nada guardado: `getItem`
 * devuelve `null` (la hidratación termina con el estado inicial). Una
 * escritura que falla BORRA la clave (`removeItem` no necesita cuota): con la
 * cuota llena el almacenamiento sigue legible, y sin borrarla la siguiente
 * carga hidrataría el valor VIEJO —p. ej. la sucursal anterior, o el
 * workspace del usuario que cerró sesión, porque `clearWorkspace()` también
 * escribe— en vez de empezar del estado inicial. El estado vive en memoria
 * como siempre; solo deja de sobrevivir a la recarga.
 */

const warned = new Set<string>();

const warnOnce = (operation: string, name: string, error: unknown) => {
  const id = `${operation}:${name}`;
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(
    `[storage] ${operation}("${name}") falló en localStorage; el estado sigue solo en memoria.`,
    error
  );
};

/** `window.localStorage`, que puede lanzar al ACCEDER si el sitio está bloqueado. */
const getLocalStorage = (): Storage => window.localStorage;

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return getLocalStorage().getItem(name);
    } catch (error) {
      warnOnce("getItem", name, error);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      const storage = getLocalStorage();
      // `persist` escribe el estado persistido en CADA `set`, aunque el `set`
      // solo cambie campos que `partialize` deja fuera (p. ej. `hydrate()` del
      // tema, que solo toca `resolvedTheme`). Si lo guardado ya es idéntico no
      // hay nada que escribir: ni evento `storage` para las otras pestañas (el
      // navegador tampoco lo manda por un valor igual) ni un intento más
      // contra una cuota llena.
      if (storage.getItem(name) === value) return;
      storage.setItem(name, value);
    } catch (error) {
      warnOnce("setItem", name, error);
      // Mejor nada guardado que un valor viejo (ver arriba).
      safeLocalStorage.removeItem(name);
    }
  },
  removeItem: (name) => {
    try {
      getLocalStorage().removeItem(name);
    } catch (error) {
      warnOnce("removeItem", name, error);
    }
  },
};

/**
 * La opción `storage` de `persist` para los stores de la app: JSON sobre
 * `safeLocalStorage`, con el mismo formato que `createJSONStorage` (claves,
 * `version`, `migrate` y `partialize` no cambian). Se serializa aquí y no con
 * `createJSONStorage` porque su `JSON.parse` lanza con un valor corrupto, y
 * zustand pasa ese error a `onRehydrateStorage` sin terminar de hidratar
 * (`hasHydrated` del workspace se quedaba en `false`). Un valor que no se
 * puede leer se trata como nada guardado y se borra.
 *
 * En el servidor (sin `window`) no hay almacenamiento (`undefined`), igual que
 * con el `localStorage` por defecto de zustand: el store del servidor no
 * hidrata ni persiste, como hasta ahora.
 */
export const safeJSONStorage = <S>(): PersistStorage<S> | undefined => {
  if (typeof window === "undefined") return undefined;
  return {
    getItem: (name) => {
      const raw = safeLocalStorage.getItem(name) as string | null;
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as StorageValue<S>;
      } catch (error) {
        warnOnce("parse", name, error);
        safeLocalStorage.removeItem(name);
        return null;
      }
    },
    setItem: (name, value) => safeLocalStorage.setItem(name, JSON.stringify(value)),
    removeItem: (name) => safeLocalStorage.removeItem(name),
  };
};
