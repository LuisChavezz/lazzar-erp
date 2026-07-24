"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePickingOnboarding } from "./usePickingOnboarding";
import { useCreatePicking, type ParsedPickingError } from "./useCreatePicking";
import { PICKING_MIN_CANTIDAD, type PickingHeaderValues } from "../schemas/picking.schema";
import type {
  CreatePickingDetalleLine,
  CreatePickingPayload,
} from "../interfaces/picking.interface";
import type { PickingOnboardingTalla } from "../interfaces/picking-onboarding.interface";

interface UsePickingStep2FormParams {
  header: PickingHeaderValues;
  onSuccess: () => void;
}

/**
 * Los errores de inventario del backend traen el id CRUDO del producto/variante
 * (`...con id 1234.`), no un nombre. Se resuelve a un nombre amigable con los
 * datos ya cargados del onboarding, sin pedir nada extra al servidor.
 */
function friendlyReservaMessage(
  message: string,
  rows: PickingOnboardingTalla[],
): string {
  return message.replace(/con id (\d+)/i, (match, idStr: string) => {
    const id = Number(idStr);
    const byVariante = rows.find((r) => r.producto_variante === id);
    const byProducto = rows.find((r) => r.producto === id);
    const nombre =
      byVariante?.producto_variante_nombre ??
      byVariante?.producto_nombre ??
      byProducto?.producto_nombre ??
      null;
    return nombre ? `«${nombre}» (id ${idStr})` : match;
  });
}

/**
 * Normaliza una cantidad capturada contra el pendiente actual: la clampa al
 * techo, la redondea a 4 decimales (precisión del backend) y devuelve "" si
 * queda por debajo del mínimo aceptado (0.0001). Con esto, lo que se MUESTRA, lo
 * que se CUENTA y lo que se ENVÍA siempre coinciden, y nunca se manda al backend
 * un valor que rechazaría por precisión o por mínimo.
 */
function normalizeCantidad(raw: string, pendiente: number): string {
  const qty = Number.parseFloat(raw);
  if (Number.isNaN(qty) || qty <= 0) return "";
  const clamped = Number(Math.min(qty, Math.max(0, pendiente)).toFixed(4));
  return clamped >= PICKING_MIN_CANTIDAD ? String(clamped) : "";
}

/**
 * Construye el body de creación a partir del encabezado (que YA incluye
 * `operador`, elegido en el Paso 1 — ver `PickingWizardStep1`) + las líneas.
 */
function buildPickingPayload(
  header: PickingHeaderValues,
  lines: CreatePickingDetalleLine[],
): CreatePickingPayload {
  const payload: CreatePickingPayload = {
    pedido: header.pedido,
    operador: header.operador,
    almacen: header.almacen,
    prioridad: header.prioridad,
    tipo: header.tipo,
    picking_detalle: lines,
  };
  const observaciones = header.observaciones.trim();
  if (observaciones.length > 0) payload.observaciones = observaciones;
  return payload;
}

export function usePickingStep2Form({ header, onSuccess }: UsePickingStep2FormParams) {
  // ─── Onboarding del pedido elegido (pendiente por talla, caché mínima) ─────
  const { data, isLoading, isError, error, refetch, isFetching } =
    usePickingOnboarding(header.pedido);

  const rows = useMemo(() => data?.picking_detalle ?? [], [data]);
  const pendingRowsCount = useMemo(
    () => rows.filter((r) => Number.parseFloat(r.cantidad_pendiente) > 0).length,
    [rows],
  );

  // Resumen del encabezado, resuelto desde la MISMA respuesta del onboarding del
  // pedido (que trae `pedido` y la lista de `almacenes`) — sin threading extra.
  const pedido = data?.pedido ?? null;
  const almacenNombre = useMemo(
    () => data?.almacenes.find((a) => a.id === header.almacen)?.nombre ?? "—",
    [data, header.almacen],
  );

  // ─── Estado de captura ─────────────────────────────────────────────────────
  // Mapas indexados por `pedido_detalle_talla` (string). "" = no surtir.
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const submitInFlight = useRef(false);

  const setQuantity = (tallaId: number, value: string) => {
    setQuantities((prev) => ({ ...prev, [String(tallaId)]: value }));
    if (serverBanner) setServerBanner(null);
  };

  const setObservacion = (tallaId: number, value: string) => {
    setObservaciones((prev) => ({ ...prev, [String(tallaId)]: value }));
  };

  // Reconciliación: cuando cambian los pendientes (típicamente tras el refetch
  // por dato desactualizado), se re-clampan las cantidades ya capturadas al nuevo
  // pendiente. Así el input nunca queda mostrando 5 cuando el pendiente bajó a 2
  // —lo mostrado no puede divergir de lo que se enviará—. Solo corre cuando `rows`
  // cambia (no mientras el usuario escribe) y no dispara re-render si nada cambia.
  useEffect(() => {
    setQuantities((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const row of rows) {
        const key = String(row.pedido_detalle_talla);
        const raw = next[key];
        if (!raw) continue;
        const pendiente = Number.parseFloat(row.cantidad_pendiente) || 0;
        const normalized = normalizeCantidad(raw, pendiente);
        if (normalized !== raw) {
          next[key] = normalized;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rows]);

  const selectedCount = useMemo(
    () =>
      Object.values(quantities).filter(
        (v) => Number.parseFloat(v) >= PICKING_MIN_CANTIDAD,
      ).length,
    [quantities],
  );

  // ─── Reparto del error del backend ─────────────────────────────────────────
  const handleServerError = (parsed: ParsedPickingError) => {
    if (parsed.staleData) {
      // Dato desactualizado: NO es un error terminal. Se recargan los pendientes
      // y se avisa de forma informativa; el toast neutro lo emite la mutación.
      setServerBanner(null);
      setStaleNotice(
        "Las cantidades pendientes cambiaron (otro surtido las modificó). Se actualizaron los datos: revisa y vuelve a registrar.",
      );
      void refetch();
      return;
    }
    setStaleNotice(null);
    const raw = parsed.formError ?? parsed.messages[0] ?? "Error al registrar el picking.";
    setServerBanner(friendlyReservaMessage(raw, rows));
  };

  const { mutateAsync: createPicking, isPending } =
    useCreatePicking(handleServerError);

  // ─── Construcción de líneas + envío ────────────────────────────────────────
  const buildLines = (): CreatePickingDetalleLine[] => {
    const lines: CreatePickingDetalleLine[] = [];
    for (const row of rows) {
      const key = String(row.pedido_detalle_talla);
      // `normalizeCantidad` reclampa contra el pendiente ACTUAL, redondea a 4
      // decimales y descarta lo que quede bajo el mínimo (defensa ante un
      // pendiente que bajó tras un refetch con el valor capturado aún en memoria).
      const pendiente = Number.parseFloat(row.cantidad_pendiente) || 0;
      const cantidad = normalizeCantidad(quantities[key] ?? "", pendiente);
      if (cantidad === "") continue;

      const obs = (observaciones[key] ?? "").trim();
      lines.push({
        pedido_detalle_talla: row.pedido_detalle_talla,
        cantidad_asignada: cantidad,
        ...(obs.length > 0 ? { observaciones: obs } : {}),
      });
    }
    return lines;
  };

  const handleSubmit = async () => {
    setServerBanner(null);

    const lines = buildLines();
    if (lines.length === 0) {
      setServerBanner("Captura al menos una talla con una cantidad mayor a cero.");
      return;
    }

    // `header.operador` ya viene validado (>0) por `PickingHeaderSchema` en el
    // Paso 1 antes de poder avanzar aquí — no hace falta un guard adicional.
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      await createPicking(buildPickingPayload(header, lines));
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
    pedido,
    almacenNombre,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    quantities,
    observaciones,
    setQuantity,
    setObservacion,
    selectedCount,
    serverBanner,
    dismissBanner: () => setServerBanner(null),
    staleNotice,
    dismissStaleNotice: () => setStaleNotice(null),
    isPending,
    handleSubmit,
  };
}
