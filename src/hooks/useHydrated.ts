import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `true` solo cuando el componente ya corre en el navegador con sus handlers
 * conectados. En el HTML del servidor y durante la hidratación vale `false`
 * (snapshot de servidor) y, justo después, `true`; en un montaje de cliente
 * (navegación sin SSR) vale `true` desde el primer render.
 *
 * Sirve para deshabilitar en el HTML prerenderizado un control que, usado
 * antes de hidratar, haría algo nativo indeseado (p. ej. el submit del login,
 * EC-863), sin un `setState` dentro de un efecto.
 */
export const useHydrated = () =>
  useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
