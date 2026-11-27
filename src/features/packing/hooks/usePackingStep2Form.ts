"use client";

import { useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { usePackingOnboarding } from "./usePackingOnboarding";
import { useCreatePacking, type ParsedPackingError } from "./useCreatePacking";
import {
  createEmptyPackingHeaderValues,
  PackingHeaderSchema,
  type PackingHeaderValues,
} from "../schemas/packing.schema";
import type { CreatePackingCaja, CreatePackingPayload } from "../interfaces/packing.interface";
import type { PackingOnboardingLine } from "../interfaces/packing-onboarding.interface";
import {
  boxesStatus,
  buildCajasPayload,
  boxPieces,
  fillRemaining,
  lineTotals,
  newPackingBox,
  totalPeso,
  type PackingBox,
  type PackingBoxLine,
} from "../utils/packingBoxes";

interface UsePackingStep2FormParams {
  pickingId: number;
  onSuccess: () => void;
}

/**
 * Por qué NINGUNA línea tiene pendiente por empacar — solo tiene sentido
 * cuando `rows.length > 0` (un picking sin líneas es un caso aparte, ver
 * `PackingWizardStep2`). Un picking real solo debería caer en una causa
 * (`cantidad_asignada` se fija una sola vez al crear el picking, no se
 * incrementa después), pero `"mixed"` cubre el caso defensivo de que no todas
 * las líneas compartan la misma causa, sin intentar explicar el detalle:
 *
 *  - `"fully-packed"`: hubo asignación (`cantidad_asignada > 0`) y ya se
 *    empacó todo lo asignado (`cantidad_ya_empacada` la agotó).
 *  - `"never-assigned"`: nunca hubo nada que empacar en primer lugar
 *    (`cantidad_asignada === 0`) — típicamente un picking generado ANTES del
 *    rediseño de surtido parcial (24-jul-2026), cuyas líneas nunca recibieron
 *    una asignación real.
 *  - `"mixed"`: las líneas en cero no comparten la misma causa.
 */
export type PackingZeroPendingCause = "fully-packed" | "never-assigned" | "mixed";

/**
 * Body de creación por cajas: el backend deriva `numero_cajas`, `peso_total`
 * y las líneas con su caja a partir de `cajas`, así que no se mandan aparte.
 */
function buildPackingPayload(
  pickingId: number,
  observaciones: string,
  cajas: CreatePackingCaja[],
): CreatePackingPayload {
  const payload: CreatePackingPayload = { picking: pickingId, cajas };
  const obs = observaciones.trim();
  if (obs.length > 0) payload.observaciones = obs;
  return payload;
}

export function usePackingStep2Form({ pickingId, onSuccess }: UsePackingStep2FormParams) {
  // ─── Onboarding del picking elegido (pendiente por línea, caché mínima) ────
  const { data, isLoading, isError, error, refetch, isFetching } =
    usePackingOnboarding(pickingId);

  const rows = useMemo(() => data?.packing_detalle ?? [], [data]);
  const pendingRowsCount = useMemo(
    () => rows.filter((r) => Number.parseFloat(r.cantidad_pendiente_empacar) > 0).length,
    [rows],
  );
  const picking = data?.picking ?? null;

  // Solo se evalúa cuando HAY líneas pero NINGUNA tiene pendiente — un picking
  // sin líneas en absoluto (`rows.length === 0`) es un caso aparte, sin causa
  // que clasificar (ver `PackingWizardStep2`). `safeParseAmount` (mismo
  // utilitario que ya usa `formatExactQuantityValue` en esta vista) en vez de
  // comparar los strings decimales directamente.
  const zeroPendingCause = useMemo<PackingZeroPendingCause | null>(() => {
    if (rows.length === 0 || pendingRowsCount > 0) return null;
    if (rows.every((r) => safeParseAmount(r.cantidad_asignada) === 0)) return "never-assigned";
    if (rows.every((r) => safeParseAmount(r.cantidad_asignada) > 0)) return "fully-packed";
    return "mixed";
  }, [rows, pendingRowsCount]);

  // ─── Encabezado propio de packing (numero_cajas/peso/volumen/observaciones) ─
  const [header, setHeaderState] = useState<PackingHeaderValues>(createEmptyPackingHeaderValues);

  // ─── Cajas del embarque: qué lleva cada una y cuánto pesa ──────────────────
  const [boxes, setBoxesState] = useState<PackingBox[]>(() => [newPackingBox()]);
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const submitInFlight = useRef(false);

  // Editar el encabezado quita el banner: un error ya corregido no se queda.
  const setHeader = (update: SetStateAction<PackingHeaderValues>) => {
    setHeaderState(update);
    if (serverBanner) setServerBanner(null);
  };

  const setBoxes = (update: SetStateAction<PackingBox[]>) => {
    setBoxesState(update);
    if (serverBanner) setServerBanner(null);
  };

  // Líneas con pendiente, en la forma que usa el reparto por cajas.
  const boxLines = useMemo<PackingBoxLine[]>(
    () =>
      rows
        .map((r) => ({ key: String(r.picking_detalle), pendiente: Number.parseFloat(r.cantidad_pendiente_empacar) || 0 }))
        .filter((l) => l.pendiente > 0),
    [rows],
  );

  // Con una sola caja y nada capturado, todo va en ella: el caso común no
  // pide teclear nada. Se repite tras un refetch si la caja sigue vacía.
  useEffect(() => {
    setBoxesState((prev) =>
      prev.length === 1 && boxPieces(prev[0]) === 0 && boxLines.length > 0
        ? fillRemaining(prev, 0, boxLines)
        : prev,
    );
  }, [boxLines]);

  const status = useMemo(() => boxesStatus(boxes, boxLines), [boxes, boxLines]);
  const totals = useMemo(() => lineTotals(boxes, boxLines), [boxes, boxLines]);
  const pesoTotal = totalPeso(boxes);
  const selectedCount = Object.keys(totals).length;

  // ─── Reparto del error del backend ──────────────────────────────────────────
  const handleServerError = (parsed: ParsedPackingError) => {
    if (parsed.staleData) {
      // Dato desactualizado: NO es un error terminal. Se recargan los
      // pendientes y se avisa de forma informativa.
      setServerBanner(null);
      setStaleNotice(
        "Las cantidades pendientes por empacar cambiaron (otro embarque las modificó). Se actualizaron los datos: revisa y vuelve a registrar.",
      );
      void refetch();
      return;
    }
    setStaleNotice(null);
    setServerBanner(parsed.formError ?? parsed.messages[0] ?? "Error al registrar el embarque.");
  };

  const { mutateAsync: createPacking, isPending } = useCreatePacking(handleServerError);

  // ─── Construcción de líneas + envío ─────────────────────────────────────────
  const handleSubmit = async () => {
    setServerBanner(null);

    // El encabezado se valida en el ENVÍO (no vive en TanStack Form como el
    // resto de formularios del proyecto, sino en `useState`, así que no hay
    // validación por campo al teclear). Sin esto, el schema sería solo un
    // tipo y el rechazo llegaría del backend como un 400.
    if (status.excedidas.length > 0) {
      setServerBanner("Hay prendas con más piezas en cajas de las que faltan por empacar. Corrige las marcadas en rojo.");
      return;
    }
    if (status.cajasVacias.length > 0) {
      setServerBanner(status.cajasVacias.length === 1 ? `La caja ${status.cajasVacias[0]} está vacía: acomoda prendas en ella o quítala.` : `Las cajas ${status.cajasVacias.join(", ")} están vacías: acomoda prendas en ellas o quítalas.`);
      return;
    }
    if (status.cajasSinPeso.length > 0) {
      setServerBanner(status.cajasSinPeso.length === 1 ? `Captura el peso de la caja ${status.cajasSinPeso[0]}.` : `Captura el peso de las cajas ${status.cajasSinPeso.join(", ")}.`);
      return;
    }
    // Cajas y peso salen del reparto, no se teclean aparte.
    const parsedHeader = PackingHeaderSchema.safeParse({
      ...header,
      numero_cajas: String(boxes.length),
      peso_total: pesoTotal === null ? "" : String(pesoTotal),
    });
    if (!parsedHeader.success) {
      setServerBanner(parsedHeader.error.issues[0]?.message ?? "Revisa los datos del embarque.");
      return;
    }

    const cajas = buildCajasPayload(boxes, boxLines);
    if (cajas.every((c) => c.contenido.length === 0)) {
      setServerBanner("Captura al menos una línea con una cantidad mayor a cero.");
      return;
    }

    if (submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      await createPacking(buildPackingPayload(pickingId, parsedHeader.data.observaciones, cajas));
      onSuccess();
    } catch {
      // El error ya se repartió en `handleServerError` (banner / aviso stale) y
      // el toast lo emitió la mutación.
    } finally {
      submitInFlight.current = false;
    }
  };

  return {
    rows,
    pendingRowsCount,
    zeroPendingCause,
    picking,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    header,
    setHeader,
    boxes,
    setBoxes,
    boxLines,
    status,
    pesoTotal,
    selectedCount,
    serverBanner,
    dismissBanner: () => setServerBanner(null),
    staleNotice,
    dismissStaleNotice: () => setStaleNotice(null),
    isPending,
    handleSubmit,
  };
}

/** Nombre del producto/variante de una línea candidata, para mostrar en la tabla. */
export function packingLineProductoNombre(row: PackingOnboardingLine): string {
  return row.producto_variante_nombre ?? row.producto_nombre ?? "—";
}
