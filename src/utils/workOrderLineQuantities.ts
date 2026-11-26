import { z } from "zod";
import { cleanText } from "./cleanText";
import { plural } from "./plural";
import type { WorkOrderSaldo } from "./formatWorkOrderProgramado";
import { workOrderProductLabel, type WorkOrderProductNames } from "./workOrderProductLabel";

/**
 * Reglas PURAS del Paso 2 de las altas de órdenes de trabajo que capturan
 * piezas por línea contra lo programado por Mesa de Control: reflejante (OR) y
 * corte de manga (OCM). Nacieron en `useReflectiveStep2Form` (EC-965) y se
 * extrajeron aquí para el alta de OCM (EC-967) sin cambiar su comportamiento.
 *
 * Bordado (OB) NO las usa a propósito: su techo por línea es solo el pendiente
 * y topa únicamente el total de la orden.
 *
 * El contrato es el mismo en los tres backends (`detalles_override` =
 * `[{pedido_detalle_talla_id, cantidad}]`, entero > 0, sin ids repetidos). Lo
 * programado es UN total por pedido, sin desglose por línea: el techo de cada
 * línea es `min(cantidad_pendiente, disponible)` y la suma de la orden no puede
 * pasar de `disponible`.
 */

/** Lo mínimo de una línea del onboarding que necesitan estas reglas. */
export interface WorkOrderLineRow extends WorkOrderProductNames {
  /** Id de `PedidoDetalleTalla`: el que viaja en `detalles_override`. */
  pedido_detalle_talla_id: number;
  /** `null` en una línea de MUESTRA (sin producto de catálogo). */
  producto_id: number | null;
  talla_nombre: string | null;
  cantidad_pendiente: number;
  /** `variante.sku`, o `sku_muestra` de la talla en una muestra. */
  sku?: string | null;
}

/** Renglón de `detalles_override`. */
export interface WorkOrderLineOverride {
  pedido_detalle_talla_id: number;
  cantidad: number;
}

/**
 * La línea con su talla, para los avisos y el `aria-label` de la cantidad: las
 * tallas de una misma prenda comparten nombre, y sin la talla el mensaje no
 * dice cuál corregir. El nombre sale de `workOrderProductLabel` (en una
 * muestra, su `producto_nombre_externo`).
 */
export const workOrderLineDescripcion = (row: WorkOrderLineRow): string => {
  const talla = cleanText(row.talla_nombre);
  const nombre = workOrderProductLabel(row);
  return talla ? `${nombre} · Talla ${talla}` : nombre;
};

/**
 * SKU que se pinta bajo el nombre: solo en una MUESTRA, donde es lo que la
 * identifica. Las líneas de catálogo no lo pintan.
 */
export const workOrderLineSampleSku = (row: WorkOrderLineRow): string | null =>
  row.producto_id === null ? cleanText(row.sku) : null;

/**
 * Saneado de la cantidad capturada: solo dígitos, sin ceros a la izquierda.
 *
 * Es la barrera que hace IMPOSIBLE capturar un fraccionario, en vez de
 * detectarlo al enviar: `DecimalQuantityInput` se usa con `decimalPlaces={0}`,
 * pero su saneador interno deja un punto colgante ("1." al teclear "1.5"), y ese
 * valor a medias no debe llegar ni a la pantalla ni al payload.
 */
export const sanitizeIntegerInput = (raw: string): string =>
  raw.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");

/**
 * Pendiente de la línea como entero de piezas: el backend rechaza cualquier
 * fraccionario (`PedidoDetalleTalla.cantidad` es un `PositiveIntegerField`),
 * así que se trunca hacia abajo — nunca hacia arriba, que propondría más de lo
 * que hay.
 */
export const linePendingPieces = (row: Pick<WorkOrderLineRow, "cantidad_pendiente">): number =>
  Math.max(0, Math.floor(row.cantidad_pendiente));

/**
 * Techo por línea, indexado por `pedido_detalle_talla_id`:
 * `min(pendiente, disponible)`. `disponible` en `null` (pedido sin
 * programación) no topa.
 */
export const buildLineCeilings = (
  rows: readonly WorkOrderLineRow[],
  disponible: number | null,
): Map<number, number> => {
  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(
      row.pedido_detalle_talla_id,
      Math.min(linePendingPieces(row), disponible ?? Number.POSITIVE_INFINITY),
    );
  }
  return map;
};

/**
 * Siembra inicial: reparte lo disponible de lo programado en el ORDEN del
 * pedido. Cada línea arranca marcada con `min(pendiente, lo que resta)`; las
 * que ya no reciben nada quedan sin marcar.
 */
export const seedLineSelection = (
  rows: readonly WorkOrderLineRow[],
  disponible: number | null,
): { checkedIds: Set<number>; quantities: Map<number, string> } => {
  const checkedIds = new Set<number>();
  const quantities = new Map<number, string>();
  let restante = disponible ?? Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const ceiling = Math.min(linePendingPieces(row), restante);
    if (ceiling <= 0) continue;
    checkedIds.add(row.pedido_detalle_talla_id);
    quantities.set(row.pedido_detalle_talla_id, String(ceiling));
    restante -= ceiling;
  }
  return { checkedIds, quantities };
};

/**
 * Re-clampa lo capturado a los techos ACTUALES (tras un refetch) y borra la
 * cantidad de las líneas que se quedaron sin techo. Devuelve el MISMO `Map` si
 * no cambió nada, para que el `setState` no re-renderice de más.
 */
export const reconcileLineQuantities = (
  prev: Map<number, string>,
  ceilings: Map<number, number>,
): Map<number, string> => {
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
};

/** Desmarca las líneas sin techo. Mismo `Set` si no cambió nada. */
export const reconcileCheckedLines = (
  prev: Set<number>,
  ceilings: Map<number, number>,
): Set<number> => {
  let changed = false;
  const next = new Set(prev);
  for (const id of prev) {
    if ((ceilings.get(id) ?? 0) <= 0) {
      next.delete(id);
      changed = true;
    }
  }
  return changed ? next : prev;
};

/**
 * Renglón de `detalles_override`: entero positivo de piezas, como exige el
 * serializer (`cantidad` debe ser un número entero de piezas). El techo
 * (`cantidad <= pendiente`) NO vive aquí: depende de datos del servidor que
 * cambian entre la carga y el envío.
 */
export const WorkOrderLineOverrideSchema = z.object({
  pedido_detalle_talla_id: z.number().int().positive("Línea del pedido inválida"),
  cantidad: z
    .number()
    .int("La cantidad debe ser un número entero de piezas")
    .positive("La cantidad debe ser mayor a 0"),
});

/**
 * El arreglo completo. `nonempty`: mandar `[]` equivale a NO mandar el campo
 * (el service hace `data.get("detalles_override") or []` y cae a la ruta del
 * 100% del pedido). Los ids repetidos también los rechaza el backend (y OB/OCM
 * los fusionarían en silencio si llegaran como `5` y `"5"`).
 */
export const WorkOrderLineOverridesSchema = z
  .array(WorkOrderLineOverrideSchema)
  .nonempty("Selecciona al menos una línea del pedido")
  .refine(
    (lineas) =>
      new Set(lineas.map((linea) => linea.pedido_detalle_talla_id)).size === lineas.length,
    "Hay líneas del pedido repetidas",
  );

/**
 * ¿El rechazo del POST dice que los saldos de la pantalla ya no son los del
 * servidor? Sí en TODO `400` que no sea de campo: exceso por línea
 * (`detalles_exceso`), tope de lo programado, `detalles_override` del
 * serializer o rechazo del pedido. No se mira el texto de `err`. Un error de
 * campo del Paso 1, un 403, un 409 o un fallo de red no cambian los saldos.
 */
export const shouldRefreshWorkOrderBalances = (parsed: {
  status?: number;
  fieldErrors: Partial<Record<string, string>>;
}): boolean =>
  parsed.status === 400 && !Object.values(parsed.fieldErrors).some(Boolean);

/**
 * Aviso ámbar mientras se recargan los saldos tras ese `400`, igual en OR y
 * OCM. En FUTURO a propósito: la recarga tarda, y afirmar que ya se
 * actualizaron mientras los inputs siguen mostrando lo rechazado invitaba a
 * reenviar el mismo payload.
 */
export const workOrderStaleBalancesNotice = (
  excess: boolean,
  ordenLabel: string,
): string =>
  excess
    ? `Los pendientes de este pedido cambiaron (otra orden de ${ordenLabel} los consumió). Se están actualizando las cantidades; revísalas antes de volver a intentar.`
    : "Los saldos de este pedido ya no son los que muestra esta pantalla. Se están actualizando; revisa las cantidades antes de volver a intentar.";

/** Resultado de validar el Paso 2 antes del POST. */
export type WorkOrderLineSubmission =
  | { ok: true; lines: WorkOrderLineOverride[] }
  | { ok: false; banner: string; issueLines: string[] };

interface ValidateWorkOrderLinesParams {
  rows: readonly WorkOrderLineRow[];
  checkedIds: Set<number>;
  quantities: Map<number, string>;
  ceilings: Map<number, number>;
  saldo: WorkOrderSaldo | null;
  /** Destino de Mesa de Control como lo lee el usuario: "Reflejante", "Corte de manga". */
  destinoLabel: string;
}

/**
 * Validación local del Paso 2, en este orden: líneas marcadas sin cantidad,
 * líneas por encima de su techo, total por encima de lo disponible, nada
 * marcado y, al final, el esquema sobre el payload exacto. Devuelve las líneas
 * a enviar o el banner con su desglose. El backend sigue siendo la fuente de
 * la verdad: pasar esto no garantiza que acepte.
 */
export const validateWorkOrderLines = ({
  rows,
  checkedIds,
  quantities,
  ceilings,
  saldo,
  destinoLabel,
}: ValidateWorkOrderLinesParams): WorkOrderLineSubmission => {
  const lines: WorkOrderLineOverride[] = [];
  const missing: string[] = [];
  const over: string[] = [];

  for (const row of rows) {
    const id = row.pedido_detalle_talla_id;
    if (!checkedIds.has(id)) continue;

    const ceiling = ceilings.get(id) ?? 0;
    if (ceiling <= 0) continue;

    const raw = quantities.get(id) ?? "";
    const cantidad = Number.parseInt(raw, 10);
    const nombre = workOrderLineDescripcion(row);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      // Se distingue el input VACÍO del `0` explícito.
      missing.push(
        raw.trim() === ""
          ? `«${nombre}»: sin cantidad capturada.`
          : `«${nombre}»: la cantidad debe ser mayor a 0.`,
      );
      continue;
    }
    // Normalmente inalcanzable (el input ya clampa), pero sí ocurre cuando el
    // techo bajó tras un refetch con la cantidad anterior aún capturada.
    // El techo puede venir del pendiente de la línea o, si es menor, de lo
    // disponible de lo programado: el mensaje nombra el que topa.
    if (cantidad > ceiling) {
      over.push(
        ceiling < linePendingPieces(row)
          ? `«${nombre}»: capturaste ${cantidad}, pero por lo programado por Mesa de Control puede llevar hasta ${ceiling}.`
          : `«${nombre}»: capturaste ${cantidad}, pero solo ${plural(ceiling, "queda", "quedan")} ${ceiling} ${plural(ceiling, "pendiente", "pendientes")}.`,
      );
      continue;
    }
    lines.push({ pedido_detalle_talla_id: id, cantidad });
  }

  if (missing.length > 0) {
    return {
      ok: false,
      banner: "Captura una cantidad mayor a cero en las líneas marcadas.",
      issueLines: missing,
    };
  }

  if (over.length > 0) {
    return {
      ok: false,
      banner:
        "Hay líneas con más piezas de las que quedan pendientes. Ajústalas antes de continuar.",
      issueLines: over,
    };
  }

  const totalOrden = lines.reduce((acc, l) => acc + l.cantidad, 0);
  if (saldo && totalOrden > saldo.disponible) {
    return {
      ok: false,
      banner:
        saldo.disponible === 0
          ? `Lo que Mesa de Control programó a ${destinoLabel} ya está en otras órdenes. Pide que programen más piezas para crear otra.`
          : `Mesa de Control programó ${saldo.programado} pzas a ${destinoLabel} y ${saldo.enOrdenes} ya están en órdenes: esta orden puede llevar hasta ${saldo.disponible}, y lleva ${totalOrden}.`,
      issueLines: [],
    };
  }

  if (lines.length === 0) {
    return {
      ok: false,
      banner: "Selecciona al menos una prenda del pedido para incluirla en la orden.",
      issueLines: [],
    };
  }

  const parsed = WorkOrderLineOverridesSchema.safeParse(lines);
  if (!parsed.success) {
    return {
      ok: false,
      banner: parsed.error.issues[0]?.message ?? "Revisa las cantidades capturadas.",
      issueLines: [],
    };
  }

  return { ok: true, lines: parsed.data };
};
