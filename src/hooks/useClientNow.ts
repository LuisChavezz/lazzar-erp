import { useSyncExternalStore } from "react";

/**
 * "Ahora" del navegador como store externo: se lee una vez al primer uso y se
 * relee al volver a la pestaña (con el equipo suspendido o la pestaña en
 * segundo plano, el día pudo cambiar). Un snapshot estable es lo que exige
 * `useSyncExternalStore`: devolver `Date.now()` en cada lectura haría que React
 * lo viera cambiar sin fin.
 */
let clientNow: number | null = null;

const getClientSnapshot = (): number => {
  clientNow ??= Date.now();
  return clientNow;
};

const getServerSnapshot = (): null => null;

const subscribe = (onChange: () => void) => {
  const onVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    clientNow = Date.now();
    onChange();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => document.removeEventListener("visibilitychange", onVisibilityChange);
};

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
 * Es para comparar fechas-calendario, no un reloj que avanza: el valor solo se
 * renueva al volver a la pestaña.
 */
export function useClientNow(): number | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
