import { expect, test } from "@playwright/test";
import {
  clearWorkspaceCookie,
  setWorkspaceCookie,
} from "@/src/features/workspace/utils/workspaceCookie";
import {
  clearUserScopedClientState,
  LEGACY_SAT_STORAGE_KEY,
  SERVER_LOGOUT_PATH,
  signOutToLogin,
} from "@/src/features/auth/utils/clientSessionState";
import {
  SIGN_OUT_FALLBACK_KEY,
  SIGN_OUT_FALLBACK_MAX_ATTEMPTS,
} from "@/src/features/auth/utils/signOutFallbackGuard";

/**
 * EC-848: piezas de la limpieza en los límites de sesión.
 *
 * - La cookie `erp_workspace_id` solo se borra si el borrado lleva el mismo
 *   nombre y `path` (y los mismos `Secure`/`SameSite`) que la escritura.
 * - `signOutToLogin` cae a `/auth/logout` si `signOut` falla, se cuelga o no
 *   hay token CSRF, y deja de navegar si ese respaldo se repite en ciclo
 *   (EC-851).
 * - EC-860: la limpieza borra la `sat-storage` que dejó la Dirección fiscal
 *   cuando solo vivía en el navegador, sin lanzar si el almacenamiento falla.
 */

type Globals = {
  document?: unknown;
  window?: unknown;
  fetch?: unknown;
  sessionStorage?: unknown;
};
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

/** `sessionStorage` en memoria sobre el `Map` dado. */
const fakeSessionStorage = (storage: Map<string, string>) => ({
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
});

test.describe("signOutToLogin (EC-851)", () => {
  type FetchCall = { url: string; method: string };
  type Responder = (url: string) => Promise<unknown>;

  const jsonResponse = (status: number, body: unknown) =>
    Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });
  const htmlResponse = (status: number) =>
    Promise.resolve({
      ok: false,
      status,
      json: async () => {
        throw new SyntaxError("Unexpected token '<'");
      },
    });
  const networkError = () => Promise.reject(new TypeError("Failed to fetch"));
  const never = () => new Promise(() => {});
  const csrfOk = () => jsonResponse(200, { csrfToken: "csrf-123" });

  /**
   * Corre `signOutToLogin` con `fetch` respondiendo según la ruta de
   * `/api/auth/*` y devuelve a dónde navegó y qué peticiones hizo.
   */
  const runSignOut = async (
    responders: { csrf: Responder; signout?: Responder },
    timeoutMs?: number,
    storage: Map<string, string> = new Map(),
    // Una misma carga de página = el mismo `window`.
    page: { location: { href: string } } = { location: { href: "http://localhost:3000/sales" } }
  ) => {
    const previousWindow = globals.window;
    const previousFetch = globals.fetch;
    const previousSessionStorage = globals.sessionStorage;
    const previousConsoleError = console.error;
    const { location } = page;
    const calls: FetchCall[] = [];
    globals.window = page;
    globals.sessionStorage = fakeSessionStorage(storage);
    globals.fetch = (url: string, init?: { method?: string }) => {
      calls.push({ url, method: (init?.method ?? "get").toLowerCase() });
      if (url.endsWith("/csrf")) return responders.csrf(url);
      if (url.endsWith("/signout") && responders.signout) return responders.signout(url);
      return networkError();
    };
    // El logger de next-auth reporta los CLIENT_FETCH_ERROR esperados: silenciado.
    console.error = () => {};
    try {
      await signOutToLogin(timeoutMs);
    } finally {
      globals.window = previousWindow;
      globals.fetch = previousFetch;
      globals.sessionStorage = previousSessionStorage;
      console.error = previousConsoleError;
    }
    return { href: location.href, calls, storage };
  };

  const postedSignout = (calls: FetchCall[]) =>
    calls.some((call) => call.url.endsWith("/signout") && call.method === "post");

  test("sin fallos, navega a la URL que devuelve next-auth", async () => {
    const { href } = await runSignOut({
      csrf: csrfOk,
      signout: () => jsonResponse(200, { url: "http://localhost:3000/auth/login" }),
    });
    expect(href).toBe("http://localhost:3000/auth/login");
  });

  test("si el POST de signout da error de red, va a /auth/logout", async () => {
    const { href } = await runSignOut({ csrf: csrfOk, signout: networkError });
    expect(href).toBe(SERVER_LOGOUT_PATH);
  });

  test("si el POST de signout responde un 5xx con HTML, va a /auth/logout", async () => {
    const { href } = await runSignOut({ csrf: csrfOk, signout: () => htmlResponse(502) });
    expect(href).toBe(SERVER_LOGOUT_PATH);
  });

  test("si el POST de signout se cuelga, va a /auth/logout al vencer el tiempo", async () => {
    const { href } = await runSignOut({ csrf: csrfOk, signout: never }, 50);
    expect(href).toBe(SERVER_LOGOUT_PATH);
  });

  test("si no hay token CSRF, va a /auth/logout sin mandar el POST de next-auth", async () => {
    for (const csrf of [networkError, () => htmlResponse(500), () => jsonResponse(200, {})]) {
      const { href, calls } = await runSignOut({
        csrf,
        signout: () => jsonResponse(200, { url: "/api/auth/signout?csrf=true" }),
      });
      expect(href).toBe(SERVER_LOGOUT_PATH);
      expect(postedSignout(calls)).toBe(false);
    }
  });

  test("si pedir el token CSRF se cuelga, va a /auth/logout al vencer el tiempo", async () => {
    const { href, calls } = await runSignOut({ csrf: never }, 50);
    expect(href).toBe(SERVER_LOGOUT_PATH);
    expect(postedSignout(calls)).toBe(false);
  });

  test("el respaldo anota cada navegación; al tercer intento en la ventana ya no navega", async () => {
    const storage = new Map<string, string>();
    const hrefs: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { href } = await runSignOut({ csrf: networkError }, undefined, storage);
      hrefs.push(href);
    }
    expect(hrefs).toEqual([SERVER_LOGOUT_PATH, SERVER_LOGOUT_PATH, "http://localhost:3000/sales"]);
    const attempts = JSON.parse(storage.get(SIGN_OUT_FALLBACK_KEY) ?? "[]");
    expect(attempts).toHaveLength(SIGN_OUT_FALLBACK_MAX_ATTEMPTS);
  });

  test("dentro de la misma carga de página el respaldo anota un solo intento", async () => {
    const storage = new Map<string, string>();
    const page = { location: { href: "http://localhost:3000/sales" } };
    for (let i = 0; i < 3; i++) {
      page.location.href = "http://localhost:3000/sales";
      const { href } = await runSignOut({ csrf: networkError }, undefined, storage, page);
      expect(href).toBe(SERVER_LOGOUT_PATH);
    }
    expect(JSON.parse(storage.get(SIGN_OUT_FALLBACK_KEY) ?? "[]")).toHaveLength(1);
  });

  test("el camino normal no anota intentos", async () => {
    const { storage } = await runSignOut({
      csrf: csrfOk,
      signout: () => jsonResponse(200, { url: "http://localhost:3000/auth/login" }),
    });
    expect(storage.has(SIGN_OUT_FALLBACK_KEY)).toBe(false);
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
