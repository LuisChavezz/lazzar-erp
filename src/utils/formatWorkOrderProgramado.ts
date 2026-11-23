import { formatQuantityValue } from "./formatCurrency";
import { formatShortDate } from "./formatDate";
import type { WorkOrderProgramado } from "../interfaces/work-order-programado.interface";

/**
 * Textos de `programado` (lo que Mesa de Control programó para el pedido) en
 * los onboardings de OB, OR y OCM. Viven aquí, y no en el componente, porque
 * también los consumen los hooks que arman las opciones del `<select>`.
 */

/** Rótulo del bloque cuando `programado` es `null`. */
export const PROGRAMADO_EMPTY_LABEL = "Sin programación de Mesa de Control";

/**
 * "pzas" invariable, también para 1: es la abreviatura que usa el resto de la
 * app (columnas de OB/OR/OCM, detalle de pedido, picking).
 */
export const formatPiezas = (cantidad: number) => `${formatQuantityValue(cantidad)} pzas`;

/**
 * Detalle secundario: fecha corta + quién programó. `fecha` es un datetime con
 * zona, así que va SIN `timeZone` (día en la zona de México, ver
 * `formatShortDate`). Se omite cada parte inutilizable —la fecha cuando cae
 * en el "—" de respaldo, el usuario cuando viene vacío— sin dejar separadores
 * colgando; `null` si no queda ninguna.
 */
export const formatProgramadoDetail = (
  programado: NonNullable<WorkOrderProgramado>,
): string | null => {
  const fecha = formatShortDate(programado.fecha);
  const parts = [fecha === "—" ? null : fecha, programado.usuario_nombre?.trim()].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
};

/**
 * Versión en TEXTO PLANO para un `<option>` nativo, que no admite marcado. Más
 * corta que el rótulo completo para no desbordar la lista; el detalle se
 * muestra fuera del `<select>`. `undefined` (clave ausente) no produce sufijo.
 */
const formatProgramadoOptionText = (
  programado: WorkOrderProgramado | undefined,
): string | null => {
  if (programado === undefined) return null;
  return programado
    ? `Prog. Mesa de Control: ${formatPiezas(programado.cantidad)}`
    : "Sin prog. Mesa de Control";
};

interface WorkOrderOnboardingPedido {
  id: number;
  folio: string | null;
  cliente_nombre: string | null;
  programado?: WorkOrderProgramado;
  /** nucleo-erp#1274: lo programado menos lo que ya está en órdenes activas. */
  disponible_programado?: number | null;
  /** Tallas del onboarding: `cantidad_asignada` = lo que ya tomaron órdenes activas. */
  detalles?: { cantidad_asignada: number | null }[];
}

/**
 * Saldo de lo que Mesa de Control programó a este destino: lo programado menos
 * lo que ya tomaron las órdenes activas del pedido (Σ `cantidad_asignada`).
 * `null` sin programación (`programado` ausente o `null`): no hay contra qué contar.
 *
 * Es la regla que evita volver a crear una orden sobre lo ya programado: el
 * onboarding del backend sigue listando el pedido mientras quede pendiente
 * contra el TOTAL del pedido, no contra lo programado.
 */
export interface WorkOrderSaldo {
  programado: number;
  enOrdenes: number;
  disponible: number;
}

export const getWorkOrderSaldo = (pedido: WorkOrderOnboardingPedido): WorkOrderSaldo | null => {
  if (!pedido.programado) return null;
  const programado = Math.floor(pedido.programado.cantidad);
  // Con nucleo-erp#1274 el backend manda el saldo y es la fuente de la verdad
  // (es lo mismo con lo que topa el POST). Sin él, se calcula igual que él:
  // Σ `cantidad_asignada` de las tallas = lo que ya tomaron órdenes activas.
  const { asignado, disponible } = pedido.programado;
  if (typeof asignado === "number" && typeof disponible === "number") {
    return { programado, enOrdenes: Math.floor(asignado), disponible: Math.max(0, Math.floor(disponible)) };
  }
  const enOrdenes = Math.floor(
    (pedido.detalles ?? []).reduce((acc, d) => acc + (Number(d.cantidad_asignada) || 0), 0),
  );
  const calculado = Math.max(0, programado - enOrdenes);
  const delPedido = pedido.disponible_programado;
  return {
    programado,
    enOrdenes,
    disponible: typeof delPedido === "number" ? Math.max(0, Math.floor(delPedido)) : calculado,
  };
};

const formatSaldoOptionText = (pedido: WorkOrderOnboardingPedido, saldo: WorkOrderSaldo | null) => {
  if (saldo) {
    if (saldo.disponible === 0) return `Ya en órdenes ${formatPiezas(saldo.enOrdenes)} de ${formatPiezas(saldo.programado)} programadas`;
    return saldo.enOrdenes > 0
      ? `Disponibles ${formatPiezas(saldo.disponible)} de ${formatPiezas(saldo.programado)} programadas`
      : `Prog. Mesa de Control: ${formatPiezas(saldo.programado)}`;
  }
  return formatProgramadoOptionText(pedido.programado);
};

/**
 * Opción del `<select>` de pedido de los tres onboardings: folio (o el id si
 * no hay folio, porque `folio` es nullable) y cliente, más el saldo de lo
 * programado. Un pedido cuya programación ya tomaron otras órdenes sale
 * deshabilitado (`agotado`): para otra orden, Mesa de Control debe programar más.
 */
export const buildWorkOrderPedidoOption = (pedido: WorkOrderOnboardingPedido) => {
  const saldo = getWorkOrderSaldo(pedido);
  return {
    value: pedido.id,
    label: [
      [pedido.folio ?? `Pedido #${pedido.id}`, pedido.cliente_nombre].filter(Boolean).join(" — "),
      formatSaldoOptionText(pedido, saldo),
    ]
      .filter(Boolean)
      .join(" · "),
    programado: pedido.programado,
    saldo,
    agotado: saldo !== null && saldo.disponible === 0,
  };
};

/** Opciones de los tres onboardings: primero las que tienen saldo; las agotadas al final. */
export const buildWorkOrderPedidoOptions = (pedidos: WorkOrderOnboardingPedido[]) => {
  const options = pedidos.map(buildWorkOrderPedidoOption);
  return [...options.filter((o) => !o.agotado), ...options.filter((o) => o.agotado)];
};
