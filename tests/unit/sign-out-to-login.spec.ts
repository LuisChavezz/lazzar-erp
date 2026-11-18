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
import {
  SIGN_OUT_FAILURE_RETRY_LABEL,
  SIGN_OUT_FAILURE_RETRY_REENABLE_MS,
  SIGN_OUT_FAILURE_SCREEN_ID,
  SIGN_OUT_FAILURE_TITLE,
} from "@/src/features/auth/utils/signOutFailureScreen";

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
    document,
  }: { session?: Map<string, string>; sessionStorage?: unknown; document?: unknown } = {}
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
  globals.document = document;
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

  test("con sesión tras un cierre reciente (cookie revivida), vuelve a cerrar sesión", async () => {
    const session = new Map([[SIGN_OUT_ATTEMPTS_KEY, JSON.stringify([Date.now() - 1_000])]]);
    const env = await withPage(
      async () => {
        globals.fetch = async () => ({ ok: true, json: async () => ({ user: { email: "a@b.c" } }) });
        await settleSignedOutClientState(new AbortController().signal);
      },
      { session }
    );
    expect(env.location.href).toBe(SERVER_LOGOUT_PATH);
    expect(attempts(session)).toHaveLength(2);
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

/** Elemento de un DOM falso mínimo: lo que usa `showSignOutFailureScreen`. */
class FakeElement {
  id = "";
  className = "";
  textContent = "";
  type = "";
  disabled = false;
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  private readonly listeners = new Map<string, Array<() => void>>();

  constructor(
    readonly tagName: string,
    private readonly doc: FakeDocument
  ) {}

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  hasAttribute(name: string) {
    return this.attributes.has(name);
  }
  append(...nodes: FakeElement[]) {
    this.children.push(...nodes);
  }
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  click() {
    if (!this.disabled) this.listeners.get("click")?.forEach((listener) => listener());
  }
  focus() {
    this.doc.activeElement = this;
  }
  find(predicate: (el: FakeElement) => boolean): FakeElement | undefined {
    if (predicate(this)) return this;
    for (const child of this.children) {
      const found = child.find(predicate);
      if (found) return found;
    }
    return undefined;
  }
}

class FakeDocument {
  activeElement: FakeElement | null = null;
  readonly body = new FakeElement("body", this);
  constructor() {
    this.body.append(new FakeElement("div", this), new FakeElement("script", this));
  }
  createElement(tagName: string) {
    return new FakeElement(tagName, this);
  }
  getElementById(id: string) {
    return this.body.find((el) => el.id === id) ?? null;
  }
}

test.describe("pantalla de error cuando la guarda corta", () => {
  const exhausted = () =>
    new Map([[SIGN_OUT_ATTEMPTS_KEY, JSON.stringify([Date.now() - 2, Date.now() - 1])]]);

  test("se monta una sola vez, deja inert lo demás y enfoca Reintentar", async () => {
    const doc = new FakeDocument();
    const [appRoot, script] = doc.body.children;
    await withPage(
      () => {
        signOutToLogin();
        signOutToLogin();
      },
      { session: exhausted(), document: doc }
    );
    const screens = doc.body.children.filter((el) => el.id === SIGN_OUT_FAILURE_SCREEN_ID);
    expect(screens).toHaveLength(1);
    const [screen] = screens;
    expect(screen.attributes.get("role")).toBe("alertdialog");
    expect(screen.attributes.get("aria-modal")).toBe("true");
    expect(screen.find((el) => el.tagName === "h1")?.textContent).toBe(SIGN_OUT_FAILURE_TITLE);
    expect(appRoot.hasAttribute("inert")).toBe(true);
    expect(script.hasAttribute("inert")).toBe(true);
    expect(screen.hasAttribute("inert")).toBe(false);
    expect(doc.activeElement?.textContent).toBe(SIGN_OUT_FAILURE_RETRY_LABEL);
  });

  test("Reintentar reinicia la cuenta, anota un intento y navega a /auth/logout", async () => {
    const doc = new FakeDocument();
    const session = exhausted();
    const env = await withPage(
      () => {
        signOutToLogin();
        const retry = doc.getElementById(SIGN_OUT_FAILURE_SCREEN_ID)?.find(
          (el) => el.tagName === "button"
        );
        retry?.click();
      },
      { session, document: doc }
    );
    expect(env.location.href).toBe(SERVER_LOGOUT_PATH);
    expect(attempts(session)).toHaveLength(1);
    expect(env.fetchCalls).toEqual([]);
  });

  test("si la navegación no ocurre, Reintentar vuelve a estar disponible", async () => {
    const doc = new FakeDocument();
    let retry: FakeElement | undefined;
    await withPage(
      () => {
        signOutToLogin();
        retry = doc.getElementById(SIGN_OUT_FAILURE_SCREEN_ID)?.find((el) => el.tagName === "button");
        retry?.click();
      },
      { session: exhausted(), document: doc }
    );
    expect(retry?.disabled).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, SIGN_OUT_FAILURE_RETRY_REENABLE_MS + 100));
    expect(retry?.disabled).toBe(false);
  });
});
