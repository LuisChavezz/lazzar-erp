"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { usePackingOnboarding } from "./usePackingOnboarding";
import { useCreatePacking, type ParsedPackingError } from "./useCreatePacking";
import {
  createEmptyPackingHeaderValues,
  PACKING_HEADER_DECIMAL_PLACES,
  PACKING_MIN_CANTIDAD,
  PackingHeaderSchema,
  type PackingHeaderValues,
} from "../schemas/packing.schema";
import { toSendableDecimal } from "@/src/utils/decimal";
import type { CreatePackingDetalleLine, CreatePackingPayload } from "../interfaces/packing.interface";
import type { PackingOnboardingLine } from "../interfaces/packing-onboarding.interface";

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
 * Normaliza una cantidad capturada contra el pendiente actual: la clampa al
 * techo, la redondea a 4 decimales (precisión del backend) y devuelve "" si
 * queda por debajo del mínimo aceptado (0.0001). Con esto, lo que se MUESTRA,
 * lo que se CUENTA y lo que se ENVÍA siempre coinciden. Copia local del mismo
 * helper de `usePickingStep2Form` (misma fórmula, distinto techo).
 */
function normalizeCantidad(raw: string, pendiente: number): string {
  const qty = Number.parseFloat(raw);
  if (Number.isNaN(qty) || qty <= 0) return "";
  const clamped = Number(Math.min(qty, Math.max(0, pendiente)).toFixed(4));
  return clamped >= PACKING_MIN_CANTIDAD ? String(clamped) : "";
}

/**
 * Construye el body de creación a partir del picking elegido (Paso 1) + el
 * encabezado propio de packing (Paso 2) + las líneas. Los campos de
 * encabezado son todos opcionales en el backend — se omiten cuando quedan en
 * su valor vacío/cero para no mandar ceros/strings vacíos de más.
 */
function buildPackingPayload(
  pickingId: number,
  header: PackingHeaderValues,
  lines: CreatePackingDetalleLine[],
): CreatePackingPayload {
  const payload: CreatePackingPayload = {
    picking: pickingId,
    packing_detalle: lines,
  };
  if (header.numero_cajas > 0) payload.numero_cajas = header.numero_cajas;
  // `toSendableDecimal` (no un `.trim()` a secas) para que lo enviado sea un
  // decimal canónico: descarta lo que no sostiene un número y normaliza la
  // precisión. Un `.trim()` dejaría pasar tal cual cualquier residuo de
  // captura que el backend rechazaría al construir su `Decimal`.
  const peso = toSendableDecimal(header.peso_total, PACKING_HEADER_DECIMAL_PLACES);
  if (peso !== null) payload.peso_total = peso;
  const volumen = toSendableDecimal(header.volumen_total, PACKING_HEADER_DECIMAL_PLACES);
  if (volumen !== null) payload.volumen_total = volumen;
  const observaciones = header.observaciones.trim();
  if (observaciones.length > 0) payload.observaciones = observaciones;
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
  const [header, setHeader] = useState<PackingHeaderValues>(createEmptyPackingHeaderValues);

  // ─── Estado de captura por línea ────────────────────────────────────────────
  // Mapas indexados por `picking_detalle` (string). "" = no empacar.
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [lineObservaciones, setLineObservaciones] = useState<Record<string, string>>({});
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const submitInFlight = useRef(false);

  const setQuantity = (pickingDetalleId: number, value: string) => {
    setQuantities((prev) => ({ ...prev, [String(pickingDetalleId)]: value }));
    if (serverBanner) setServerBanner(null);
  };

  const setLineObservacion = (pickingDetalleId: number, value: string) => {
    setLineObservaciones((prev) => ({ ...prev, [String(pickingDetalleId)]: value }));
  };

  // Reconciliación: cuando cambian los pendientes (típicamente tras el refetch
  // por dato desactualizado), se re-clampan las cantidades ya capturadas al
  // nuevo pendiente — mismo patrón que `usePickingStep2Form`.
  useEffect(() => {
    setQuantities((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const row of rows) {
        const key = String(row.picking_detalle);
        const raw = next[key];
        if (!raw) continue;
        const pendiente = Number.parseFloat(row.cantidad_pendiente_empacar) || 0;
        const normalized = normalizeCantidad(raw, pendiente);
        if (normalized !== raw) {
          next[key] = normalized;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rows]);

  // Se cuenta recorriendo `rows`, NO las llaves de `quantities`: tras un
  // refetch (recuperación por dato desactualizado, o el `refetchOnMount` al
  // volver a entrar al paso) una línea puede desaparecer del picking y dejar
  // su cantidad huérfana en el mapa. Contando el mapa, el botón "Registrar"
  // quedaría habilitado por una línea que ya no existe, y `buildLines`
  // —que sí recorre `rows`— devolvería [], sin nada visible que corregir.
  const selectedCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          Number.parseFloat(quantities[String(row.picking_detalle)] ?? "") >= PACKING_MIN_CANTIDAD,
      ).length,
    [rows, quantities],
  );

  // ─── Reparto del error del backend ──────────────────────────────────────────
  const handleServerError = (parsed: ParsedPackingError) => {
    if (parsed.staleData) {
      // Dato desactualizado: NO es un error terminal. Se recargan los
      // pendientes y se avisa de forma informativa.
      setServerBanner(null);
      setStaleNotice(
        "Las cantidades pendientes por empacar cambiaron (otro packing las modificó). Se actualizaron los datos: revisa y vuelve a registrar.",
      );
      void refetch();
      return;
    }
    setStaleNotice(null);
    setServerBanner(parsed.formError ?? parsed.messages[0] ?? "Error al registrar el packing.");
  };

  const { mutateAsync: createPacking, isPending } = useCreatePacking(handleServerError);

  // ─── Construcción de líneas + envío ─────────────────────────────────────────
  const buildLines = (): CreatePackingDetalleLine[] => {
    const lines: CreatePackingDetalleLine[] = [];
    for (const row of rows) {
      const key = String(row.picking_detalle);
      // `normalizeCantidad` reclampa contra el pendiente ACTUAL, redondea a 4
      // decimales y descarta lo que quede bajo el mínimo (defensa ante un
      // pendiente que bajó tras un refetch con el valor capturado aún en
      // memoria).
      const pendiente = Number.parseFloat(row.cantidad_pendiente_empacar) || 0;
      const cantidad = normalizeCantidad(quantities[key] ?? "", pendiente);
      if (cantidad === "") continue;

      const obs = (lineObservaciones[key] ?? "").trim();
      lines.push({
        picking_detalle: row.picking_detalle,
        cantidad_empacada: cantidad,
        ...(obs.length > 0 ? { observaciones: obs } : {}),
      });
    }
    return lines;
  };

  const handleSubmit = async () => {
    setServerBanner(null);

    // El encabezado se valida en el ENVÍO (no vive en TanStack Form como el
    // resto de formularios del proyecto, sino en `useState`, así que no hay
    // validación por campo al teclear). Sin esto, el schema sería solo un
    // tipo y el rechazo llegaría del backend como un 400.
    const parsedHeader = PackingHeaderSchema.safeParse(header);
    if (!parsedHeader.success) {
      setServerBanner(parsedHeader.error.issues[0]?.message ?? "Revisa los datos del empaque.");
      return;
    }

    const lines = buildLines();
    if (lines.length === 0) {
      setServerBanner("Captura al menos una línea con una cantidad mayor a cero.");
      return;
    }

    if (submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      await createPacking(buildPackingPayload(pickingId, parsedHeader.data, lines));
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
    quantities,
    lineObservaciones,
    setQuantity,
    setLineObservacion,
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
