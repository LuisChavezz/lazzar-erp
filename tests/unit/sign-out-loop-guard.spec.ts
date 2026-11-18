import { expect, test } from "@playwright/test";
import {
  clearSignOutAttempts,
  recentSignOutAttempts,
  registerSignOutAttempt,
  SIGN_OUT_ATTEMPTS_KEY,
  SIGN_OUT_ATTEMPTS_WINDOW_MS,
} from "@/src/features/auth/utils/signOutLoopGuard";
import { enterNewSession } from "@/src/features/auth/utils/clientSessionState";

/**
 * EC-851: guarda en `sessionStorage` que corta el cierre de sesión
 * si se repite en ciclo, y su reinicio al iniciar sesión.
 */

type Globals = { sessionStorage?: unknown; window?: unknown; document?: unknown };
const globals = globalThis as unknown as Globals;

const blocked = () => {
  throw new DOMException("bloqueado", "SecurityError");
};

/** Instala un `sessionStorage` en memoria (o bloqueado) mientras corre `run`. */
const withSessionStorage = <T>(storage: Map<string, string> | "blocked", run: () => T): T => {
  const previous = globals.sessionStorage;
  globals.sessionStorage =
    storage === "blocked"
      ? { getItem: blocked, setItem: blocked, removeItem: blocked }
      : {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => void storage.set(key, value),
          removeItem: (key: string) => void storage.delete(key),
        };
  try {
    return run();
  } finally {
    globals.sessionStorage = previous;
  }
};

test.describe("recentSignOutAttempts", () => {
  const now = 1_000_000;

  test("solo cuenta los intentos dentro de la ventana", () => {
    const raw = JSON.stringify([now - SIGN_OUT_ATTEMPTS_WINDOW_MS, now - 59_999, now - 1]);
    expect(recentSignOutAttempts(raw, now)).toEqual([now - 59_999, now - 1]);
  });

  test("una marca ilegible o con valores raros cuenta como ninguna", () => {
    const raws = [null, "", "{", "{}", JSON.stringify("x"), JSON.stringify(["1", null])];
    for (const raw of raws) {
      expect(recentSignOutAttempts(raw, now), String(raw)).toEqual([]);
    }
  });
});

test.describe("registerSignOutAttempt", () => {
  test("anota hasta el máximo y luego rechaza sin anotar", () => {
    const storage = new Map<string, string>();
    const results = withSessionStorage(storage, () => [
      registerSignOutAttempt(1_000),
      registerSignOutAttempt(2_000),
      registerSignOutAttempt(3_000),
    ]);
    expect(results).toEqual(["registered", "registered", "exhausted"]);
    expect(JSON.parse(storage.get(SIGN_OUT_ATTEMPTS_KEY) ?? "null")).toEqual([1_000, 2_000]);
  });

  test("pasada la ventana vuelve a dejar navegar", () => {
    const storage = new Map([[SIGN_OUT_ATTEMPTS_KEY, JSON.stringify([1_000, 2_000])]]);
    const result = withSessionStorage(storage, () =>
      registerSignOutAttempt(2_000 + SIGN_OUT_ATTEMPTS_WINDOW_MS)
    );
    expect(result).toBe("registered");
  });

  test("sin sessionStorage avisa que no puede contar, sin lanzar", () => {
    expect(withSessionStorage("blocked", () => registerSignOutAttempt())).toBe("unavailable");
  });
});

test.describe("reinicio de la cuenta", () => {
  test("clearSignOutAttempts borra la marca y no lanza sin almacenamiento", () => {
    const storage = new Map([[SIGN_OUT_ATTEMPTS_KEY, "[1]"]]);
    withSessionStorage(storage, () => clearSignOutAttempts());
    expect(storage.has(SIGN_OUT_ATTEMPTS_KEY)).toBe(false);
    expect(() => withSessionStorage("blocked", () => clearSignOutAttempts())).not.toThrow();
  });

  test("enterNewSession reinicia la cuenta al iniciar sesión", () => {
    const storage = new Map([[SIGN_OUT_ATTEMPTS_KEY, JSON.stringify([Date.now()])]]);
    const previousWindow = globals.window;
    const previousDocument = globals.document;
    let replaced = "";
    globals.window = {
      location: { replace: (url: string) => void (replaced = url) },
      localStorage: { removeItem: () => {} },
    };
    globals.document = { cookie: "" };
    try {
      withSessionStorage(storage, () => enterNewSession());
    } finally {
      globals.window = previousWindow;
      globals.document = previousDocument;
    }
    expect(storage.has(SIGN_OUT_ATTEMPTS_KEY)).toBe(false);
    expect(replaced).toBe("/select-branch");
  });
});
