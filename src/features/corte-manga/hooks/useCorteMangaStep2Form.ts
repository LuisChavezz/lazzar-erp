"use client";

import { useMemo, useRef, useState } from "react";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getWorkOrderSaldo } from "@/src/utils/formatWorkOrderProgramado";
import {
  shouldRefreshWorkOrderBalances,
  validateWorkOrderLines,
  workOrderStaleBalancesNotice,
} from "@/src/utils/workOrderLineQuantities";
import { useWorkOrderLineSelection } from "@/src/hooks/useWorkOrderLineSelection";
import type { CreateCorteMangaOrderFormValues } from "../schemas/corte-manga-order.schema";
import { buildCorteMangaOrderPayload } from "../utils/buildCorteMangaOrderPayload";
import { useCorteMangaOnboarding } from "./useCorteMangaOnboarding";
import {
  useCreateCorteMangaOrder,
  type ParsedCorteMangaOrderError,
} from "./useCreateCorteMangaOrder";

/** Igual a `ParsedCorteMangaOrderError["duplicate"]`. */
type CorteMangaDuplicateState = NonNullable<ParsedCorteMangaOrderError["duplicate"]>;

interface UseCorteMangaStep2FormParams {
  header: CreateCorteMangaOrderFormValues;
  onSuccess: () => void;
}

/**
 * Etiquetas de los campos del Paso 1 a los que el backend puede atribuir un
 * `400`. El rechazo llega en el Paso 2, donde esos inputs no existen, así que
 * el mensaje se nombra con la etiqueta que el usuario vio al capturarlos.
 */
const STEP1_FIELD_LABELS: Record<string, string> = {
  pedido: "Pedido",
  observaciones: "Observaciones",
};

/**
 * Paso 2 del alta de orden de corte de manga (EC-967): qué líneas del pedido
 * entran en esta orden y con cuántas piezas.
 *
 * Lo programado por Mesa de Control a Corte de manga es UN total por pedido,
 * sin desglose por línea. Por eso cada línea se topa con
 * `min(cantidad_pendiente, disponible)`, la propuesta inicial reparte lo
 * disponible en el orden del pedido y la suma de la orden no puede pasar de lo
 * disponible: la misma regla que el Paso 2 de reflejante, compartida en
 * `useWorkOrderLineSelection` y `validateWorkOrderLines`. Sin ella, el alta de
 * un solo paso mandaba el pedido completo y el POST respondía 400 en cuanto
 * solo una parte estaba programada a Corte de manga (pedido 2136: 3 piezas, 1
 * programada).
 *
 * ── Dónde vive el estado ────────────────────────────────────────────────────
 * El ENCABEZADO vive en `CorteMangaOrderStepManager` (por eso "Regresar" lo
 * conserva); la SELECCIÓN POR LÍNEA vive aquí, en el hook del paso, que solo
 * está montado mientras el Paso 2 está en pantalla: regresar al Paso 1 la
 * descarta, y volver a entrar la siembra desde datos recién traídos.
 *
 * ── Frescura de los saldos ──────────────────────────────────────────────────
 * Se consume el MISMO `useCorteMangaOnboarding` del Paso 1 (misma llave): el
 * catálogo ya trae `detalles` por pedido, y su `staleTime` de 5 s recarga los
 * saldos al entrar al Paso 2.
 *
 * ── Techo por línea ─────────────────────────────────────────────────────────
 * Se aplica al capturar (el input clampa), al reconciliar tras un refetch y al
 * enviar. El backend sigue siendo la fuente de la verdad.
 */
export function useCorteMangaStep2Form({ header, onSuccess }: UseCorteMangaStep2FormParams) {
  const { pedidos, hasLoaded, isLoading, isError, refetch, isFetching } =
    useCorteMangaOnboarding();

  /**
   * El pedido elegido, tal cual está HOY en el catálogo. Puede volverse `null`
   * tras un refetch: el backend excluye los pedidos sin saldo de lo programado
   * o sin líneas pendientes.
   */
  const pedido = useMemo(
    () => pedidos.find((option) => option.id === header.pedido) ?? null,
    [pedidos, header.pedido],
  );

  const rows = useMemo(() => pedido?.detalles ?? [], [pedido]);

  /** Saldo de lo programado a Corte de manga; `null` sin programación (sin tope). */
  const saldo = pedido ? getWorkOrderSaldo(pedido) : null;
  const disponible = saldo?.disponible ?? null;

  /** Error "de pantalla completa" solo si el onboarding NUNCA cargó. */
  const isInitialError = isInitialLoadError(isError, hasLoaded);

  const [serverBanner, setServerBanner] = useState<string | null>(null);
  /**
   * Detalle línea por línea del banner: el `detalles_exceso` del backend
   * (strings que NO se reinterpretan) o el corte local previo al envío.
   */
  const [issueLines, setIssueLines] = useState<string[]>([]);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<CorteMangaDuplicateState | null>(null);
  const submitInFlight = useRef(false);

  /** Limpia todo lo que afirma algo sobre el último intento. */
  const clearIssues = () => {
    setServerBanner(null);
    setIssueLines([]);
    setStaleNotice(null);
  };

  const {
    ceilings,
    availableRowsCount,
    selectedCount,
    checkedIds,
    quantities,
    toggleLine,
    toggleAll,
    setQuantity,
  } = useWorkOrderLineSelection({
    rows,
    disponible,
    seedKey: header.pedido,
    onUserChange: clearIssues,
  });

  // ─── Reparto del error del backend ─────────────────────────────────────────
  // Todo mensaje del backend llega VERBATIM al banner: `err` (incluido el del
  // tope programado), el `detalles_override` del serializer y el rechazo del
  // pedido; `detalles_exceso` va completo en el desglose.
  const handleServerError = (parsed: ParsedCorteMangaOrderError) => {
    setStaleNotice(null);

    if (parsed.duplicate) {
      // Hoy inalcanzable: el 409 solo sale en el POST SIN `detalles_override`, y
      // este paso lo manda siempre. Se conserva porque decide el backend.
      setDuplicate(parsed.duplicate);
      setServerBanner(null);
      setIssueLines([]);
      return;
    }
    setDuplicate(null);

    // Errores de campo del Paso 1: sus inputs no están en esta pantalla, así
    // que se nombran en el desglose para que el usuario sepa dónde volver.
    const fieldMessages = Object.entries(parsed.fieldErrors)
      .filter(([, message]) => Boolean(message))
      .map(([field, message]) => `${STEP1_FIELD_LABELS[field] ?? field}: ${message}`);

    setServerBanner(
      fieldMessages.length > 0
        ? "Revisa los datos capturados en el Paso 1."
        : parsed.formError ?? parsed.messages[0] ?? "No se pudo crear la orden de corte de manga.",
    );
    setIssueLines(parsed.excessLines ?? fieldMessages);

    // Todo 400 no de campo (exceso por línea, tope de lo programado, rechazo
    // del pedido) dice que los saldos de la pantalla ya no son los del
    // servidor: UNA sola recarga (la mutación no invalida el onboarding) y la
    // reconciliación reajusta topes, cantidades y total.
    if (shouldRefreshWorkOrderBalances(parsed)) {
      setStaleNotice(workOrderStaleBalancesNotice(Boolean(parsed.excessLines), "corte de manga"));
      void refetch();
    }
  };

  const { mutateAsync: createOrder, isPending } = useCreateCorteMangaOrder(handleServerError);

  // ─── Envío ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    clearIssues();
    setDuplicate(null);

    const validation = validateWorkOrderLines({
      rows,
      checkedIds,
      quantities,
      ceilings,
      saldo,
      destinoLabel: "Corte de manga",
    });
    if (!validation.ok) {
      setServerBanner(validation.banner);
      setIssueLines(validation.issueLines);
      return;
    }

    // Guarda contra el doble envío: crear una orden consume un folio de la serie.
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      await createOrder(buildCorteMangaOrderPayload(header, validation.lines));
      onSuccess();
    } catch {
      // Ya repartido por `handleServerError` y notificado por toast.
    } finally {
      submitInFlight.current = false;
    }
  };

  return {
    pedido,
    saldo,
    rows,
    ceilings,
    availableRowsCount,
    selectedCount,
    checkedIds,
    quantities,
    toggleLine,
    toggleAll,
    setQuantity,
    isLoading,
    /** Error de carga INICIAL — ver `isInitialError` arriba. */
    isError: isInitialError,
    isFetching,
    serverBanner,
    issueLines,
    dismissBanner: clearIssues,
    staleNotice,
    dismissStaleNotice: () => setStaleNotice(null),
    duplicate,
    dismissDuplicate: () => setDuplicate(null),
    isPending,
    handleSubmit,
  };
}
