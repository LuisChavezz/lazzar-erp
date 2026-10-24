"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useShippingOnboarding } from "./useShippingOnboarding";
import { useCreateShipping, type ParsedShipmentError } from "./useCreateShipping";
import {
  CreateShipmentPayloadSchema,
  type CreateShipmentPayloadValues,
} from "../schemas/shipping.schema";
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
  const [guia, setGuiaState] = useState("");
  // Confirmación de "registrar sin guía": la guía no se puede agregar después
  // (`Despacho` no tiene `PATCH`), así que un envío sin ella se confirma aparte.
  const [confirmWithoutGuiaOpen, setConfirmWithoutGuiaOpen] = useState(false);
  const submitInFlight = useRef(false);

  // Onboarding con alcance al packing elegido (elegibilidad por línea, caché
  // mínima). Con `selectedPackingId` en `null` la llave y la petición son las
  // del catálogo a secas, que el selector ya tiene en caché — no se dispara
  // una petición extra (ver `useShippingOnboarding`).
  const { data, isLoading, isError, error, refetch, isFetching } =
    useShippingOnboarding(selectedPackingId);

  const packing = data?.packing ?? null;
  const rows: ShipmentOnboardingLine[] = selectedPackingId ? data?.despacho_detalle ?? [] : [];

  const embarque = selectedPackingId ? data?.embarque ?? null : null;

  // `useMemo` (no derivación suelta): es dependencia del efecto de
  // reconciliación y debe cambiar solo cuando cambian `data` o el packing
  // elegido —React Query hace structural sharing de `data`—, no en cada render.
  const availableIds = useMemo(
    () =>
      new Set(
        (selectedPackingId ? data?.despacho_detalle ?? [] : [])
          .filter((row) => row.disponible_para_despacho)
          .map((row) => row.packing_detalle),
      ),
    [data, selectedPackingId],
  );
  const availableRowsCount = availableIds.size;
  const alreadyShippedCount = rows.filter((row) => row.ya_despachado).length;

  // Sin embarque parcial y con el pedido ya despachable, el backend exige que
  // el despacho lleve TODAS las líneas pendientes del packing. Se marcan solas
  // y no se pueden quitar: dejar elegir solo para rebotar en el POST no
  // aportaría nada.
  const allLinesRequired =
    embarque !== null && !embarque.embarque_parcial && embarque.despachable;
  const effectiveCheckedIds = allLinesRequired ? availableIds : checkedIds;

  // Reconciliación: cuando cambian las filas (típicamente tras el refetch por
  // dato desactualizado, o al cambiar de packing) se descartan los ids
  // marcados que ya no existen o que dejaron de estar disponibles. Sin esto,
  // una línea despachada por otro operador seguiría contando para el botón y
  // viajaría en el POST. Equivalente al re-clamp de cantidades de packing.
  //
  // Depende de `availableIds`, memoizado sobre `data`/`selectedPackingId`, así
  // que el efecto corre solo cuando hay algo nuevo que reconciliar.
  useEffect(() => {
    setCheckedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<number>();
      for (const id of prev) if (availableIds.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [availableIds]);

  // Volver a hacer clic en el packing YA elegido no hace nada: el selector no
  // alterna la selección, así que ese clic es accidental y borrar las casillas
  // marcadas por él sería una pérdida de captura sin motivo.
  const selectPacking = (packingId: number) => {
    if (packingId === selectedPackingId) return;
    setSelectedPackingId(packingId);
    setCheckedIds(new Set());
    // La guía es de un embarque concreto: arrastrarla al siguiente lo
    // registraría con una guía ajena y sin la confirmación de "sin guía".
    setGuiaState("");
    setServerBanner(null);
    setStaleNotice(null);
  };

  const setGuia = (value: string) => {
    setGuiaState(value);
    if (serverBanner) setServerBanner(null);
  };

  const toggleLine = (packingDetalleId: number) => {
    if (allLinesRequired) return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(packingDetalleId)) next.delete(packingDetalleId);
      else next.add(packingDetalleId);
      return next;
    });
    if (serverBanner) setServerBanner(null);
  };

  const toggleAll = (checked: boolean) => {
    if (allLinesRequired) return;
    setCheckedIds(checked ? new Set(availableIds) : new Set());
    if (serverBanner) setServerBanner(null);
  };

  // Se cuenta recorriendo `rows`, NO el tamaño de `checkedIds`: tras un
  // refetch una línea puede desaparecer o volverse no disponible y dejar su id
  // huérfano en el conjunto. Contando el conjunto, el botón "Registrar"
  // quedaría habilitado por una línea que ya no se puede despachar, y
  // `buildLines` —que sí recorre `rows`— devolvería menos (o nada), sin nada
  // visible que corregir. Mismo criterio que `usePackingStep2Form`.
  const selectedCount = rows.filter(
    (row) => row.disponible_para_despacho && effectiveCheckedIds.has(row.packing_detalle),
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
      if (!effectiveCheckedIds.has(row.packing_detalle)) continue;
      if (seen.has(row.packing_detalle)) continue;
      seen.add(row.packing_detalle);
      lines.push({ packing_detalle: row.packing_detalle });
    }
    return lines;
  };

  /** Valida y arma el body; ante un problema deja el banner y devuelve `null`. */
  const buildPayload = (): CreateShipmentPayloadValues | null => {
    if (!selectedPackingId) {
      setServerBanner("Selecciona un embarque para enviar.");
      return null;
    }

    const lines = buildLines();
    if (lines.length === 0) {
      setServerBanner("Marca al menos una línea para enviar.");
      return null;
    }

    // Se envía la SALIDA del parseo, no el objeto original: `z.object`
    // descarta claves desconocidas, así que el body queda garantizado a
    // `packing` + `despacho_detalle` + `guia` — `envio` no puede colarse (ver
    // `CreateShipmentPayloadSchema`). Una guía vacía se omite.
    const trimmedGuia = guia.trim();
    const parsed = CreateShipmentPayloadSchema.safeParse({
      packing: selectedPackingId,
      despacho_detalle: lines,
      ...(trimmedGuia.length > 0 ? { guia: trimmedGuia } : {}),
    });
    if (!parsed.success) {
      setServerBanner(parsed.error.issues[0]?.message ?? "Revisa los datos del envío.");
      return null;
    }
    return parsed.data;
  };

  const send = async (payload: CreateShipmentPayloadValues) => {
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      await createShipment(payload);
      onSuccess();
    } catch {
      // El error ya se repartió en `handleServerError` (banner / aviso stale) y
      // el toast lo emitió la mutación. Se cierra la confirmación para que el
      // banner quede a la vista.
      setConfirmWithoutGuiaOpen(false);
    } finally {
      submitInFlight.current = false;
    }
  };

  const handleSubmit = async () => {
    setServerBanner(null);
    const payload = buildPayload();
    if (!payload) return;
    // Sin guía se pide confirmación: no se podrá agregar después.
    if (!payload.guia) {
      setConfirmWithoutGuiaOpen(true);
      return;
    }
    await send(payload);
  };

  const confirmWithoutGuia = async () => {
    // Se vuelve a armar: las líneas pudieron cambiar por un refetch mientras
    // la confirmación estaba abierta.
    const payload = buildPayload();
    if (!payload) {
      setConfirmWithoutGuiaOpen(false);
      return;
    }
    await send(payload);
  };

  return {
    selectedPackingId,
    selectPacking,
    packing,
    rows,
    availableRowsCount,
    alreadyShippedCount,
    embarque,
    allLinesRequired,
    checkedIds: effectiveCheckedIds,
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
    guia,
    setGuia,
    confirmWithoutGuiaOpen,
    setConfirmWithoutGuiaOpen,
    confirmWithoutGuia,
    isPending,
    handleSubmit,
  };
}

/** Nombre del producto/variante de una línea candidata, para mostrar en la tabla. */
export function shipmentLineProductoNombre(row: ShipmentOnboardingLine): string {
  return row.producto_variante_nombre ?? row.producto_nombre ?? "—";
}
