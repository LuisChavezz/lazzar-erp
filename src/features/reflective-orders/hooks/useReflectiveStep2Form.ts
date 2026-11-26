"use client";

import { useMemo, useRef, useState } from "react";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getWorkOrderSaldo } from "@/src/utils/formatWorkOrderProgramado";
import { workOrderProductLabel } from "@/src/utils/workOrderProductLabel";
import {
  shouldRefreshWorkOrderBalances,
  validateWorkOrderLines,
  workOrderStaleBalancesNotice,
  workOrderLineDescripcion,
  workOrderLineSampleSku,
} from "@/src/utils/workOrderLineQuantities";
import { useWorkOrderLineSelection } from "@/src/hooks/useWorkOrderLineSelection";
import type { CreateReflectiveOrderFormValues } from "../schemas/reflective-order.schema";
import type { ReflectiveOnboardingDetalle } from "../interfaces/reflective-order.interface";
import { buildReflectiveOrderPayload } from "../utils/buildReflectiveOrderPayload";
import { useReflectiveOnboarding } from "./useReflectiveOnboarding";
import {
  useCreateReflectiveOrder,
  type ParsedReflectiveOrderError,
} from "./useCreateReflectiveOrder";

/** Igual a `ParsedReflectiveOrderError["duplicate"]`. */
type ReflectiveDuplicateState = NonNullable<ParsedReflectiveOrderError["duplicate"]>;

interface UseReflectiveStep2FormParams {
  header: CreateReflectiveOrderFormValues;
  onSuccess: () => void;
}

/**
 * Nombre legible de la línea: el de catálogo o, en una MUESTRA (sin producto,
 * EC-964), su `producto_nombre_externo`. Regla única en `workOrderProductLabel`.
 */
export const reflectiveLineProductoNombre = (
  row: ReflectiveOnboardingDetalle,
): string => workOrderProductLabel(row);

/**
 * La línea con su talla, para los avisos y el `aria-label` de la cantidad. La
 * regla es la compartida con el alta de OCM (`workOrderLineDescripcion`).
 */
export const reflectiveLineDescripcion = (row: ReflectiveOnboardingDetalle): string =>
  workOrderLineDescripcion(row);

/**
 * SKU que se pinta bajo el nombre: solo en una MUESTRA, donde es lo que la
 * identifica (`sku_muestra` de la talla). Regla compartida con el alta de OCM
 * (`workOrderLineSampleSku`).
 */
export const reflectiveLineSampleSku = (
  row: ReflectiveOnboardingDetalle,
): string | null => workOrderLineSampleSku(row);

/**
 * Etiquetas de los campos del Paso 1 a los que el backend puede atribuir un
 * `400`. El rechazo llega mientras el usuario está en el Paso 2 —donde esos
 * inputs ni siquiera existen—, así que el mensaje se nombra con la etiqueta que
 * el usuario vio al capturarlos en vez de con la clave cruda del API.
 */
const STEP1_FIELD_LABELS: Record<string, string> = {
  pedido: "Pedido",
  observaciones: "Observaciones",
};

/**
 * Paso 2 del alta de orden de reflejante: qué líneas del pedido entran en esta
 * orden y con cuántas piezas.
 *
 * ── Config por línea ────────────────────────────────────────────────────────
 * La tabla del Paso 2 muestra el `reflejante_config` de cada línea en un popover
 * (ver `ReflectiveOrderLinesTable`/`ReflectiveLineConfigPopover`): un arreglo de
 * hasta tres reflejantes con material y posición, con dos materiales en P-00027.
 * El config es UNIFORME entre las líneas de un mismo pedido, pero el popover va
 * por fila igual —colapsado en un trigger compacto— para que cada línea sea
 * autoexplicativa mientras el operador captura cantidades. La captura en sí solo
 * usa lo que varía entre líneas: producto, talla, color y cantidades.
 *
 * ── Dónde vive el estado ────────────────────────────────────────────────────
 * El ENCABEZADO vive en `ReflectiveOrderStepManager` (por eso "Regresar" lo
 * conserva); la SELECCIÓN POR LÍNEA vive aquí, en el hook del paso, que solo
 * está montado mientras el Paso 2 está en pantalla. Tiene una consecuencia
 * deliberada: regresar al Paso 1 descarta la selección, y volver a entrar la
 * vuelve a sembrar desde datos RECIÉN traídos del servidor. Con ello, cambiar de
 * pedido en el Paso 1 no puede arrastrar líneas del pedido anterior —no hay
 * estado que limpiar, porque no sobrevive—.
 *
 * ── Frescura de los saldos ──────────────────────────────────────────────────
 * Se consume el MISMO `useReflectiveOnboarding` del Paso 1 (misma llave de
 * caché): el catálogo ya trae `detalles` por pedido, así que no hay una segunda
 * petición con alcance al padre. Ese hook acota el `staleTime` a 5 s, de modo
 * que entrar al Paso 2 recarga los saldos antes de proponer cantidades.
 *
 * ── Techo por línea ─────────────────────────────────────────────────────────
 * `cantidad_pendiente` NO se valida en el esquema de Zod: es dato del servidor
 * que puede bajar entre la carga y el envío (otra OR del mismo pedido lo
 * consume). Se aplica en tres momentos: al capturar (el input clampa), al
 * reconciliar (tras un refetch, ver `useWorkOrderLineSelection`) y al enviar
 * (corte local antes del POST, `validateWorkOrderLines`). El backend sigue siendo la fuente de la verdad: pasar los
 * tres no garantiza que acepte.
 */
export function useReflectiveStep2Form({
  header,
  onSuccess,
}: UseReflectiveStep2FormParams) {
  const { pedidos, hasLoaded, isLoading, isError, refetch, isFetching } =
    useReflectiveOnboarding();

  /**
   * El pedido elegido, tal cual está HOY en el catálogo. Puede volverse `null`
   * tras un refetch: el backend excluye los pedidos que ya no tienen ninguna
   * línea pendiente, así que otro usuario pudo cubrirlo por completo mientras
   * este formulario estaba abierto.
   */
  const pedido = useMemo(
    () => pedidos.find((option) => option.id === header.pedido) ?? null,
    [pedidos, header.pedido],
  );

  const rows = useMemo(() => pedido?.detalles ?? [], [pedido]);

  /**
   * Saldo de lo programado por Mesa de Control a Reflejante (programado − ya en
   * órdenes), con la misma regla que el Paso 2 de bordado (`getWorkOrderSaldo`).
   * Topa cada línea y el total de la orden: sin él, el paso proponía todo el
   * pendiente del pedido aunque solo una parte estuviera programada a
   * Reflejante, y el POST respondía 400. `null` sin programación: sin tope.
   */
  const saldo = pedido ? getWorkOrderSaldo(pedido) : null;
  const disponible = saldo?.disponible ?? null;

  /**
   * Solo es error "de pantalla completa" cuando el onboarding NUNCA cargó. Un
   * refetch fallido con datos en caché conserva la tabla y lo capturado, y avisa
   * por toast desde `useReflectiveOnboarding` — crítico aquí, porque el 400 de
   * exceso dispara un refetch con el usuario a media captura y un fallo de red
   * en ese momento borraría todas las cantidades.
   */
  const isInitialError = isInitialLoadError(isError, hasLoaded);

  // ─── Estado de captura ─────────────────────────────────────────────────────
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  /**
   * Detalle línea por línea que acompaña al banner. Dos orígenes, mismo
   * tratamiento visual: el `detalles_exceso` del backend (strings ya formateados,
   * que NO se reinterpretan) y el corte local previo al envío.
   */
  const [issueLines, setIssueLines] = useState<string[]>([]);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<ReflectiveDuplicateState | null>(null);
  const submitInFlight = useRef(false);

  /**
   * Limpia TODO lo que afirma algo sobre el último intento: el banner, su
   * desglose y el aviso ámbar de saldos desactualizados. El aviso se incluye a
   * propósito — si sobreviviera a la corrección que lo vuelve obsoleto, se
   * quedaría en pantalla asegurando algo que ya no es cierto.
   */
  const clearIssues = () => {
    setServerBanner(null);
    setIssueLines([]);
    setStaleNotice(null);
  };

  /**
   * Selección por línea: techo `min(pendiente, disponible)`, siembra que
   * reparte lo disponible en el orden del pedido (todas las líneas que reciben
   * piezas arrancan marcadas) y reconciliación tras cada refetch. Compartida
   * con el alta de OCM, ver `useWorkOrderLineSelection`.
   */
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
  const handleServerError = (parsed: ParsedReflectiveOrderError) => {
    // Cualquier rechazo nuevo invalida el aviso del anterior — incluido el
    // camino del duplicado, que sale antes por su `return`.
    setStaleNotice(null);

    if (parsed.duplicate) {
      // Ruta hoy inalcanzable: el 409 solo se emite en el POST SIN
      // `detalles_override`, y este paso lo manda siempre. Se conserva porque el
      // que decide es el backend, no esta pantalla: si algún día vuelve a
      // emitirlo, el aviso —con su enlace a la orden existente— sigue vivo.
      setDuplicate(parsed.duplicate);
      setServerBanner(null);
      setIssueLines([]);
      return;
    }
    setDuplicate(null);

    /**
     * Errores de campo del Paso 1 (`pedido`/`observaciones`). Sus
     * inputs no están en esta pantalla, así que se nombran explícitamente en el
     * desglose: un banner suelto diciendo "Este campo es requerido" sobre una
     * tabla de prendas no le dice al usuario qué corregir ni dónde. Con el
     * nombre del campo sabe que tiene que volver al Paso 1.
     */
    const fieldMessages = Object.entries(parsed.fieldErrors)
      .filter(([, message]) => Boolean(message))
      .map(([field, message]) => `${STEP1_FIELD_LABELS[field] ?? field}: ${message}`);

    setServerBanner(
      fieldMessages.length > 0
        ? "Revisa los datos capturados en el Paso 1."
        : parsed.formError ??
            parsed.messages[0] ??
            "No se pudo crear la orden de reflejante.",
    );
    setIssueLines(parsed.excessLines ?? fieldMessages);

    // Todo 400 no de campo (exceso por línea, tope de lo programado, rechazo
    // del pedido) dice que los saldos de la pantalla ya no son los del
    // servidor: UNA sola recarga (la mutación no invalida el onboarding) y la
    // reconciliación de `useWorkOrderLineSelection` reajusta topes y
    // cantidades. La pantalla marca el refetch en curso con `isFetching`.
    if (shouldRefreshWorkOrderBalances(parsed)) {
      setStaleNotice(workOrderStaleBalancesNotice(Boolean(parsed.excessLines), "reflejante"));
      void refetch();
    }
  };

  const { mutateAsync: createOrder, isPending } =
    useCreateReflectiveOrder(handleServerError);

  // ─── Envío ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    clearIssues();
    setDuplicate(null);

    // Validación local, ya sobre el payload exacto que viajaría: cantidades
    // capturadas, techo por línea, total contra lo disponible de lo programado,
    // al menos una línea y el esquema (entero positivo, sin ids repetidos), que
    // replica lo que el serializer rechazaría bajo `detalles_override`.
    const validation = validateWorkOrderLines({
      rows,
      checkedIds,
      quantities,
      ceilings,
      saldo,
      destinoLabel: "Reflejante",
    });
    if (!validation.ok) {
      setServerBanner(validation.banner);
      setIssueLines(validation.issueLines);
      return;
    }

    // Guarda contra el doble envío: crear una orden consume un folio de la serie
    // y no existe endpoint para cancelarla.
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      await createOrder(buildReflectiveOrderPayload(header, validation.lines));
      onSuccess();
    } catch {
      // Ya repartido por `handleServerError` (banner / detalle / duplicado) y
      // notificado por toast desde la mutación.
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
    /** Recarga en curso: el Paso 2 la marca junto al aviso de saldos. */
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
