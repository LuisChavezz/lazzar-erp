import { useState } from "react";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { fetchRfidScans } from "../services/actions";
import {
  cursorFeedPageParams,
  drainFeedAfterCursor,
  nextCursorFeedMount,
  nextCursorFeedSession,
  rfidCursorScansKey,
  RfidFeedMemory,
  withPollOutcome,
  type CursorFeedSession,
} from "../utils/rfidScansParams";
import { RFID_SCANS_POLL_INTERVAL_MS } from "./useRfidScans";
import type { RfidScan } from "../interfaces/rfid-scanner.interface";

/**
 * Lecturas de la antena POSTERIORES al inicio de la captura (EC-982), con el
 * cursor `despues_de_id` del backend. Cada vez que `enabled` pasa a `true`, y
 * cada vez que cambia `lector` mientras está encendido (EC-997,
 * `nextCursorFeedSession`), empieza una sesión: la primera petición
 * (`limite=1`, sin `solo_match` ni `unicos`: `cursorFeedPageParams`) solo
 * fija el cursor (el `id` más alto que ya existe para ese lector, 0 sin
 * lecturas) y las siguientes, cada 3 s, piden
 * `despues_de_id` = el `id` más alto visto, con `unicos=1&limite=200`, y
 * devuelven SOLO lo nuevo, en `id` ascendente (EC-984). Si una página viene
 * llena se pide la siguiente en el mismo sondeo (`drainFeedAfterCursor`). Así
 * nada leído antes de empezar entra a la captura y nada posterior se salta.
 *
 * El cursor, los EPC vistos y la bandeja viven en una `RfidFeedMemory`
 * (`memoria`). Recepción y Surtido pasan una por formulario que `continua`:
 * una sesión nueva con el mismo lector sigue desde el último cursor en vez de
 * arrancar (Detener → Iniciar, EC-997). Sin `memoria`, una propia que empieza
 * de cero en cada sesión (el encuadre).
 *
 * Una pieza que ya estaba frente a la antena al empezar puede tardar hasta
 * 30 s en salir: el backend descarta la misma etiqueta del mismo lector
 * durante 30 s (nucleo-erp#1460).
 *
 * Llave propia por sesión (no comparte caché con `useRfidScans`) y sin caché al
 * soltarla: cada respuesta es un delta, no una foto.
 *
 * Va sobre `useGuardedQuery` como el resto de los hooks de datos: un sondeo
 * fallido conserva el último delta (misma referencia, así que la captura no lo
 * vuelve a entregar) y avisa con un toast una vez por racha; `isInitialError`
 * solo si la sesión nunca respondió.
 *
 * Lo nuevo no viaja en los datos de la consulta sino en una bandeja
 * (`outbox`, avisada con `version`): un sondeo que sigue en vuelo cuando el
 * operador pausa ya movió el cursor, y lo que trae tiene que entregarse aunque
 * la lectura esté apagada o haya empezado otra sesión. `isFetching` dice si
 * hay un sondeo en vuelo, para no dejar aceptar antes de que llegue.
 */
export function useRfidCursorScans(
  enabled: boolean,
  {
    soloMatch,
    lector = null,
    memoria,
  }: {
    soloMatch: boolean;
    lector?: number | null;
    /** Memoria de la captura (`RfidFeedMemory`); sin ella, una propia que empieza de cero en cada sesión. */
    memoria?: RfidFeedMemory<RfidScan>;
  },
) {
  const [propia] = useState(() => new RfidFeedMemory<RfidScan>(false));
  const memory = memoria ?? propia;
  // Una sesión nueva al encender y al cambiar de lector encendido
  // (`nextCursorFeedSession`; ajuste de estado en render, sin efecto).
  const [feed, setFeed] = useState<CursorFeedSession>({ enabled, lector, session: 0 });
  const nextFeed = nextCursorFeedSession(feed, enabled, lector);
  // ¿Falló el último sondeo de la sesión? Una sesión nueva empieza sin fallo.
  const [lastPollFailed, setLastPollFailed] = useState(false);
  if (nextFeed !== feed) {
    setFeed(nextFeed);
    if (nextFeed.session !== feed.session) setLastPollFailed(false);
  }
  const { session } = nextFeed;
  // Distinto en cada montaje: uno nuevo nunca hereda la consulta (ni el sondeo en vuelo) del anterior.
  const [mount] = useState(nextCursorFeedMount);
  const [version, setVersion] = useState(0);

  const { isInitialError, isFetching } = useGuardedQuery<{ fresh: number }>(
    {
      queryKey: rfidCursorScansKey(soloMatch, lector, mount, session),
      queryFn: async () => {
        // Sesión de este montaje: sigue el cursor de la captura o empieza de cero (`RfidFeedMemory.empezar`).
        const sesion = `${mount}:${session}`;
        memory.empezar(sesion, lector);
        // Páginas llenas seguidas hasta vaciar lo nuevo (`drainFeedAfterCursor`).
        const next = await withPollOutcome(
          () =>
            drainFeedAfterCursor(memory.cursor, async (current) => {
              const { scans } = await fetchRfidScans({
                soloMatch,
                lector,
                ...cursorFeedPageParams(current),
              });
              return scans;
            }),
          // Solo el sondeo de la sesión vigente marca el estado.
          (failed) => {
            if (memory.sesion === sesion) setLastPollFailed(failed);
          },
        );
        // Solo si la sesión sigue siendo esta: una respuesta tardía no mueve otra
        // (la sesión nueva vuelve a pedir desde el cursor que esta dejó).
        memory.avanzar(sesion, next.cursor);
        // A la bandeja aunque la lectura ya esté en pausa o la tira desmontada:
        // el cursor ya pasó por ahí; se entrega al reanudar.
        if (next.fresh.length > 0) {
          memory.outbox.push(next.fresh);
          setVersion((current) => current + 1);
        }
        return { fresh: next.fresh.length };
      },
      enabled,
      refetchInterval: RFID_SCANS_POLL_INTERVAL_MS,
      refetchIntervalInBackground: false,
      gcTime: 0,
      // Un fallo no mueve el cursor: el siguiente sondeo vuelve a pedir desde el mismo punto.
      retry: false,
    },
    {
      toastId: "rfid-cursor-scans-refetch-error",
      errorMessage: "No se pudo consultar la antena RFID. Se vuelve a intentar en unos segundos.",
    },
  );

  // `isPollFailing`: mientras el ÚLTIMO sondeo de la lectura encendida falló
  // (se limpia con la siguiente respuesta). Excepción documentada a la regla de
  // no exponer fallos de refetch (ver `useRfidEpcFeed`): solo para el aviso de
  // la tira, nunca para ocultar datos; `isInitialError` sigue igual.
  return { memory, version, isInitialError, isPollFailing: enabled && lastPollFailed, isFetching };
}
