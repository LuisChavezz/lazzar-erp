import { expect, test } from "@playwright/test";
import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";
import { safeJSONStorage, safeLocalStorage } from "@/src/stores/safeStorage";

/**
 * EC-852: el almacenamiento de los stores persistidos nunca lanza, y sin
 * almacenamiento la hidratación termina igual (estado en memoria).
 */

type Globals = { window?: unknown };
const globals = globalThis as unknown as Globals;

const fail = () => {
  throw new DOMException("cuota", "QuotaExceededError");
};

type Mode = "ok" | "write-fails" | "blocked";

/** Instala un `window.localStorage` falso mientras corre `run`. */
const withLocalStorage = <T>(mode: Mode, data: Map<string, string>, run: () => T): T => {
  const previous = globals.window;
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: mode === "ok" ? (key: string, value: string) => void data.set(key, value) : fail,
    removeItem: mode === "ok" ? (key: string) => void data.delete(key) : fail,
  };
  globals.window =
    mode === "blocked"
      ? Object.defineProperty({}, "localStorage", { get: fail })
      : { localStorage: storage };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    return run();
  } finally {
    console.warn = originalWarn;
    globals.window = previous;
  }
};

test.describe("safeLocalStorage", () => {
  test("lee, escribe y borra cuando el almacenamiento funciona", () => {
    const data = new Map<string, string>();
    withLocalStorage("ok", data, () => {
      safeLocalStorage.setItem("k", "v");
      expect(safeLocalStorage.getItem("k")).toBe("v");
      safeLocalStorage.removeItem("k");
      expect(safeLocalStorage.getItem("k")).toBeNull();
    });
  });

  test("no lanza si escribir o borrar falla", () => {
    const data = new Map([["k", "guardado"]]);
    withLocalStorage("write-fails", data, () => {
      expect(() => safeLocalStorage.setItem("k", "nuevo")).not.toThrow();
      expect(() => safeLocalStorage.removeItem("k")).not.toThrow();
      expect(safeLocalStorage.getItem("k")).toBe("guardado");
    });
  });

  test("con el acceso a localStorage bloqueado lee null y no lanza", () => {
    withLocalStorage("blocked", new Map(), () => {
      expect(safeLocalStorage.getItem("k")).toBeNull();
      expect(() => safeLocalStorage.setItem("k", "v")).not.toThrow();
      expect(() => safeLocalStorage.removeItem("k")).not.toThrow();
    });
  });
});

test.describe("persist con safeJSONStorage", () => {
  type State = { value: number; hydrated: boolean; bump: () => void; markHydrated: () => void };

  /** Un store como los de la app: marca `hydrated` desde `onRehydrateStorage`. */
  const makeStore = () =>
    createStore<State>()(
      persist(
        (set) => ({
          value: 0,
          hydrated: false,
          bump: () => set((s) => ({ value: s.value + 1 })),
          markHydrated: () => set({ hydrated: true }),
        }),
        {
          name: "prueba-storage",
          storage: safeJSONStorage(),
          partialize: ({ value }) => ({ value }),
          onRehydrateStorage: () => (state, error) => {
            if (!error) state?.markHydrated();
          },
        }
      )
    );

  for (const mode of ["write-fails", "blocked"] as const) {
    test(`${mode}: hidrata, marca hydrated y los set siguen en memoria`, () => {
      withLocalStorage(mode, new Map(), () => {
        const store = makeStore();
        expect(store.getState().hydrated).toBe(true);
        expect(() => store.getState().bump()).not.toThrow();
        expect(store.getState().value).toBe(1);
      });
    });
  }

  test("con almacenamiento sano carga lo guardado y persiste los cambios", () => {
    const data = new Map([["prueba-storage", JSON.stringify({ state: { value: 5 }, version: 0 })]]);
    withLocalStorage("ok", data, () => {
      const store = makeStore();
      expect(store.getState()).toMatchObject({ value: 5, hydrated: true });
      store.getState().bump();
      expect(JSON.parse(data.get("prueba-storage")!)).toEqual({ state: { value: 6 }, version: 0 });
    });
  });

  test("sin window (servidor) no persiste ni hidrata, como el localStorage por defecto", () => {
    const store = makeStore();
    expect(store.getState().hydrated).toBe(false);
  });
});
