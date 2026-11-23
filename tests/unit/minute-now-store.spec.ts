import { expect, test } from "@playwright/test";
import { createMinuteNowStore, type MinuteNowEnvironment } from "@/src/hooks/useMinuteNow";

/**
 * Store del reloj al minuto de `useMinuteNow` (EC-930), con un entorno falso:
 * reloj, intervalos y `document` controlados por la prueba.
 */
const createFakeEnv = () => {
  let clock = 1_000;
  const intervals = new Map<number, () => void>();
  let nextId = 1;
  const target = new EventTarget();
  const doc = {
    visibilityState: "visible" as DocumentVisibilityState,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  };
  let listeners = 0;
  const env: MinuteNowEnvironment = {
    now: () => clock,
    setInterval: (callback) => {
      const id = nextId++;
      intervals.set(id, callback);
      return id;
    },
    clearInterval: (id) => {
      intervals.delete(id as number);
    },
    document: {
      get visibilityState() {
        return doc.visibilityState;
      },
      addEventListener: ((...args: Parameters<EventTarget["addEventListener"]>) => {
        listeners++;
        doc.addEventListener(...args);
      }) as Document["addEventListener"],
      removeEventListener: ((...args: Parameters<EventTarget["removeEventListener"]>) => {
        listeners--;
        doc.removeEventListener(...args);
      }) as Document["removeEventListener"],
    },
  };
  return {
    env,
    advance: (ms: number) => {
      clock += ms;
    },
    tick: () => {
      for (const callback of [...intervals.values()]) callback();
    },
    setVisibility: (state: DocumentVisibilityState) => {
      doc.visibilityState = state;
      target.dispatchEvent(new Event("visibilitychange"));
    },
    activeIntervals: () => intervals.size,
    listeners: () => listeners,
  };
};

test.describe("createMinuteNowStore", () => {
  test("el snapshot es estable entre lecturas y no relee el reloj", () => {
    const fake = createFakeEnv();
    const store = createMinuteNowStore(fake.env);
    expect(store.getSnapshot()).toBe(1_000);
    fake.advance(5_000);
    expect(store.getSnapshot()).toBe(1_000);
  });

  test("sin suscriptores no hay intervalo ni listener", () => {
    const fake = createFakeEnv();
    createMinuteNowStore(fake.env).getSnapshot();
    expect(fake.activeIntervals()).toBe(0);
    expect(fake.listeners()).toBe(0);
  });

  test("el primer suscriptor relee el reloj y arranca UN intervalo compartido", () => {
    const fake = createFakeEnv();
    const store = createMinuteNowStore(fake.env);
    store.getSnapshot();
    fake.advance(10_000);
    const a = { calls: 0 };
    const b = { calls: 0 };
    const unsubA = store.subscribe(() => a.calls++);
    expect(store.getSnapshot()).toBe(11_000);
    const unsubB = store.subscribe(() => b.calls++);
    expect(fake.activeIntervals()).toBe(1);
    expect(fake.listeners()).toBe(1);

    fake.advance(60_000);
    fake.tick();
    expect(store.getSnapshot()).toBe(71_000);
    // `a` también recibió la relectura de su propia suscripción (la primera).
    expect(a.calls).toBe(2);
    expect(b.calls).toBe(1);

    unsubA();
    expect(fake.activeIntervals()).toBe(1);
    unsubB();
    expect(fake.activeIntervals()).toBe(0);
    expect(fake.listeners()).toBe(0);
  });

  test("con la pestaña oculta se detiene y al volver relee en el acto", () => {
    const fake = createFakeEnv();
    const store = createMinuteNowStore(fake.env);
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    const afterSubscribe = calls;

    fake.setVisibility("hidden");
    expect(fake.activeIntervals()).toBe(0);
    fake.advance(5 * 60_000);
    expect(store.getSnapshot()).toBe(1_000);

    fake.setVisibility("visible");
    expect(store.getSnapshot()).toBe(1_000 + 5 * 60_000);
    expect(calls).toBe(afterSubscribe + 1);
    expect(fake.activeIntervals()).toBe(1);

    unsubscribe();
    expect(fake.activeIntervals()).toBe(0);
  });

  test("suscribirse con la pestaña oculta no arranca el intervalo hasta volver", () => {
    const fake = createFakeEnv();
    const store = createMinuteNowStore(fake.env);
    fake.setVisibility("hidden");
    const unsubscribe = store.subscribe(() => {});
    expect(fake.activeIntervals()).toBe(0);
    fake.setVisibility("visible");
    expect(fake.activeIntervals()).toBe(1);
    unsubscribe();
    expect(fake.activeIntervals()).toBe(0);
    expect(fake.listeners()).toBe(0);
  });

  test("sin suscriptores, el primer render tras reabrir ya lee un 'ahora' vigente y estable", () => {
    const fake = createFakeEnv();
    const store = createMinuteNowStore(fake.env);
    store.subscribe(() => {})();
    expect(store.getSnapshot()).toBe(1_000);

    // Menos de un periodo: se conserva el valor guardado.
    fake.advance(30_000);
    expect(store.getSnapshot()).toBe(1_000);

    // Tres horas cerrada: el render previo a `subscribe` ya ve la hora actual…
    fake.advance(3 * 60 * 60_000);
    const first = store.getSnapshot();
    expect(first).toBe(1_000 + 30_000 + 3 * 60 * 60_000);
    // …y lecturas seguidas del mismo render devuelven lo mismo aunque el reloj avance.
    fake.advance(5);
    expect(store.getSnapshot()).toBe(first);
  });

  test("con suscriptores, getSnapshot no relee el reloj por su cuenta", () => {
    const fake = createFakeEnv();
    const store = createMinuteNowStore(fake.env);
    const unsubscribe = store.subscribe(() => {});
    fake.advance(5 * 60_000);
    expect(store.getSnapshot()).toBe(1_000);
    unsubscribe();
  });

  test("volver a suscribirse tras quedarse sin suscriptores relee el reloj", () => {
    const fake = createFakeEnv();
    const store = createMinuteNowStore(fake.env);
    store.subscribe(() => {})();
    fake.advance(3 * 60 * 60_000);
    const unsubscribe = store.subscribe(() => {});
    expect(store.getSnapshot()).toBe(1_000 + 3 * 60 * 60_000);
    unsubscribe();
  });
});
