"use client";

import { useMemo, useRef, useState } from "react";
import { useShippingOnboarding } from "./useShippingOnboarding";
import { useCreateShipping, type ParsedShipmentError } from "./useCreateShipping";
import {
  CreateShipmentPayloadSchema,
  type CreateShipmentPayloadValues,
  type ShipmentPaqueteria,
  type ShipmentTipoEnvio,
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
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const [guia, setGuiaState] = useState("");
  // Cómo sale: por paquetería (paquetería + guía obligatorias) o local (chofer
  // obligatorio). Sin estos datos el envío no sale.
  const [tipoEnvio, setTipoEnvioState] = useState<ShipmentTipoEnvio>("PAQUETERIA");
  const [paqueteria, setPaqueteriaState] = useState<ShipmentPaqueteria | null>(null);
  const [chofer, setChoferState] = useState<number | null>(null);
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

  // El packing ya confirmó qué va en cada caja y el envío no lo revalida:
  // sale TODO lo disponible, sin casillas. Tras un refetch, `availableIds`
  // ya excluye lo que despachó otro registro.
  const effectiveCheckedIds = availableIds;

  // Volver a hacer clic en el packing YA elegido no hace nada.
  // `null` = volver al selector ("Cambiar").
  const selectPacking = (packingId: number | null) => {
    if (packingId === selectedPackingId) return;
    setSelectedPackingId(packingId);
    // La guía es de un embarque concreto: arrastrarla al siguiente lo
    // registraría con una guía ajena y sin la confirmación de "sin guía".
    setGuiaState("");
    setPaqueteriaState(null);
    setChoferState(null);
    setServerBanner(null);
    setStaleNotice(null);
  };

  const setTipoEnvio = (value: ShipmentTipoEnvio) => {
    setTipoEnvioState(value);
    if (serverBanner) setServerBanner(null);
  };
  const setPaqueteria = (value: ShipmentPaqueteria) => {
    setPaqueteriaState(value);
    if (serverBanner) setServerBanner(null);
  };
  const setChofer = (value: number) => {
    setChoferState(value);
    if (serverBanner) setServerBanner(null);
  };

  /** Lo que falta para poder registrar (null = listo). Un solo mensaje, en orden. */
  let transporteFaltante: string | null = null;
  if (tipoEnvio === "PAQUETERIA") {
    if (!paqueteria) transporteFaltante = "Elige la paquetería";
    else if (!guia.trim()) transporteFaltante = "Captura la guía";
  } else if (chofer === null) {
    transporteFaltante = "Elige el chofer que lo lleva";
  }

  const setGuia = (value: string) => {
    setGuiaState(value);
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

    if (transporteFaltante) {
      setServerBanner(`${transporteFaltante} para que el envío pueda salir.`);
      return null;
    }

    // Se envía la SALIDA del parseo, no el objeto original: `z.object`
    // descarta claves desconocidas, así que `envio` no puede colarse (ver
    // `CreateShipmentPayloadSchema`). La guía solo aplica a paquetería.
    const trimmedGuia = tipoEnvio === "PAQUETERIA" ? guia.trim() : "";
    const transporte =
      tipoEnvio === "PAQUETERIA"
        ? { tipo_envio: tipoEnvio, paqueteria: paqueteria ?? undefined }
        : { tipo_envio: tipoEnvio, chofer: chofer ?? undefined };
    const parsed = CreateShipmentPayloadSchema.safeParse({
      packing: selectedPackingId,
      despacho_detalle: lines,
      ...(trimmedGuia.length > 0 ? { guia: trimmedGuia } : {}),
      ...transporte,
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
      // el toast lo emitió la mutación.
    } finally {
      submitInFlight.current = false;
    }
  };

  const handleSubmit = async () => {
    setServerBanner(null);
    const payload = buildPayload();
    if (!payload) return;
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
    tipoEnvio,
    setTipoEnvio,
    paqueteria,
    setPaqueteria,
    chofer,
    setChofer,
    choferes: data?.choferes ?? [],
    transporteFaltante,
    isPending,
    handleSubmit,
  };
}

/** Nombre del producto/variante de una línea candidata, para mostrar en la tabla. */
export function shipmentLineProductoNombre(row: ShipmentOnboardingLine): string {
  return row.producto_variante_nombre ?? row.producto_nombre ?? "—";
}
