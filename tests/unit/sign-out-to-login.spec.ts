import { expect, test } from "@playwright/test";
import {
  isSignOutUnderway,
  LEGACY_SAT_STORAGE_KEY,
  resetSignOutPageState,
  SERVER_LOGOUT_PATH,
  settleSignedOutClientState,
  signOutToLogin,
} from "@/src/features/auth/utils/clientSessionState";
import { NEXTAUTH_MESSAGE_KEY } from "@/src/features/auth/utils/sessionRecovery";
import {
  SIGN_OUT_ATTEMPTS_KEY,
  SIGN_OUT_MAX_ATTEMPTS,
} from "@/src/features/auth/utils/signOutLoopGuard";

/**
 * EC-851: el cierre de sesión es una sola navegación a `/auth/logout`, sin
 * `signOut` de next-auth ni peticiones; la guarda contra ciclos corta tras
 * `SIGN_OUT_MAX_ATTEMPTS` cargas; y el login avisa a las otras pestañas.
 */

type Globals = {
  window?: unknown;
  document?: unknown;
  sessionStorage?: unknown;
  fetch?: unknown;
};
const globals = globalThis as unknown as Globals;

/** Guarda los globales que las pruebas reemplazan y devuelve cómo restaurarlos. */
const saveGlobals = () => {
  const saved: Globals = {
    window: globals.window,
    document: globals.document,
    sessionStorage: globals.sessionStorage,
    fetch: globals.fetch,
  };
  return () => void Object.assign(globals, saved);
};

const blocked = () => {
  throw new DOMException("bloqueado", "SecurityError");
};

/** `Storage` en memoria sobre el `Map` dado, o uno que lanza en todo. */
const fakeStorage = (items: Map<string, string> | "blocked") =>
  items === "blocked"
    ? { getItem: blocked, setItem: blocked, removeItem: blocked }
    : {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => void items.set(key, value),
        removeItem: (key: string) => void items.delete(key),
      };

type Env = {
  location: { href: string };
  session: Map<string, string>;
  local: Map<string, string>;
  fetchCalls: string[];
};

/**
 * Corre `run` con un `window`, `sessionStorage` y `fetch` falsos. Cada llamada
 * es una carga de página nueva (estado del módulo reiniciado); `session` se
 * puede pasar para que persista entre "cargas", como el `sessionStorage` real.
 */
const withPage = async (
  run: (env: Env) => unknown,
  {
    session = new Map<string, string>(),
    sessionStorage = fakeStorage(session),
  }: { session?: Map<string, string>; sessionStorage?: unknown } = {}
): Promise<Env> => {
  const env: Env = {
    location: { href: "http://localhost:3000/sales" },
    session,
    local: new Map([[LEGACY_SAT_STORAGE_KEY, "{}"]]),
    fetchCalls: [],
  };
  const restore = saveGlobals();
  globals.window = { location: env.location, localStorage: fakeStorage(env.local) };
  globals.sessionStorage = sessionStorage;
  globals.fetch = (url: string) => {
    env.fetchCalls.push(url);
    return new Promise(() => {});
  };
  resetSignOutPageState();
  try {
    await run(env);
  } finally {
    restore();
    resetSignOutPageState();
  }
  return env;
};

const attempts = (session: Map<string, string>) =>
  JSON.parse(session.get(SIGN_OUT_ATTEMPTS_KEY) ?? "[]") as number[];

test.describe("signOutToLogin", () => {
  test("navega a /auth/logout, limpia el estado del usuario y no hace peticiones", async () => {
    const env = await withPage(() => signOutToLogin());
    expect(env.location.href).toBe(SERVER_LOGOUT_PATH);
    expect(env.fetchCalls).toEqual([]);
    expect(env.local.has(LEGACY_SAT_STORAGE_KEY)).toBe(false);
    expect(attempts(env.session)).toHaveLength(1);
  });

  test("varias llamadas en la misma carga anotan un solo intento", async () => {
    const env = await withPage(() => {
      signOutToLogin();
      signOutToLogin();
      signOutToLogin();
      expect(isSignOutUnderway()).toBe(true);
    });
    expect(env.location.href).toBe(SERVER_LOGOUT_PATH);
    expect(attempts(env.session)).toHaveLength(1);
  });

  test("tras SIGN_OUT_MAX_ATTEMPTS cargas seguidas deja de navegar", async () => {
    const session = new Map<string, string>();
    const hrefs: string[] = [];
    for (let i = 0; i < SIGN_OUT_MAX_ATTEMPTS + 1; i++) {
      const env = await withPage(() => signOutToLogin(), { session });
      hrefs.push(env.location.href);
    }
    expect(hrefs).toEqual([
      ...Array(SIGN_OUT_MAX_ATTEMPTS).fill(SERVER_LOGOUT_PATH),
      "http://localhost:3000/sales",
    ]);
    expect(attempts(session)).toHaveLength(SIGN_OUT_MAX_ATTEMPTS);
  });

  test("con la guarda agotada, los 401 siguientes no hacen peticiones ni navegan", async () => {
    const session = new Map([[SIGN_OUT_ATTEMPTS_KEY, JSON.stringify([Date.now(), Date.now()])]]);
    const env = await withPage(
      () => {
        for (let i = 0; i < 5; i++) signOutToLogin();
        expect(isSignOutUnderway()).toBe(true);
      },
      { session }
    );
    expect(env.location.href).toBe("http://localhost:3000/sales");
    expect(env.fetchCalls).toEqual([]);
  });

  test("sin sessionStorage navega igual (la guarda no puede contar)", async () => {
    for (let i = 0; i < SIGN_OUT_MAX_ATTEMPTS + 1; i++) {
      const env = await withPage(() => signOutToLogin(), { sessionStorage: fakeStorage("blocked") });
      expect(env.location.href).toBe(SERVER_LOGOUT_PATH);
    }
  });

  test("sin cierre en marcha, isSignOutUnderway es false", async () => {
    await withPage(() => expect(isSignOutUnderway()).toBe(false));
  });
});

test.describe("settleSignedOutClientState (login montado)", () => {
  /** `fetch` de `/api/auth/session` que responde `body` con `ok`. */
  const withSessionResponse = async (ok: boolean, body: unknown) => {
    const local = new Map([[LEGACY_SAT_STORAGE_KEY, "{}"]]);
    const restore = saveGlobals();
    globals.window = { localStorage: fakeStorage(local) };
    globals.fetch = async () => ({ ok, json: async () => body });
    try {
      await settleSignedOutClientState(new AbortController().signal);
    } finally {
      restore();
    }
    return local;
  };

  test("sin sesión, limpia y avisa a las otras pestañas con el mensaje de next-auth", async () => {
    const local = await withSessionResponse(true, {});
    expect(local.has(LEGACY_SAT_STORAGE_KEY)).toBe(false);
    const message = JSON.parse(local.get(NEXTAUTH_MESSAGE_KEY) ?? "null");
    expect(message).toMatchObject({ event: "session", data: { trigger: "signout" } });
    expect(typeof message.timestamp).toBe("number");
  });

  test("con sesión, o si la consulta falla, no limpia ni avisa", async () => {
    for (const [ok, body] of [
      [true, { user: { email: "a@b.c" } }],
      [false, {}],
    ] as const) {
      const local = await withSessionResponse(ok, body);
      expect(local.has(LEGACY_SAT_STORAGE_KEY)).toBe(true);
      expect(local.has(NEXTAUTH_MESSAGE_KEY)).toBe(false);
    }
  });
});
