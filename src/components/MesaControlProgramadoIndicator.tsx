import { CalendarDaysIcon } from "./Icons";
import {
  PROGRAMADO_EMPTY_LABEL,
  formatPiezas,
  formatProgramadoDetail,
} from "../utils/formatWorkOrderProgramado";
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
 * programación (`null`) se muestra en tono neutro: no es un problema que
 * atender, así que nada de ámbar ni rojo. Sin la clave (`undefined`) no se
 * muestra nada.
 */

const LABEL = "Programado por Mesa de Control";

interface MesaControlProgramadoIndicatorProps {
  programado: WorkOrderProgramado | undefined;
}

/** Bloque con el detalle en una segunda línea, para el pedido elegido. */
export function MesaControlProgramadoIndicator({
  programado,
}: MesaControlProgramadoIndicatorProps) {
  if (programado === undefined) return null;

  const detail = programado ? formatProgramadoDetail(programado) : null;

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
          {detail && <p className="text-[11px] text-slate-500 mt-1 break-words">{detail}</p>}
        </div>
      ) : (
        <p className="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-400">
          {PROGRAMADO_EMPTY_LABEL}
        </p>
      )}
    </div>
  );
}
