import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRfidScans } from "../services/actions";
import { advanceFeedCursor, RFID_FEED_CURSOR_LIMIT } from "../utils/rfidScansParams";
import { RFID_SCANS_POLL_INTERVAL_MS } from "./useRfidScans";
import type { RfidScan } from "../interfaces/rfid-scanner.interface";

/**
 * Lecturas de la antena POSTERIORES al inicio de la captura (EC-982), con el
 * cursor `despues_de_id` del backend. Cada vez que `enabled` pasa a `true`
 * empieza una sesión: la primera petición solo fija el cursor (el `id` más
 * alto que ya existe, 0 sin lecturas) y las siguientes, cada 3 s, piden
 * `despues_de_id` = el `id` más alto visto, con `unicos=1&limite=200`, y
 * devuelven SOLO lo nuevo. Así nada leído antes de empezar entra a la captura.
 *
 * Una pieza que ya estaba frente a la antena al empezar puede tardar hasta
 * 30 s en salir: el backend descarta la misma etiqueta del mismo lector
 * durante 30 s (nucleo-erp#1460).
 *
 * Llave propia por sesión (no comparte caché con `useRfidScans`) y sin caché al
 * soltarla: cada respuesta es un delta, no una foto.
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

  const query = useQuery<{ scans: RfidScan[] }>({
    queryKey: ["rfid-scans", "cursor", soloMatch, lector, session],
    queryFn: async () => {
      if (cursorRef.current.session !== session) cursorRef.current = { session, cursor: null };
      const current = cursorRef.current.cursor;
      const { scans } = await fetchRfidScans({
        soloMatch,
        lector,
        limite: RFID_FEED_CURSOR_LIMIT,
        ...(current === null ? {} : { despuesDeId: current }),
      });
      const next = advanceFeedCursor(current, scans);
      // Solo si la sesión sigue siendo esta: una respuesta tardía no mueve otra.
      if (cursorRef.current.session === session) cursorRef.current = { session, cursor: next.cursor };
      return { scans: next.fresh };
    },
    enabled,
    refetchInterval: RFID_SCANS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    gcTime: 0,
    // Un fallo no mueve el cursor: el siguiente sondeo vuelve a pedir desde el mismo punto.
    retry: false,
  });

  return { scans: query.data?.scans ?? [], isError: query.isError };
}
