import { CalendarDaysIcon } from "./Icons";
import { formatQuantityValue } from "../utils/formatCurrency";
import { formatShortDate } from "../utils/formatDate";
import type { WorkOrderProgramado } from "../interfaces/work-order-programado.interface";

/**
 * Indicador de lo que Mesa de Control programó para un pedido hacia el destino
 * de la orden de trabajo que se está creando (bordado, reflejante o corte de
 * manga). Lo comparten los tres onboardings porque el backend emite
 * `programado` desde un solo helper.
 *
 * Es SOLO INFORMATIVO: no precarga, no topa, no valida ni advierte sobre
 * cantidades. El rótulo siempre es "Programado por Mesa de Control" —nunca
 * "Programado" a secas—, porque esa palabra ya significa otras cosas en estos
 * módulos (estatus 2 de la OB, `cantidad_asignada` en el detalle). Sin
 * programación se muestra "Sin programar" en tono neutro: no es un problema
 * que atender, así que nada de ámbar ni rojo.
 */

const LABEL = "Programado por Mesa de Control";
const EMPTY_LABEL = "Sin programar";
const EMPTY_TITLE = "Mesa de Control no ha programado este pedido para este destino";

/**
 * "pzas" invariable, también para 1: es la abreviatura que usa el resto de la
 * app (columnas de OB/OR/OCM, detalle de pedido, picking).
 */
const formatPiezas = (cantidad: number) => `${formatQuantityValue(cantidad)} pzas`;

/**
 * Detalle secundario: fecha corta + quién programó. `fecha` es un datetime con
 * zona, así que va SIN `timeZone` (día en la zona del usuario, ver
 * `formatShortDate`). Sin `usuario_nombre` queda solo la fecha, sin separador
 * colgando.
 */
const formatProgramadoDetail = (programado: NonNullable<WorkOrderProgramado>) =>
  [formatShortDate(programado.fecha), programado.usuario_nombre?.trim()]
    .filter(Boolean)
    .join(" · ");

/**
 * Versión en TEXTO PLANO para un `<option>` nativo, que no admite marcado. Más
 * corta que el rótulo completo para no desbordar la lista; el detalle
 * completo se muestra fuera del `<select>` con el componente.
 */
export const formatProgramadoOptionText = (programado: WorkOrderProgramado): string =>
  programado ? `Prog. Mesa de Control: ${formatPiezas(programado.cantidad)}` : EMPTY_LABEL;

interface MesaControlProgramadoIndicatorProps {
  programado: WorkOrderProgramado;
}

/** Bloque con el detalle en una segunda línea, para el pedido elegido. */
export function MesaControlProgramadoIndicator({
  programado,
}: MesaControlProgramadoIndicatorProps) {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 px-4 py-3"
    >
      <CalendarDaysIcon className="w-5 h-5 shrink-0 text-slate-400 mt-0.5" />
      {programado ? (
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold">{LABEL}: </span>
            <span className="font-semibold tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-200">
              {formatPiezas(programado.cantidad)}
            </span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {formatProgramadoDetail(programado)}
          </p>
        </div>
      ) : (
        <p title={EMPTY_TITLE} className="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-400">
          {EMPTY_LABEL}
        </p>
      )}
    </div>
  );
}
