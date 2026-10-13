import { useEffect, useState } from "react";
import { getMexicoTodayDate, msUntilNextMexicoDay } from "@/src/utils/mexicoTime";

/** Margen tras la medianoche, para no despertar un instante antes del cambio. */
const AFTER_MIDNIGHT_MARGIN_MS = 1000;

/**
 * HOY ("YYYY-MM-DD") según el backend, y un render nuevo cuando ese día CAMBIA.
 *
 * Para lo que el backend decide con SU día (qué recordatorio ya venció, qué
 * cuenta está vencida): la pantalla usa ese mismo día y no el del navegador,
 * que cambia con el huso o con el reloj del equipo.
 *
 * El día vive en estado, así que el componente se vuelve a pintar solo cuando
 * cambia, sin que el usuario haga nada y sin releer datos:
 *
 * - un temporizador a la próxima medianoche del backend, que se reprograma al
 *   dispararse (y se limpia al desmontar);
 * - al volver a la pestaña se relee: con el equipo suspendido o la pestaña en
 *   segundo plano, un temporizador puede dispararse tarde.
 *
 * Es estado —y no una llamada suelta a `getMexicoTodayDate()` en el
 * componente— también por el React Compiler: una llamada sin argumentos no
 * depende de nada, y el compilador la guardaría mientras el componente siga
 * montado.
 */
export function useBackendToday(): string {
  const [today, setToday] = useState(() => getMexicoTodayDate());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    // Si el día no cambió, `setToday` con el mismo texto no vuelve a pintar.
    const sync = () => setToday(getMexicoTodayDate());
    const schedule = () => {
      timer = setTimeout(() => {
        sync();
        schedule();
      }, msUntilNextMexicoDay() + AFTER_MIDNIGHT_MARGIN_MS);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") sync();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return today;
}
