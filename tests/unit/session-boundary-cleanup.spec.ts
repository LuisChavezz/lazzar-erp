import { expect, test } from "@playwright/test";
import {
  clearWorkspaceCookie,
  setWorkspaceCookie,
} from "@/src/features/workspace/utils/workspaceCookie";
import {
  clearUserScopedClientState,
  LEGACY_SAT_STORAGE_KEY,
  signOutToLogin,
} from "@/src/features/auth/utils/clientSessionState";

/**
 * EC-848: piezas de la limpieza en los límites de sesión.
 *
 * - La cookie `erp_workspace_id` solo se borra si el borrado lleva el mismo
 *   nombre y `path` (y los mismos `Secure`/`SameSite`) que la escritura.
 * - `signOutToLogin` navega a login aunque `signOut` falle.
 * - EC-860: la limpieza borra la `sat-storage` que dejó la Dirección fiscal
 *   cuando solo vivía en el navegador, sin lanzar si el almacenamiento falla.
 */

type Globals = { document?: unknown; window?: unknown; fetch?: unknown };
const globals = globalThis as unknown as Globals;

/** Divide `a=b; path=/; Secure` en nombre, valor y atributos normalizados. */
const parseCookieWrite = (write: string) => {
  const [pair, ...attrs] = write.split(";").map((part) => part.trim());
  const [name, value] = pair.split("=");
  const attributes = new Map(
    attrs.map((attr) => {
      const [key, attrValue = ""] = attr.split("=");
      return [key.toLowerCase(), attrValue] as const;
    })
  );
  return { name, value, attributes };
};

/** Captura lo que se escribe en `document.cookie`. */
const captureCookieWrites = () => {
  const writes: string[] = [];
  const previous = globals.document;
  globals.document = {
    set cookie(value: string) {
      writes.push(value);
    },
  };
  return { writes, restore: () => (globals.document = previous) };
};

test.describe("cookie de workspace", () => {
  test("escribirla y borrarla usan el mismo nombre, path, Secure y SameSite", () => {
    const { writes, restore } = captureCookieWrites();
    try {
      setWorkspaceCookie();
      clearWorkspaceCookie();
    } finally {
      restore();
    }
    const [set, clear] = writes.map(parseCookieWrite);
    expect(clear.name).toBe(set.name);
    const withoutLifetime = (attributes: Map<string, string>) =>
      [...attributes].filter(([key]) => key !== "max-age" && key !== "expires").sort();
    expect(withoutLifetime(clear.attributes)).toEqual(withoutLifetime(set.attributes));
    expect(set.attributes.get("path")).toBe("/");
  });

  test("escribirla la deja vigente y borrarla la caduca de inmediato", () => {
    const { writes, restore } = captureCookieWrites();
    try {
      setWorkspaceCookie();
      clearWorkspaceCookie();
    } finally {
      restore();
    }
    const [set, clear] = writes.map(parseCookieWrite);
    expect(set.value).toBe("true");
    expect(Number(set.attributes.get("max-age"))).toBeGreaterThan(0);
    expect(clear.value).toBe("");
    expect(clear.attributes.get("max-age")).toBe("0");
  });
});

test.describe("signOutToLogin", () => {
  test("si signOut falla (red caída), redirige a login a mano", async () => {
    const previousWindow = globals.window;
    const previousFetch = globals.fetch;
    const location = { href: "http://localhost:3000/sales" };
    globals.window = { location };
    // `signOut` pide el token CSRF y luego hace POST a /signout: ambos fallan.
    globals.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    // El logger de next-auth reporta el CLIENT_FETCH_ERROR esperado: silenciado.
    const previousConsoleError = console.error;
    console.error = () => {};
    try {
      await signOutToLogin();
    } finally {
      globals.window = previousWindow;
      globals.fetch = previousFetch;
      console.error = previousConsoleError;
    }
    expect(location.href).toBe("/auth/login");
  });
});

test.describe("clearUserScopedClientState y sat-storage (EC-860)", () => {
  /** Instala un `window` con el `localStorage` dado mientras corre `run`. */
  const withWindow = (localStorage: unknown, run: () => void) => {
    const previousWindow = globals.window;
    globals.window = { localStorage };
    try {
      run();
    } finally {
      globals.window = previousWindow;
    }
  };

  test("borra la clave sat-storage y deja las preferencias del navegador", () => {
    const items = new Map<string, string>([
      [LEGACY_SAT_STORAGE_KEY, '{"state":{"addressesByCompany":{}},"version":1}'],
      ["theme-storage", '{"state":{"theme":"dark"}}'],
    ]);
    const localStorage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    };
    withWindow(localStorage, () => clearUserScopedClientState());
    expect(LEGACY_SAT_STORAGE_KEY).toBe("sat-storage");
    expect(items.has("sat-storage")).toBe(false);
    expect(items.get("theme-storage")).toBe('{"state":{"theme":"dark"}}');
  });

  test("no lanza si el almacenamiento está bloqueado", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(() => withWindow(blocked, () => clearUserScopedClientState())).not.toThrow();
  });
});
