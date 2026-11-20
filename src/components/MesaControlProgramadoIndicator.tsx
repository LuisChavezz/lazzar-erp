import { CalendarDaysIcon } from "./Icons";
import {
  PROGRAMADO_EMPTY_LABEL,
  formatPiezas,
  formatProgramadoDetail,
} from "../utils/formatWorkOrderProgramado";
import type { WorkOrderSaldo } from "../utils/formatWorkOrderProgramado";
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
  /**
   * Saldo de lo programado (`getWorkOrderSaldo`): cuánto ya tomaron otras
   * órdenes y cuánto queda. Sin él, solo el total programado.
   */
  saldo?: WorkOrderSaldo | null;
}

/** Bloque con el detalle en una segunda línea, para el pedido elegido. */
export function MesaControlProgramadoIndicator({
  programado,
  saldo,
}: MesaControlProgramadoIndicatorProps) {
  if (programado === undefined) return null;
  if (programado && saldo) return <SaldoProgramado programado={programado} saldo={saldo} />;

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

/**
 * Conteo de lo programado: programado · ya en órdenes · disponible, con barra.
 * Sin disponible, el aviso en rojo explica por qué no se puede crear otra orden.
 */
function SaldoProgramado({
  programado,
  saldo,
}: {
  programado: NonNullable<WorkOrderProgramado>;
  saldo: WorkOrderSaldo;
}) {
  const detail = formatProgramadoDetail(programado);
  const agotado = saldo.disponible === 0;
  const pct = saldo.programado > 0 ? Math.min(100, Math.round((saldo.enOrdenes / saldo.programado) * 100)) : 100;
  return (
    <div
      role="note"
      className={`rounded-xl border px-4 py-3 ${
        agotado
          ? "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
          : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <CalendarDaysIcon className={`w-5 h-5 shrink-0 mt-0.5 ${agotado ? "text-rose-500" : "text-slate-400"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{LABEL}</p>
          <dl className="mt-1.5 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Programado", value: saldo.programado, cls: "text-slate-800 dark:text-slate-100" },
              { label: "Ya en órdenes", value: saldo.enOrdenes, cls: "text-slate-800 dark:text-slate-100" },
              {
                label: "Disponible",
                value: saldo.disponible,
                cls: agotado ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
              },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[10px] uppercase tracking-wider text-slate-400">{item.label}</dt>
                <dd className={`text-base font-bold tabular-nums ${item.cls}`}>{formatPiezas(item.value)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${agotado ? "bg-rose-500" : "bg-sky-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {agotado && (
            <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">
              Lo programado ya está en órdenes. Para otra orden, Mesa de Control debe programar más piezas a este destino.
            </p>
          )}
          {detail && <p className="text-[11px] text-slate-500 mt-1 break-words">{detail}</p>}
        </div>
      </div>
    </div>
  );
}
