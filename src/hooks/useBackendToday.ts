import { getMexicoTodayDate } from "@/src/utils/mexicoTime";

/**
 * HOY ("YYYY-MM-DD") según el backend, leído de nuevo en CADA render.
 *
 * Para lo que el backend decide con SU día (qué recordatorio ya venció, qué
 * cuenta está vencida): la pantalla usa ese mismo día y no el del navegador,
 * que cambia con el huso o con el reloj del equipo.
 *
 * Es un hook —y no una llamada suelta a `getMexicoTodayDate()` en el
 * componente— por el React Compiler: una llamada sin argumentos no depende de
 * nada, así que el compilador la guarda y la reutiliza mientras el componente
 * siga montado; con la página abierta de un día para otro, "hoy" se quedaría
 * en ayer. Una llamada a un hook se ejecuta en todos los renders, y `"use no
 * memo"` evita que el compilador guarde el valor AQUÍ dentro.
 */
export function useBackendToday(): string {
  "use no memo";
  return getMexicoTodayDate();
}
