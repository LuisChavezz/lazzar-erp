"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import {
  ReflectiveOrderDetallesOverrideSchema,
  type CreateReflectiveOrderFormValues,
} from "../schemas/reflective-order.schema";
import type {
  ReflectiveOnboardingDetalle,
  ReflectiveOrderDetalleOverride,
} from "../interfaces/reflective-order.interface";
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

/** Nombre legible de la línea. `producto_nombre` es nullable en el contrato. */
export const reflectiveLineProductoNombre = (
  row: ReflectiveOnboardingDetalle,
): string => row.producto_nombre ?? `Producto #${row.producto_id}`;

/**
 * Etiquetas de los campos del Paso 1 a los que el backend puede atribuir un
 * `400`. El rechazo llega mientras el usuario está en el Paso 2 —donde esos
 * inputs ni siquiera existen—, así que el mensaje se nombra con la etiqueta que
 * el usuario vio al capturarlos en vez de con la clave cruda del API.
 */
const STEP1_FIELD_LABELS: Record<string, string> = {
  pedido: "Pedido",
  prioridad: "Prioridad",
  observaciones: "Observaciones",
};

/**
 * El techo de una línea es SIEMPRE un entero de piezas: el backend rechaza
 * cualquier fraccionario (`PedidoDetalleTalla.cantidad` es un
 * `PositiveIntegerField`), así que un pendiente que llegara con decimales se
 * trunca hacia abajo — nunca hacia arriba, que propondría más de lo que hay.
 */
const ceilingOf = (row: ReflectiveOnboardingDetalle): number =>
  Math.max(0, Math.floor(row.cantidad_pendiente));

/**
 * Saneado de la cantidad capturada: solo dígitos, sin ceros a la izquierda.
 *
 * Es la barrera que hace IMPOSIBLE capturar un fraccionario, en vez de
 * detectarlo al enviar: `DecimalQuantityInput` se usa con `decimalPlaces={0}`,
 * pero su saneador interno deja un punto colgante ("1." al teclear "1.5"), y ese
 * valor a medias no debe llegar ni a la pantalla ni al payload. La validación de
 * Zod al enviar (`.int()`) queda como segunda red, no como primera.
 */
const sanitizeIntegerInput = (raw: string): string =>
  raw.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");

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
 * reconciliar (tras un refetch, `useEffect` de abajo) y al enviar (corte local
 * antes del POST). El backend sigue siendo la fuente de la verdad: pasar los
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
   * Techo por línea, indexado por `pedido_detalle_talla_id`. Es un `Map` con
   * llave NUMÉRICA, igual que `checkedIds` y `quantities`: las tres colecciones
   * describen la misma entidad y tenerlas con el mismo tipo de llave elimina los
   * `String(id)` que harían falta para cruzarlas, y con ellos la posibilidad de
   * que una consulta use el tipo equivocado y falle en silencio.
   *
   * `useMemo` aquí SÍ está justificado (pese a la regla del React Compiler en
   * CLAUDE.md): la identidad de este objeto es la dependencia del efecto de
   * reconciliación de abajo.
   */
  const ceilings = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of rows) {
      map.set(row.pedido_detalle_talla_id, ceilingOf(row));
    }
    return map;
  }, [rows]);

  /**
   * Líneas que aún se pueden programar (las demás salen deshabilitadas). Sin
   * `useMemo`: solo alimenta el render, así que el React Compiler lo memoiza por
   * su cuenta (ver CLAUDE.md, "React Compiler").
   */
  let availableRowsCount = 0;
  for (const ceiling of ceilings.values()) {
    if (ceiling > 0) availableRowsCount += 1;
  }

  /**
   * Solo es error "de pantalla completa" cuando el onboarding NUNCA cargó. Un
   * refetch fallido con datos en caché conserva la tabla y lo capturado, y avisa
   * por toast desde `useReflectiveOnboarding` — crítico aquí, porque el 400 de
   * exceso dispara un refetch con el usuario a media captura y un fallo de red
   * en ese momento borraría todas las cantidades.
   */
  const isInitialError = isInitialLoadError(isError, hasLoaded);

  // ─── Estado de captura ─────────────────────────────────────────────────────
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set());
  const [quantities, setQuantities] = useState<Map<number, string>>(() => new Map());
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
   * Siembra inicial: TODAS las líneas con pendiente arrancan marcadas y con la
   * cantidad puesta al pendiente completo (el caso "programar todo lo que
   * falta", que es el más común). El usuario reduce o desmarca desde ahí.
   *
   * Se hace UNA VEZ por pedido (guardado en un `ref`), no en cada llegada de
   * datos: un refetch posterior —el que dispara el 400 de exceso— no debe volver
   * a marcar lo que el usuario ya había desmarcado. Ajustar los valores a los
   * saldos nuevos es trabajo del efecto de reconciliación de abajo.
   */
  const seededPedidoRef = useRef<number | null>(null);
  useEffect(() => {
    if (seededPedidoRef.current === header.pedido) return;
    if (rows.length === 0) return;
    seededPedidoRef.current = header.pedido;

    const nextChecked = new Set<number>();
    const nextQuantities = new Map<number, string>();
    for (const row of rows) {
      const ceiling = ceilingOf(row);
      if (ceiling <= 0) continue;
      nextChecked.add(row.pedido_detalle_talla_id);
      nextQuantities.set(row.pedido_detalle_talla_id, String(ceiling));
    }
    setCheckedIds(nextChecked);
    setQuantities(nextQuantities);
  }, [rows, header.pedido]);

  /**
   * Reconciliación contra los saldos recién llegados: re-clampa lo capturado al
   * techo ACTUAL y desmarca lo que se quedó sin pendiente. Es lo que hace que,
   * tras el 400 de exceso (que recarga el onboarding), la pantalla muestre los
   * pendientes nuevos en vez de los que el usuario ya intentó enviar — lo
   * MOSTRADO nunca puede divergir de lo que se enviaría.
   */
  useEffect(() => {
    setQuantities((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const [id, ceiling] of ceilings) {
        const raw = next.get(id);
        if (!raw) continue;
        const captured = Number.parseInt(raw, 10);
        if (!Number.isFinite(captured)) continue;
        if (ceiling <= 0) {
          next.delete(id);
          changed = true;
        } else if (captured > ceiling) {
          next.set(id, String(ceiling));
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setCheckedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of prev) {
        if ((ceilings.get(id) ?? 0) <= 0) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [ceilings]);

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

  const toggleLine = (pedidoDetalleTallaId: number) => {
    const ceiling = ceilings.get(pedidoDetalleTallaId) ?? 0;
    if (ceiling <= 0) return;

    const wasChecked = checkedIds.has(pedidoDetalleTallaId);
    const next = new Set(checkedIds);
    if (wasChecked) next.delete(pedidoDetalleTallaId);
    else next.add(pedidoDetalleTallaId);
    setCheckedIds(next);

    setQuantities((current) => {
      const updated = new Map(current);
      if (wasChecked) {
        // Al DESMARCAR se borra la cantidad: dejarla puesta (aunque el input
        // quede deshabilitado) pintaba un número en una fila que NO viaja en
        // `detalles_override`, y la tabla se leía como si sumara piezas que no
        // suma.
        updated.delete(pedidoDetalleTallaId);
      } else if (!updated.get(pedidoDetalleTallaId)) {
        // Al re-marcar se repone el pendiente completo: una casilla marcada con
        // el input en blanco solo sirve para bloquear el envío más tarde.
        updated.set(pedidoDetalleTallaId, String(ceiling));
      }
      return updated;
    });
    clearIssues();
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setCheckedIds(new Set());
      // Mismo motivo que al desmarcar una sola línea: sin cantidades, ninguna
      // fila muestra un número que no vaya a enviarse.
      setQuantities(new Map());
      clearIssues();
      return;
    }
    const nextChecked = new Set<number>();
    const nextQuantities = new Map(quantities);
    for (const row of rows) {
      const ceiling = ceilingOf(row);
      if (ceiling <= 0) continue;
      nextChecked.add(row.pedido_detalle_talla_id);
      if (!nextQuantities.get(row.pedido_detalle_talla_id)) {
        nextQuantities.set(row.pedido_detalle_talla_id, String(ceiling));
      }
    }
    setCheckedIds(nextChecked);
    setQuantities(nextQuantities);
    clearIssues();
  };

  const setQuantity = (pedidoDetalleTallaId: number, value: string) => {
    setQuantities((prev) =>
      new Map(prev).set(pedidoDetalleTallaId, sanitizeIntegerInput(value)),
    );
    clearIssues();
  };

  const selectedCount = checkedIds.size;

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
     * Errores de campo del Paso 1 (`pedido`/`prioridad`/`observaciones`). Sus
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

    if (parsed.excessLines) {
      // Los saldos cambiaron entre la carga y el envío. La mutación ya invalidó
      // `["reflective-onboarding"]`; el `refetch` explícito garantiza que la
      // recarga ocurra aunque la invalidación no encuentre un observador activo,
      // y el efecto de reconciliación de arriba baja las cantidades capturadas a
      // los pendientes nuevos.
      //
      // El aviso está redactado en FUTURO y la pantalla marca el refetch en
      // curso con `isFetching`: la recarga tarda un par de segundos contra el
      // backend, y afirmar "se actualizaron las cantidades" mientras los inputs
      // siguen mostrando lo que el servidor acaba de rechazar invitaba a
      // reenviar exactamente el mismo payload.
      setStaleNotice(
        "Los pendientes de este pedido cambiaron (otra orden de reflejante los consumió). Se están actualizando las cantidades; revísalas antes de volver a intentar.",
      );
      void refetch();
    }
  };

  const { mutateAsync: createOrder, isPending } =
    useCreateReflectiveOrder(handleServerError);

  // ─── Envío ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    clearIssues();
    setDuplicate(null);

    const lines: ReflectiveOrderDetalleOverride[] = [];
    const missing: string[] = [];
    const over: string[] = [];

    for (const row of rows) {
      const id = row.pedido_detalle_talla_id;
      if (!checkedIds.has(id)) continue;

      const ceiling = ceilings.get(id) ?? 0;
      if (ceiling <= 0) continue;

      const raw = quantities.get(id) ?? "";
      const cantidad = Number.parseInt(raw, 10);
      const nombre = reflectiveLineProductoNombre(row);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        // Se distingue el input VACÍO del `0` explícito: decirle "sin cantidad
        // capturada" a quien está viendo un 0 en pantalla lo manda a buscar un
        // campo en blanco que no existe.
        missing.push(
          raw.trim() === ""
            ? `«${nombre}»: sin cantidad capturada.`
            : `«${nombre}»: la cantidad debe ser mayor a 0.`,
        );
        continue;
      }
      // Corte local del techo, con los saldos que la pantalla tiene AHORA.
      // Normalmente inalcanzable (el input ya clampa), pero sí ocurre cuando el
      // pendiente bajó tras un refetch con la cantidad anterior aún capturada.
      if (cantidad > ceiling) {
        over.push(
          `«${nombre}»: capturaste ${cantidad}, pero solo quedan ${ceiling} pendientes.`,
        );
        continue;
      }
      lines.push({ pedido_detalle_talla_id: id, cantidad });
    }

    if (missing.length > 0) {
      setServerBanner("Captura una cantidad mayor a cero en las líneas marcadas.");
      setIssueLines(missing);
      return;
    }

    if (over.length > 0) {
      setServerBanner(
        "Hay líneas con más piezas de las que quedan pendientes. Ajústalas antes de continuar.",
      );
      setIssueLines(over);
      return;
    }

    if (lines.length === 0) {
      setServerBanner(
        "Selecciona al menos una prenda del pedido para incluirla en la orden.",
      );
      return;
    }

    // Segunda red, ya sobre el payload exacto que viajaría: entero positivo, sin
    // ids repetidos y no vacío. Replica lo que el serializer rechazaría con un
    // 400 bajo la clave `detalles_override`.
    const parsed = ReflectiveOrderDetallesOverrideSchema.safeParse(lines);
    if (!parsed.success) {
      setServerBanner(
        parsed.error.issues[0]?.message ?? "Revisa las cantidades capturadas.",
      );
      return;
    }

    // Guarda contra el doble envío: crear una orden consume un folio de la serie
    // y no existe endpoint para cancelarla.
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      await createOrder(buildReflectiveOrderPayload(header, parsed.data));
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
