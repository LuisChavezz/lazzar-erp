import { useEffect, useRef, useState } from "react";
import { useRfidScans } from "./useRfidScans";
import { useRfidCursorScans } from "./useRfidCursorScans";
import type { RfidScan } from "../interfaces/rfid-scanner.interface";

/**
 * Alimenta una captura (recepción, surtido…) con las etiquetas que ve la
 * antena RFID. Mientras `enabled`, sondea `scans/?solo_match=1&unicos=1` y
 * entrega cada EPC del ERP UNA sola vez por sesión a `onEpc` — el FX reporta
 * las etiquetas presentes cada 5 s, así que sin esto una prenda frente a la
 * antena sumaría una pieza en cada ciclo. Apagar y volver a encender empieza
 * una sesión nueva.
 *
 * `cursor` (opcional, EC-982; lo usan el encuadre RFID y, desde EC-997,
 * Recepción y Surtido por `RfidFeedStrip`): en vez de las 50 lecturas más
 * recientes, solo las posteriores al inicio de la sesión (`useRfidCursorScans`),
 * así nada leído antes de empezar entra a la captura. Sin la opción, las 50
 * más recientes de cada sondeo, como antes; hoy ninguna pantalla la usa así.
 */
export function useRfidEpcFeed(
  enabled: boolean,
  onEpc: (scan: RfidScan) => void,
  lector: number | null = null,
  { cursor = false }: { cursor?: boolean } = {},
) {
  // Las dos fuentes se llaman siempre (reglas de hooks); solo la elegida sondea.
  const latest = useRfidScans(enabled && !cursor, { soloMatch: true, lector });
  const afterCursor = useRfidCursorScans(enabled && cursor, { soloMatch: true, lector });
  const { scans } = latest;
  // Con cursor, solo si la sesión nunca respondió (los fallos posteriores avisan
  // con toast, `useGuardedQuery`); sin él, como siempre.
  const isError = cursor ? afterCursor.isInitialError : latest.isError;
  // Por sesión de lectura (se vacía al apagar), NO por lector: un EPC es una
  // pieza, así que la misma prenda vista después por otro lector no suma dos veces.
  const seenRef = useRef<Set<string>>(new Set());
  const onEpcRef = useRef(onEpc);
  const [count, setCount] = useState(0);

  useEffect(() => {
    onEpcRef.current = onEpc;
  });

  const deliver = (ordered: readonly RfidScan[]) => {
    let nuevos = 0;
    for (const scan of ordered) {
      if (seenRef.current.has(scan.epc)) continue;
      seenRef.current.add(scan.epc);
      nuevos += 1;
      onEpcRef.current(scan);
    }
    return nuevos;
  };

  // Sin cursor: las más recientes de cada sondeo, solo mientras está encendido.
  useEffect(() => {
    if (!enabled) {
      seenRef.current = new Set();
      return;
    }
    if (cursor) return;
    // Del más antiguo al más reciente, para sumar en el orden en que se leyeron.
    const nuevos = deliver([...scans].reverse());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- contador derivado de un stream externo
    if (nuevos > 0) setCount((prev) => prev + nuevos);
  }, [enabled, scans, cursor]);

  // Con cursor: lo que dejó cada sondeo en la bandeja, ya en `id` ascendente
  // (EC-984), AUNQUE la lectura esté en pausa: un sondeo en vuelo al pausar ya
  // movió el cursor y sus lecturas no volverían a pedirse.
  useEffect(() => {
    if (!cursor) return;
    const nuevos = deliver(afterCursor.outbox.take());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- contador derivado de un stream externo
    if (nuevos > 0) setCount((prev) => prev + nuevos);
  }, [cursor, afterCursor.outbox, afterCursor.version]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia el contador de la sesión
    if (!enabled) setCount(0);
  }, [enabled]);

  // Con cursor, un sondeo en vuelo puede traer lecturas aun en pausa.
  return { count, isError, isPolling: cursor && afterCursor.isFetching };
}
