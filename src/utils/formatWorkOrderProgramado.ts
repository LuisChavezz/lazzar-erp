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
 * zona, así que va SIN `timeZone` (día en la zona del usuario, ver
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
}

/**
 * Opción del `<select>` de pedido de los tres onboardings: folio (o el id si
 * no hay folio, porque `folio` es nullable) y cliente, más el sufijo corto de
 * `programado`. Conserva `programado` para el bloque bajo el select.
 */
export const buildWorkOrderPedidoOption = (pedido: WorkOrderOnboardingPedido) => ({
  value: pedido.id,
  label: [
    [pedido.folio ?? `Pedido #${pedido.id}`, pedido.cliente_nombre].filter(Boolean).join(" — "),
    formatProgramadoOptionText(pedido.programado),
  ]
    .filter(Boolean)
    .join(" · "),
  programado: pedido.programado,
});
