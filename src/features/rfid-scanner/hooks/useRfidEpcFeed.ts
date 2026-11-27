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
 * `cursor` (opcional, EC-982; hoy solo el encuadre RFID): en vez de las 50
 * lecturas más recientes, solo las posteriores al inicio de la sesión
 * (`useRfidCursorScans`), así nada leído antes de empezar entra a la captura.
 * Sin la opción todo es exactamente como antes (Nueva Recepción).
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
  const { scans } = cursor ? afterCursor : latest;
  // Con cursor, solo si la sesión nunca respondió (los fallos posteriores avisan
  // con toast, `useGuardedQuery`); sin él, como siempre.
  const isError = cursor ? afterCursor.isInitialError : latest.isError;
  const seenRef = useRef<Set<string>>(new Set());
  const onEpcRef = useRef(onEpc);
  const [count, setCount] = useState(0);

  useEffect(() => {
    onEpcRef.current = onEpc;
  });

  useEffect(() => {
    if (!enabled) {
      seenRef.current = new Set();
      return;
    }
    let nuevos = 0;
    // Del más antiguo al más reciente, para sumar en el orden en que se leyeron:
    // sin cursor llegan de la más reciente a la más antigua; con cursor, ya en
    // `id` ascendente (EC-984).
    for (const scan of cursor ? scans : [...scans].reverse()) {
      if (seenRef.current.has(scan.epc)) continue;
      seenRef.current.add(scan.epc);
      nuevos += 1;
      onEpcRef.current(scan);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- contador derivado de un stream externo
    if (nuevos > 0) setCount((prev) => prev + nuevos);
  }, [enabled, scans, cursor]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia el contador de la sesión
    if (!enabled) setCount(0);
  }, [enabled]);

  return { count, isError };
}
