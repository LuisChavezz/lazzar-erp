"use client";

import { useEffect, useRef, useState } from "react";
import { useShippingOnboarding } from "./useShippingOnboarding";
import { useCreateShipping, type ParsedShipmentError } from "./useCreateShipping";
import { CreateShipmentPayloadSchema } from "../schemas/shipping.schema";
import type { CreateShipmentDetalleLine } from "../interfaces/shipping.interface";
import type { ShipmentOnboardingLine } from "../interfaces/shipping-onboarding.interface";

interface UseShippingFormParams {
  /** Se invoca tras registrar el despacho correctamente (cierra el diálogo). */
  onSuccess: () => void;
}

/**
 * Estado de la captura de despacho: packing elegido + casillas por línea.
 *
 * A diferencia de `usePackingStep2Form`/`usePickingStep2Form` aquí NO hay
 * aritmética de cantidades: despachar es binario por línea, así que la
 * captura es un conjunto de ids marcados y el "clamp" equivalente es
 * simplemente descartar los que dejaron de estar disponibles.
 */
export function useShippingForm({ onSuccess }: UseShippingFormParams) {
  const [selectedPackingId, setSelectedPackingId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set());
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const submitInFlight = useRef(false);

  // Onboarding con alcance al packing elegido (elegibilidad por línea, caché
  // mínima). Con `selectedPackingId` en `null` la llave y la petición son las
  // del catálogo a secas, que el selector ya tiene en caché — no se dispara
  // una petición extra (ver `useShippingOnboarding`).
  const { data, isLoading, isError, error, refetch, isFetching } =
    useShippingOnboarding(selectedPackingId);

  const packing = data?.packing ?? null;
  const rows: ShipmentOnboardingLine[] = selectedPackingId ? data?.despacho_detalle ?? [] : [];

  const availableRowsCount = rows.filter((row) => row.disponible_para_despacho).length;
  const alreadyShippedCount = rows.filter((row) => row.ya_despachado).length;

  // Reconciliación: cuando cambian las filas (típicamente tras el refetch por
  // dato desactualizado, o al cambiar de packing) se descartan los ids
  // marcados que ya no existen o que dejaron de estar disponibles. Sin esto,
  // una línea despachada por otro operador seguiría contando para el botón y
  // viajaría en el POST. Equivalente al re-clamp de cantidades de packing.
  //
  // Depende de `data`/`selectedPackingId`, NO de `rows`: `rows` se re-crea en
  // cada render (es una expresión condicional), mientras que `data` conserva
  // su referencia salvo que el contenido cambie de verdad —React Query hace
  // structural sharing—, así que el efecto corre solo cuando hay algo nuevo
  // que reconciliar.
  useEffect(() => {
    const availableIds = new Set(
      (selectedPackingId ? data?.despacho_detalle ?? [] : [])
        .filter((row) => row.disponible_para_despacho)
        .map((row) => row.packing_detalle),
    );
    setCheckedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<number>();
      for (const id of prev) if (availableIds.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [data, selectedPackingId]);

  // Volver a hacer clic en el packing YA elegido no hace nada: el selector no
  // alterna la selección, así que ese clic es accidental y borrar las casillas
  // marcadas por él sería una pérdida de captura sin motivo.
  const selectPacking = (packingId: number) => {
    if (packingId === selectedPackingId) return;
    setSelectedPackingId(packingId);
    setCheckedIds(new Set());
    setServerBanner(null);
    setStaleNotice(null);
  };

  const toggleLine = (packingDetalleId: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(packingDetalleId)) next.delete(packingDetalleId);
      else next.add(packingDetalleId);
      return next;
    });
    if (serverBanner) setServerBanner(null);
  };

  const toggleAll = (checked: boolean) => {
    setCheckedIds(
      checked
        ? new Set(
            rows.filter((row) => row.disponible_para_despacho).map((row) => row.packing_detalle),
          )
        : new Set(),
    );
    if (serverBanner) setServerBanner(null);
  };

  // Se cuenta recorriendo `rows`, NO el tamaño de `checkedIds`: tras un
  // refetch una línea puede desaparecer o volverse no disponible y dejar su id
  // huérfano en el conjunto. Contando el conjunto, el botón "Registrar"
  // quedaría habilitado por una línea que ya no se puede despachar, y
  // `buildLines` —que sí recorre `rows`— devolvería menos (o nada), sin nada
  // visible que corregir. Mismo criterio que `usePackingStep2Form`.
  const selectedCount = rows.filter(
    (row) => row.disponible_para_despacho && checkedIds.has(row.packing_detalle),
  ).length;

  // ─── Reparto del error del backend ────────────────────────────────────────
  const handleServerError = (parsed: ParsedShipmentError) => {
    if (parsed.staleData) {
      // Dato desactualizado: NO es un error terminal. Se recarga la
      // elegibilidad por línea (la casilla afectada quedará deshabilitada y
      // marcada como "Ya enviada") y se avisa de forma informativa.
      setServerBanner(null);
      setStaleNotice(
        "Alguna de las líneas marcadas ya había sido enviada por otro registro. Se actualizaron los datos: revisa la selección y vuelve a registrar.",
      );
      void refetch();
      return;
    }
    setStaleNotice(null);
    setServerBanner(parsed.formError ?? parsed.messages[0] ?? "Error al registrar el envío.");
  };

  const { mutateAsync: createShipment, isPending } = useCreateShipping(handleServerError);

  /**
   * Líneas a enviar. Se recorren las FILAS (no el conjunto de marcados), así
   * que el orden es el del onboarding y —al haber una fila por
   * `packing_detalle`— no puede repetirse un id. El `seen` es una salvaguarda
   * extra: el backend NO valida duplicados (enviar dos veces la misma línea
   * crea dos `DespachoDetalle`), así que ni siquiera una respuesta con filas
   * repetidas debe poder generar líneas dobles.
   */
  const buildLines = (): CreateShipmentDetalleLine[] => {
    const seen = new Set<number>();
    const lines: CreateShipmentDetalleLine[] = [];
    for (const row of rows) {
      if (!row.disponible_para_despacho) continue;
      if (!checkedIds.has(row.packing_detalle)) continue;
      if (seen.has(row.packing_detalle)) continue;
      seen.add(row.packing_detalle);
      lines.push({ packing_detalle: row.packing_detalle });
    }
    return lines;
  };

  const handleSubmit = async () => {
    setServerBanner(null);

    if (!selectedPackingId) {
      setServerBanner("Selecciona un packing para enviar.");
      return;
    }

    const lines = buildLines();
    if (lines.length === 0) {
      setServerBanner("Marca al menos una línea para enviar.");
      return;
    }

    // Se envía la SALIDA del parseo, no el objeto original: `z.object`
    // descarta claves desconocidas, así que el body queda garantizado a
    // `packing` + `despacho_detalle` — `envio` no puede colarse (ver
    // `CreateShipmentPayloadSchema`).
    const parsed = CreateShipmentPayloadSchema.safeParse({
      packing: selectedPackingId,
      despacho_detalle: lines,
    });
    if (!parsed.success) {
      setServerBanner(parsed.error.issues[0]?.message ?? "Revisa los datos del envío.");
      return;
    }

    if (submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      await createShipment(parsed.data);
      onSuccess();
    } catch {
      // El error ya se repartió en `handleServerError` (banner / aviso stale) y
      // el toast lo emitió la mutación.
    } finally {
      submitInFlight.current = false;
    }
  };

  return {
    selectedPackingId,
    selectPacking,
    packing,
    rows,
    availableRowsCount,
    alreadyShippedCount,
    checkedIds,
    toggleLine,
    toggleAll,
    selectedCount,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    serverBanner,
    dismissBanner: () => setServerBanner(null),
    staleNotice,
    dismissStaleNotice: () => setStaleNotice(null),
    isPending,
    handleSubmit,
  };
}

/** Nombre del producto/variante de una línea candidata, para mostrar en la tabla. */
export function shipmentLineProductoNombre(row: ShipmentOnboardingLine): string {
  return row.producto_variante_nombre ?? row.producto_nombre ?? "—";
}
