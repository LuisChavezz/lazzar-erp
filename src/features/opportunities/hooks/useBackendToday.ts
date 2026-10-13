import { todayInBackendTimeZone } from "@/src/features/accounts-payable/utils/accounts-payable.utils";

/**
 * HOY ("YYYY-MM-DD") según el backend, leído de nuevo en CADA render.
 *
 * Es la única definición de "hoy" para los seguimientos: el backend decide con
 * su propio día qué recordatorio ya venció (`?hasta=hoy`,
 * `proximo_recordatorio`), así que la pantalla usa ese mismo día y no el del
 * navegador, que cambia con el huso o con el reloj del equipo.
 *
 * Es un hook —y no una llamada suelta a `todayInBackendTimeZone()` en el
 * componente— por el React Compiler: una llamada sin argumentos no depende de
 * nada, así que el compilador la guarda y la reutiliza mientras el componente
 * siga montado; con la página abierta de un día para otro, "hoy" se quedaría
 * en ayer. Una llamada a un hook se ejecuta en todos los renders, y `"use no
 * memo"` evita que el compilador guarde el valor AQUÍ dentro.
 */
export function useBackendToday(): string {
  "use no memo";
  return todayInBackendTimeZone();
}
