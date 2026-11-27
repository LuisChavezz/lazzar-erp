import { useRef, useState } from "react";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { fetchRfidScans } from "../services/actions";
import { drainFeedAfterCursor, RFID_FEED_CURSOR_LIMIT, ScanOutbox } from "../utils/rfidScansParams";
import { RFID_SCANS_POLL_INTERVAL_MS } from "./useRfidScans";
import type { RfidScan } from "../interfaces/rfid-scanner.interface";

/**
 * Lecturas de la antena POSTERIORES al inicio de la captura (EC-982), con el
 * cursor `despues_de_id` del backend. Cada vez que `enabled` pasa a `true`
 * empieza una sesión: la primera petición solo fija el cursor (el `id` más
 * alto que ya existe, 0 sin lecturas) y las siguientes, cada 3 s, piden
 * `despues_de_id` = el `id` más alto visto, con `unicos=1&limite=200`, y
 * devuelven SOLO lo nuevo, en `id` ascendente (EC-984). Si una página viene
 * llena se pide la siguiente en el mismo sondeo (`drainFeedAfterCursor`). Así
 * nada leído antes de empezar entra a la captura y nada posterior se salta.
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
  { soloMatch, lector = null }: { soloMatch: boolean; lector?: number | null },
) {
  // Una sesión nueva cada vez que se enciende (ajuste de estado en render, sin efecto).
  const [session, setSession] = useState(0);
  const [wasEnabled, setWasEnabled] = useState(enabled);
  if (enabled !== wasEnabled) {
    setWasEnabled(enabled);
    if (enabled) setSession((current) => current + 1);
  }
  const cursorRef = useRef<{ session: number; cursor: number | null }>({ session, cursor: null });
  const [outbox] = useState(() => new ScanOutbox<RfidScan>());
  const [version, setVersion] = useState(0);

  const { isInitialError, isFetching } = useGuardedQuery<{ fresh: number }>(
    {
      queryKey: ["rfid-scans", "cursor", soloMatch, lector, session],
      queryFn: async () => {
        if (cursorRef.current.session !== session) cursorRef.current = { session, cursor: null };
        // Páginas llenas seguidas hasta vaciar lo nuevo (`drainFeedAfterCursor`).
        const next = await drainFeedAfterCursor(cursorRef.current.cursor, async (current) => {
          const { scans } = await fetchRfidScans({
            soloMatch,
            lector,
            limite: RFID_FEED_CURSOR_LIMIT,
            ...(current === null ? {} : { despuesDeId: current }),
          });
          return scans;
        });
        // Solo si la sesión sigue siendo esta: una respuesta tardía no mueve otra.
        if (cursorRef.current.session === session) cursorRef.current = { session, cursor: next.cursor };
        // A la bandeja aunque la lectura ya esté en pausa: el cursor ya pasó por ahí.
        if (next.fresh.length > 0) {
          outbox.push(next.fresh);
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

  return { outbox, version, isInitialError, isFetching };
}
