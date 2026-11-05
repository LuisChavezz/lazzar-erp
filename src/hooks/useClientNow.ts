import { useSyncExternalStore } from "react";
import { msUntilNextMexicoDay } from "@/src/utils/mexicoTime";

/** Margen tras la medianoche, para no despertar un instante antes del cambio. */
const AFTER_MIDNIGHT_MARGIN_MS = 1000;

/**
 * "Ahora" del navegador como store externo ÚNICO para toda la app: un solo
 * valor, un solo listener de `visibilitychange`, un solo temporizador y un
 * `Set` de suscriptores (uno por componente montado). El listener y el
 * temporizador existen solo mientras haya al menos un suscriptor.
 *
 * El valor se relee:
 * - al llegar el primer suscriptor (p. ej. al volver a la ruta con una
 *   navegación de cliente, tras horas en otras pantallas);
 * - al volver a la pestaña (con el equipo suspendido o la pestaña en segundo
 *   plano, un temporizador puede dispararse tarde);
 * - a la medianoche de México, reprogramando tras cada disparo, como
 *   `useBackendToday` (mismo `msUntilNextMexicoDay`, sin llamadas al backend).
 *
 * Un snapshot estable es lo que exige `useSyncExternalStore`: devolver
 * `Date.now()` en cada lectura haría que React lo viera cambiar sin fin.
 */
let clientNow: number | null = null;
const subscribers = new Set<() => void>();
let midnightTimer: ReturnType<typeof setTimeout> | undefined;

/** Una escritura y una notificación por evento, sin importar cuántos suscriptores haya. */
const refresh = () => {
  clientNow = Date.now();
  for (const notify of subscribers) notify();
};

const scheduleMidnight = () => {
  midnightTimer = setTimeout(() => {
    refresh();
    scheduleMidnight();
  }, msUntilNextMexicoDay() + AFTER_MIDNIGHT_MARGIN_MS);
};

const onVisibilityChange = () => {
  if (document.visibilityState === "visible") refresh();
};

const subscribe = (onChange: () => void) => {
  subscribers.add(onChange);
  if (subscribers.size === 1) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    scheduleMidnight();
    refresh();
  }
  return () => {
    subscribers.delete(onChange);
    if (subscribers.size === 0) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(midnightTimer);
      midnightTimer = undefined;
    }
  };
};

const getClientSnapshot = (): number => {
  clientNow ??= Date.now();
  return clientNow;
};

const getServerSnapshot = (): null => null;

/**
 * El instante actual (ms) del NAVEGADOR, o `null` durante el SSR/prerender y
 * la hidratación.
 *
 * Para lo que se deriva de "ahora" al pintar (una fecha vencida, un "hace X
 * días"): una página estática se prerenderiza en el build, así que un
 * `new Date()` en el render daría el instante del build en el HTML y el del
 * visitante al hidratar. Si eso cambia un atributo (una clase), React no lo
 * corrige y deja el del servidor. Con este hook el HTML y la hidratación
 * pintan el estado neutro (`null`) y, justo después, `useSyncExternalStore`
 * vuelve a pintar con la hora real, sin un `setState` dentro de un efecto.
 *
 * Es para comparar fechas-calendario, no un reloj que avanza al minuto: el
 * valor se renueva al montar, al volver a la pestaña y a cada medianoche de
 * México.
 */
export function useClientNow(): number | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
