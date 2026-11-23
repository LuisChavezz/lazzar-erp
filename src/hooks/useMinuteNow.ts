import { useSyncExternalStore } from "react";

/** Periodo del reloj compartido. */
export const MINUTE_NOW_PERIOD_MS = 60_000;

/** Lo que el store necesita del entorno; inyectable para las pruebas unitarias. */
export interface MinuteNowEnvironment {
  now: () => number;
  setInterval: (callback: () => void, ms: number) => unknown;
  clearInterval: (id: unknown) => void;
  document: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
}

export interface MinuteNowStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => number;
}

/**
 * "Ahora" que avanza al minuto, como store externo ÚNICO: un solo intervalo y
 * un solo listener de `visibilitychange` para todos los suscriptores, y ambos
 * existen solo mientras haya al menos uno (p. ej. el dropdown o el modal de
 * notificaciones abiertos).
 *
 * - Al llegar el primer suscriptor se relee el reloj y, con la pestaña
 *   visible, arranca el intervalo.
 * - Con la pestaña oculta el intervalo se detiene; al volver se relee en el
 *   acto y se reanuda.
 * - Al irse el último suscriptor se limpia todo.
 *
 * El reloj se lee aquí, fuera del render, y el snapshot es estable entre
 * lecturas, como exige `useSyncExternalStore`. Es otro store que
 * `useClientNow`, que solo se renueva a medianoche y no sirve para "hace N min".
 */
export const createMinuteNowStore = (
  env: MinuteNowEnvironment,
  periodMs: number = MINUTE_NOW_PERIOD_MS,
): MinuteNowStore => {
  let current: number | null = null;
  const subscribers = new Set<() => void>();
  let intervalId: unknown;

  const refresh = () => {
    current = env.now();
    for (const notify of subscribers) notify();
  };

  const startInterval = () => {
    if (intervalId !== undefined) return;
    intervalId = env.setInterval(refresh, periodMs);
  };

  const stopInterval = () => {
    if (intervalId === undefined) return;
    env.clearInterval(intervalId);
    intervalId = undefined;
  };

  const onVisibilityChange = () => {
    if (env.document.visibilityState === "visible") {
      refresh();
      startInterval();
    } else {
      stopInterval();
    }
  };

  return {
    subscribe: (onChange) => {
      subscribers.add(onChange);
      if (subscribers.size === 1) {
        env.document.addEventListener("visibilitychange", onVisibilityChange);
        refresh();
        if (env.document.visibilityState === "visible") startInterval();
      }
      return () => {
        subscribers.delete(onChange);
        if (subscribers.size === 0) {
          env.document.removeEventListener("visibilitychange", onVisibilityChange);
          stopInterval();
        }
      };
    },
    getSnapshot: () => {
      current ??= env.now();
      return current;
    },
  };
};

let browserStore: MinuteNowStore | undefined;

/** El store del navegador, creado al primer uso (nunca en el servidor). */
const getBrowserStore = (): MinuteNowStore =>
  (browserStore ??= createMinuteNowStore({
    now: () => Date.now(),
    setInterval: (callback, ms) => window.setInterval(callback, ms),
    clearInterval: (id) => window.clearInterval(id as number),
    document,
  }));

const subscribe = (onChange: () => void) => getBrowserStore().subscribe(onChange);
const getClientSnapshot = (): number => getBrowserStore().getSnapshot();
const getServerSnapshot = (): null => null;

/**
 * El instante actual (ms) del navegador, renovado cada minuto mientras la
 * pestaña está visible y en el acto al volver a ella; `null` durante el
 * SSR/prerender y la hidratación. Para etiquetas relativas ("Hace 5 min") que
 * no deben quedarse congeladas con la vista abierta.
 */
export function useMinuteNow(): number | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
