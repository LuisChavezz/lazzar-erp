import { createJSONStorage, type StateStorage } from "zustand/middleware";

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
 * devuelve `null` (la hidratación termina con el estado inicial), y
 * `setItem`/`removeItem` no hacen nada. El estado vive en memoria como
 * siempre; solo deja de sobrevivir a la recarga.
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
      getLocalStorage().setItem(name, value);
    } catch (error) {
      warnOnce("setItem", name, error);
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
 * La opción `storage` de `persist` para los stores de la app. En el servidor
 * (sin `window`) el getter lanza y `createJSONStorage` devuelve `undefined`,
 * igual que el `localStorage` por defecto de zustand: el store del servidor
 * no hidrata ni persiste, como hasta ahora.
 */
export const safeJSONStorage = <S>() =>
  createJSONStorage<S>(() => {
    if (typeof window === "undefined") throw new Error("Sin window");
    return safeLocalStorage;
  });
