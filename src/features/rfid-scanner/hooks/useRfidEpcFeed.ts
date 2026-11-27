import { useEffect, useRef, useState } from "react";
import { useRfidScans } from "./useRfidScans";
import { useRfidCursorScans } from "./useRfidCursorScans";
import type { RfidScan } from "../interfaces/rfid-scanner.interface";
import { entregarNuevas, type RfidFeedMemory } from "../utils/rfidScansParams";

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
  {
    cursor = false,
    memoria,
    onBatchEnd,
  }: {
    cursor?: boolean;
    /**
     * Con `cursor`: memoria de la captura (`RfidFeedMemory`, `continua`) para
     * seguir el cursor y los EPC vistos entre Detener e Iniciar (EC-997). Sin
     * ella, cada sesión empieza de cero, como en el encuadre.
     */
    memoria?: RfidFeedMemory<RfidScan>;
    /**
     * Después de entregar una tanda con al menos una lectura nueva: quien
     * acumula lo de cada `onEpc` actualiza su estado UNA vez (la tira, EC-997).
     */
    onBatchEnd?: () => void;
  } = {},
) {
  // Las dos fuentes se llaman siempre (reglas de hooks); solo la elegida sondea.
  const latest = useRfidScans(enabled && !cursor, { soloMatch: true, lector });
  const afterCursor = useRfidCursorScans(enabled && cursor, { soloMatch: true, lector, memoria });
  const { scans } = latest;
  // Con cursor, solo si la sesión nunca respondió (los fallos posteriores avisan
  // con toast, `useGuardedQuery`); sin él, como siempre.
  const isError = cursor ? afterCursor.isInitialError : latest.isError;
  // `isPollFailing`: el ÚLTIMO sondeo con cursor falló, aunque la sesión ya
  // hubiera respondido. EXCEPCIÓN deliberada a la regla de CLAUDE.md de no
  // exponer el fallo de un refetch: se pidió explícitamente para el aviso
  // "sin respuesta del lector" de la tira (EC-997), porque con la antena caída
  // la captura no avanza y el toast solo sale una vez por racha. Aquí no hay
  // datos que ocultar (cada respuesta es un delta ya entregado): un consumidor
  // lo usa SOLO para ese aviso, nunca para ocultar o vaciar lo ya capturado.
  // Sin cursor no tiene consumidores (ninguna pantalla usa ya ese modo) y es
  // `false`: ese modo sigue exponiendo solo su `isError` de siempre.
  const isPollFailing = cursor && afterCursor.isPollFailing;
  // EPC ya entregados. Con cursor viven en la memoria de la captura (por sesión,
  // o por formulario si `continua`; con otro lector empiezan de cero); sin
  // cursor, por sesión de lectura (se vacían al apagar).
  const seenRef = useRef<Set<string>>(new Set());
  const onEpcRef = useRef(onEpc);
  const onBatchEndRef = useRef(onBatchEnd);
  const [count, setCount] = useState(0);

  useEffect(() => {
    onEpcRef.current = onEpc;
    onBatchEndRef.current = onBatchEnd;
  });

  const deliver = (ordered: readonly RfidScan[], vistos: Set<string>) =>
    entregarNuevas(
      ordered,
      vistos,
      (scan) => onEpcRef.current(scan),
      () => onBatchEndRef.current?.(),
    );

  // Sin cursor: las más recientes de cada sondeo, solo mientras está encendido.
  useEffect(() => {
    if (!enabled) {
      seenRef.current = new Set();
      return;
    }
    if (cursor) return;
    // Del más antiguo al más reciente, para sumar en el orden en que se leyeron.
    const nuevos = deliver([...scans].reverse(), seenRef.current);
    if (nuevos > 0) setCount((prev) => prev + nuevos);
  }, [enabled, scans, cursor]);

  // Con cursor: lo que dejó cada sondeo en la bandeja, ya en `id` ascendente
  // (EC-984), AUNQUE la lectura esté en pausa: un sondeo en vuelo al pausar ya
  // movió el cursor y sus lecturas no volverían a pedirse.
  useEffect(() => {
    if (!cursor) return;
    const nuevos = deliver(afterCursor.memory.outbox.take(), afterCursor.memory.vistos);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- contador derivado de un stream externo
    if (nuevos > 0) setCount((prev) => prev + nuevos);
  }, [cursor, afterCursor.memory, afterCursor.version]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia el contador de la sesión
    if (!enabled) setCount(0);
  }, [enabled]);

  // Con cursor, un sondeo en vuelo puede traer lecturas aun en pausa.
  return { count, isError, isPollFailing, isPolling: cursor && afterCursor.isFetching };
}
