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

/**
 * Id del almacén "Producto Terminado" — confirmado estable en todos los
 * ambientes (local/staging/producción). El Paso 1 ya no deja elegir almacén
 * (ver `PickingWizardStep1`); todo picking se registra contra este almacén
 * fijo, tanto en el payload de creación como en el resumen del Paso 2.
 */
const PRODUCTO_TERMINADO_ALMACEN_ID = 1;

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
 * Normaliza una cantidad capturada contra el techo efectivo de la línea: la
 * clampa, la redondea a 4 decimales (precisión del backend) y devuelve "" si
 * queda por debajo del mínimo aceptado (0.0001). Con esto, lo que se MUESTRA, lo
 * que se CUENTA y lo que se ENVÍA siempre coinciden, y nunca se manda al backend
 * un valor que rechazaría por precisión o por mínimo.
 */
function normalizeCantidad(raw: string, techo: number): string {
  const qty = Number.parseFloat(raw);
  if (Number.isNaN(qty) || qty <= 0) return "";
  const clamped = Number(Math.min(qty, Math.max(0, techo)).toFixed(4));
  return clamped >= PICKING_MIN_CANTIDAD ? String(clamped) : "";
}

/**
 * Los DOS techos de una línea, ya resueltos en el techo efectivo que aplica la
 * UI. Son conceptos independientes:
 *
 *  - `pendiente` es del PEDIDO (lo que falta por asignar de esa talla).
 *  - `disponible` es del INVENTARIO (existencia física del almacén origen menos
 *    las reservas activas que aún la bloquean — ver `existencia_reservada`).
 *    Puede ser MENOR que el pendiente: un pedido con 50 pendientes contra 30
 *    piezas en existencia solo puede surtir 30 hoy.
 *
 * `disponible` es `null` cuando no es de fiar (ver `existenciaConfiable`), y en
 * ese caso el techo vuelve a ser solo el pendiente — el comportamiento previo.
 */
export interface PickingLineLimits {
  pendiente: number;
  disponible: number | null;
  /** Techo efectivo del input: `min(pendiente, disponible)` cuando aplica. */
  max: number;
  /** `true` cuando quien acota es la existencia, no el pendiente del pedido. */
  limitedByStock: boolean;
  /** Clave de inventario `(producto, variante)` — ver `stockKeyOf`. */
  stockKey: string;
  /** `true` si otra(s) línea(s) del pedido consumen ESTA MISMA existencia. */
  sharedPool: boolean;
}

/**
 * Clave de inventario de una línea. El backend NO calcula la existencia por
 * talla sino por el par `(producto, producto_variante)`
 * (`ExistenciaService.get_existencia_batch`), y luego COPIA las mismas cifras a
 * cada talla que comparte esa clave. Es decir: dos líneas con la misma clave no
 * tienen 10 piezas cada una, tienen 10 piezas ENTRE LAS DOS.
 *
 * Pasa sobre todo cuando `producto_variante` es nulo (el pedido no desglosa
 * variante): todas las tallas de ese producto colapsan a la clave
 * `(producto, null)`. Por eso el backend valida además la SUMA por clave y
 * rechaza con "excede la existencia disponible agregada".
 */
export const stockKeyOf = (row: PickingOnboardingTalla): string =>
  `${row.producto ?? "-"}|${row.producto_variante ?? "-"}`;

/** Nombre legible de la línea (variante si la hay, si no el producto). */
export const tallaProductoNombre = (row: PickingOnboardingTalla): string =>
  row.producto_variante_nombre ?? row.producto_nombre ?? "—";

/**
 * Cantidades en diezmilésimas (la precisión del backend, `decimal_places=4`).
 * Sumar y comparar en enteros evita que el ruido binario de los flotantes
 * (0.1 + 0.2 > 0.3) invente un exceso que no existe.
 */
const toUnits = (value: number): number => Math.round(value * 10_000);

/** Un grupo de líneas que, sumadas, exceden la existencia que comparten. */
export interface PickingOverAllocation {
  stockKey: string;
  nombre: string;
  solicitado: number;
  disponible: number;
}

function buildLineLimits(
  row: PickingOnboardingTalla,
  existenciaConfiable: boolean,
  sharedPool: boolean,
): PickingLineLimits {
  const pendiente = Number.parseFloat(row.cantidad_pendiente) || 0;
  const stockKey = stockKeyOf(row);

  if (!existenciaConfiable) {
    return {
      pendiente,
      disponible: null,
      max: pendiente,
      limitedByStock: false,
      stockKey,
      sharedPool,
    };
  }

  const disponible = Number.parseFloat(row.existencia_disponible) || 0;
  // El backend ya publica `min(pendiente, disponible)` en
  // `maximo_picking_permitido` — se re-acota contra el pendiente como guarda
  // barata por si esa semántica cambiara del lado del servidor.
  const maximo = Number.parseFloat(row.maximo_picking_permitido) || 0;
  return {
    pendiente,
    disponible,
    max: Math.max(0, Math.min(pendiente, maximo)),
    limitedByStock: disponible < pendiente,
    stockKey,
    sharedPool,
  };
}

/**
 * Construye el body de creación a partir del encabezado (que YA incluye
 * `operador`, elegido en el Paso 1 — ver `PickingWizardStep1`) + las líneas.
 * `almacen` NO viene del encabezado: siempre es el id fijo
 * `PRODUCTO_TERMINADO_ALMACEN_ID`.
 */
function buildPickingPayload(
  header: PickingHeaderValues,
  lines: CreatePickingDetalleLine[],
): CreatePickingPayload {
  const payload: CreatePickingPayload = {
    pedido: header.pedido,
    operador: header.operador,
    almacen: PRODUCTO_TERMINADO_ALMACEN_ID,
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
  // Se pide contra el MISMO almacén que viajará en el POST para que las
  // existencias anunciadas y las validadas al enviar sean del mismo almacén
  // (sin este parámetro el backend elige un candidato distinto por su cuenta).
  const { data, isLoading, isError, error, refetch, isFetching } =
    usePickingOnboarding(header.pedido, PRODUCTO_TERMINADO_ALMACEN_ID);

  const rows = useMemo(() => data?.picking_detalle ?? [], [data]);
  const pendingRowsCount = useMemo(
    () => rows.filter((r) => Number.parseFloat(r.cantidad_pendiente) > 0).length,
    [rows],
  );

  /**
   * Solo se acota por existencia si el backend confirma haber calculado contra
   * el almacén que se va a enviar. Si resolvió otro (p. ej. el usuario no tiene
   * acceso a ese almacén y el backend cayó a su candidato por defecto), sus
   * `existencia_*` describen otro inventario: acotarse a ellas podría bloquear
   * el formulario con un techo falso, así que se ignoran y se vuelve al
   * comportamiento previo (techo = pendiente).
   */
  const existenciaConfiable =
    (data?.almacen_origen?.id ?? null) === PRODUCTO_TERMINADO_ALMACEN_ID;

  const limits = useMemo(() => {
    // Cuántas líneas consumen cada clave de inventario: con más de una, el
    // "Disponible" que anuncia cada fila es un pool COMPARTIDO, no suyo.
    const rowsPerKey = new Map<string, number>();
    for (const row of rows) {
      const key = stockKeyOf(row);
      rowsPerKey.set(key, (rowsPerKey.get(key) ?? 0) + 1);
    }

    const map: Record<string, PickingLineLimits> = {};
    for (const row of rows) {
      const sharedPool = (rowsPerKey.get(stockKeyOf(row)) ?? 0) > 1;
      map[String(row.pedido_detalle_talla)] = buildLineLimits(
        row,
        existenciaConfiable,
        sharedPool,
      );
    }
    return map;
  }, [rows, existenciaConfiable]);

  /**
   * Líneas que de verdad se pueden capturar hoy (techo efectivo > 0). Difiere
   * de `pendingRowsCount` cuando el pedido tiene pendientes pero el almacén no
   * tiene existencia: sin este conteo la pantalla quedaría con todas las filas
   * deshabilitadas y sin explicación arriba.
   */
  const capturableRowsCount = useMemo(
    () => Object.values(limits).filter((limit) => limit.max > 0).length,
    [limits],
  );

  // Resumen del encabezado, resuelto desde la MISMA respuesta del onboarding del
  // pedido (que trae `pedido` y la lista de `almacenes`) — sin threading extra.
  // El almacén ya no es una elección del Paso 1: se busca el nombre del almacén
  // fijo (`PRODUCTO_TERMINADO_ALMACEN_ID`) solo para mostrarlo en el resumen.
  const pedido = data?.pedido ?? null;
  const almacenNombre = useMemo(
    () => data?.almacenes.find((a) => a.id === PRODUCTO_TERMINADO_ALMACEN_ID)?.nombre ?? "—",
    [data],
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

  /**
   * Grupos cuya SUMA capturada excede la existencia que COMPARTEN.
   *
   * El techo por fila (`limits[].max`) no puede detectar esto: cada fila
   * respeta su propio máximo y aun así el conjunto se pasa —tres tallas del
   * mismo producto a 10 c/u contra 10 piezas totales—. Sin esta comprobación
   * la UI daría por bueno un envío que el backend SIEMPRE rechaza (con su
   * validación agregada), y el usuario no tendría forma de saber cuál bajar.
   *
   * Se calcula sobre las cantidades YA normalizadas —las mismas que arma
   * `buildLines`—, para que lo que se valida aquí sea exactamente lo que se
   * enviaría.
   */
  const overAllocations = useMemo<PickingOverAllocation[]>(() => {
    if (!existenciaConfiable) return [];

    const solicitadoUnits = new Map<string, number>();
    const disponibleByKey = new Map<string, number>();
    const nombreByKey = new Map<string, string>();

    for (const row of rows) {
      const key = String(row.pedido_detalle_talla);
      const limit = limits[key];
      if (!limit || limit.disponible === null) continue;

      disponibleByKey.set(limit.stockKey, limit.disponible);
      if (!nombreByKey.has(limit.stockKey)) {
        nombreByKey.set(limit.stockKey, tallaProductoNombre(row));
      }

      const cantidad = Number.parseFloat(
        normalizeCantidad(quantities[key] ?? "", limit.max),
      );
      if (!Number.isNaN(cantidad) && cantidad > 0) {
        solicitadoUnits.set(
          limit.stockKey,
          (solicitadoUnits.get(limit.stockKey) ?? 0) + toUnits(cantidad),
        );
      }
    }

    const result: PickingOverAllocation[] = [];
    for (const [stockKey, units] of solicitadoUnits) {
      const disponible = disponibleByKey.get(stockKey) ?? 0;
      if (units > toUnits(disponible)) {
        result.push({
          stockKey,
          nombre: nombreByKey.get(stockKey) ?? "—",
          solicitado: units / 10_000,
          disponible,
        });
      }
    }
    return result;
  }, [rows, limits, quantities, existenciaConfiable]);

  // Reconciliación: cuando cambian los techos (típicamente tras el refetch por
  // dato desactualizado, ya sea porque bajó el pendiente o porque bajó la
  // existencia), se re-clampan las cantidades ya capturadas al nuevo techo. Así
  // el input nunca queda mostrando 5 cuando el techo bajó a 2 —lo mostrado no
  // puede divergir de lo que se enviará—. Solo corre cuando `limits` cambia (no
  // mientras el usuario escribe) y no dispara re-render si nada cambia.
  useEffect(() => {
    setQuantities((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [key, limit] of Object.entries(limits)) {
        const raw = next[key];
        if (!raw) continue;
        const normalized = normalizeCantidad(raw, limit.max);
        if (normalized !== raw) {
          next[key] = normalized;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [limits]);

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
      // Dato desactualizado: NO es un error terminal. Cubre las DOS causas —
      // bajó el pendiente del pedido (otro surtido) o bajó la existencia
      // disponible del almacén (otra reserva/movimiento)—. Se recargan los
      // datos y se avisa de forma informativa; el toast neutro lo emite la
      // mutación.
      setServerBanner(null);
      setStaleNotice(
        "Las cantidades disponibles cambiaron (otro surtido o movimiento de inventario las modificó). Se actualizaron los datos: revisa y vuelve a registrar.",
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
  /**
   * Arma `picking_detalle`. Cada línea lleva EXACTAMENTE tres campos
   * (`pedido_detalle_talla`, `cantidad_asignada` y `observaciones` opcional):
   * no hay estado de formulario del que se pueda colar nada más, porque las
   * únicas fuentes son `quantities` y `observaciones`.
   *
   * En particular, NUNCA se emiten las banderas
   * `generar_orden_bordado`/`generar_orden_reflejante`/`generar_orden_corte_manga`:
   * el backend las acepta y responde 201, pero las descarta en silencio sin
   * crear ninguna orden de trabajo. Ver `CreatePickingPayload`.
   */
  const buildLines = (): CreatePickingDetalleLine[] => {
    const lines: CreatePickingDetalleLine[] = [];
    for (const row of rows) {
      const key = String(row.pedido_detalle_talla);
      // `normalizeCantidad` reclampa contra el techo ACTUAL (pendiente acotado
      // por la existencia disponible), redondea a 4 decimales y descarta lo que
      // quede bajo el mínimo (defensa ante un techo que bajó tras un refetch
      // con el valor capturado aún en memoria).
      const cantidad = normalizeCantidad(quantities[key] ?? "", limits[key]?.max ?? 0);
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

    // Corte local ANTES de enviar: el backend rechazaría este envío por su
    // validación agregada, y ese rechazo no es recuperable recargando (los
    // números del servidor no cambiaron). Más vale decir aquí exactamente qué
    // producto bajar que gastar el viaje.
    if (overAllocations.length > 0) {
      setServerBanner(
        overAllocations
          .map(
            (over) =>
              `«${over.nombre}»: capturaste ${over.solicitado} pero solo hay ${over.disponible} disponibles, compartidos entre sus tallas.`,
          )
          .join(" "),
      );
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
    limits,
    overAllocations,
    pendingRowsCount,
    capturableRowsCount,
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
