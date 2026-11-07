"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { EmptyLines, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { SheetPanel, SheetSection } from "@/src/features/orders/components/OrderSheetPrimitives";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { DeleteIcon, PlusIcon, TrendingUpIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { pluralForQuantity } from "@/src/utils/plural";
import { useWorkOrderAvanceMutations } from "../hooks/useWorkOrderAvanceMutations";
import type {
  WorkOrderAvance,
  WorkOrderAvanceConfig,
  WorkOrderAvanceFields,
} from "../interfaces/work-order-avance.interface";

interface WorkOrderAvancesSectionProps extends WorkOrderAvanceFields {
  config: WorkOrderAvanceConfig;
  orderId: number;
  detailQueryKey: QueryKey;
  /** Piezas de la orden; techo mientras el backend no mande `resumen_avance`. */
  piezasOrden: number;
  canEdit: boolean;
  isTerminal: boolean;
}

/**
 * Avance de una orden de reflejante o corte de manga: barra de progreso,
 * "Registrar avance" con UN solo campo (piezas) e historial. Borrar un avance
 * pide escribir "ELIMINAR".
 *
 * Mientras el backend no mande `resumen_avance` la sección se muestra con el
 * registro deshabilitado, para no ofrecer una acción cuyo endpoint aún no existe.
 */
export function WorkOrderAvancesSection({
  config,
  orderId,
  detailQueryKey,
  piezasOrden,
  canEdit,
  isTerminal,
  avances,
  resumen_avance: resumen,
}: WorkOrderAvancesSectionProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<WorkOrderAvance | null>(null);
  const { create, remove } = useWorkOrderAvanceMutations(config, orderId, detailQueryKey);

  const available = resumen !== undefined;
  const programado = resumen?.cantidad_programada ?? piezasOrden;
  const realizado = resumen?.cantidad_realizada_total ?? 0;
  const restante = Math.floor(Math.max(0, programado - realizado));
  const pct =
    resumen?.porcentaje_avance ??
    (programado > 0 ? Math.round((realizado / programado) * 100) : 0);
  const completo = programado > 0 && restante < 1;
  const list = avances ?? [];

  const disabledReason = !available
    ? "Disponible en cuanto el backend habilite los avances"
    : isTerminal
      ? "No se registran avances en una orden cancelada"
      : completo
        ? "Ya se registraron todas las piezas de la orden"
        : undefined;

  return (
    <SheetSection
      icon={<TrendingUpIcon className="w-5 h-5" />}
      title="Avance"
      subtitle="Piezas registradas por los operadores y su historial."
      action={
        canEdit ? (
          <Button
            variant="primary"
            leftIcon={<PlusIcon className="w-4 h-4" aria-hidden="true" />}
            disabled={disabledReason !== undefined}
            title={disabledReason}
            onClick={() => setCreateOpen(true)}
          >
            Registrar avance
          </Button>
        ) : undefined
      }
    >
      {/* Progreso */}
      <SheetPanel className="p-5!">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatQuantityValue(realizado)}
            </span>{" "}
            de {formatQuantityValue(programado)}{" "}
            {pluralForQuantity(programado, `pieza ${config.verbo.replace(/s$/, "")}`, `piezas ${config.verbo}`)}
          </p>
          <span
            className={`text-lg font-bold tabular-nums ${
              completo ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {Math.round(pct)}%
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${completo ? "bg-emerald-500" : "bg-sky-500"}`}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
        {!available && (
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            El registro de avances todavía no está disponible para esta orden.
          </p>
        )}
      </SheetPanel>

      {/* Historial */}
      <div className="mt-4">
        {list.length === 0 ? (
          <EmptyLines>Sin avances registrados.</EmptyLines>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr className="text-slate-500 dark:text-slate-400">
                  <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold">Operador</th>
                  <th className="px-3 py-2 text-right font-semibold">Piezas</th>
                  <th className="px-3 py-2 text-left font-semibold">Comentario</th>
                  <th className="px-3 py-2 text-center font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((avance) => (
                  <tr key={avance.id} className="border-t border-slate-100 dark:border-white/10">
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300">
                      {formatShortDate(avance.fecha)} · {formatShortTime(avance.fecha)}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      {textOrDash(avance.usuario_nombre)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                      {formatQuantityValue(avance.cantidad)}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-xs">
                      {textOrDash(avance.comentario)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-center">
                        {!isTerminal && canEdit && (
                          <button
                            type="button"
                            onClick={() => setToDelete(avance)}
                            disabled={remove.isPending}
                            aria-label="Eliminar avance"
                            title="Eliminar avance"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <DeleteIcon className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateAvanceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        verbo={config.verbo}
        programado={programado}
        realizado={realizado}
        restante={restante}
        isPending={create.isPending}
        onSubmit={(data, done) => create.mutate(data, { onSuccess: done })}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(next) => {
          if (!next) setToDelete(null);
        }}
        title="Eliminar avance"
        description="¿Eliminar este registro de avance? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        confirmationWord="ELIMINAR"
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </SheetSection>
  );
}

interface CreateAvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verbo: string;
  programado: number;
  realizado: number;
  restante: number;
  isPending: boolean;
  onSubmit: (data: { cantidad: number; comentario?: string }, done: () => void) => void;
}

/** Un solo número (piezas) y un comentario opcional. */
function CreateAvanceDialog({
  open,
  onOpenChange,
  verbo,
  programado,
  realizado,
  restante,
  isPending,
  onSubmit,
}: CreateAvanceDialogProps) {
  const [cantidad, setCantidad] = useState("");
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setCantidad("");
    setComentario("");
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(cantidad);
    if (cantidad.trim() === "" || !Number.isInteger(value) || value < 1) {
      setError("Escribe cuántas piezas (número entero mayor a 0)");
      return;
    }
    if (value > restante) {
      setError(
        `No puede exceder ${formatQuantityValue(restante)} ${pluralForQuantity(restante, "pieza restante", "piezas restantes")}`,
      );
      return;
    }
    const nota = comentario.trim();
    onSubmit({ cantidad: value, ...(nota ? { comentario: nota } : {}) }, close);
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      maxWidth="420px"
      showCloseButton={false}
      title="Registrar avance"
      description={`¿Cuántas piezas llevan ${verbo}?`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <p className="ml-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
          Programado: <strong className="text-slate-700 dark:text-slate-200">{formatQuantityValue(programado)}</strong>
          {" · "}Llevan: <strong className="text-slate-700 dark:text-slate-200">{formatQuantityValue(realizado)}</strong>
          {" · "}Faltan: <strong className="text-slate-700 dark:text-slate-200">{formatQuantityValue(restante)}</strong>
        </p>
        <FormInput
          label={`Piezas ${verbo}`}
          type="number"
          min="1"
          max={restante}
          step="1"
          inputMode="numeric"
          placeholder="0"
          autoFocus
          value={cantidad}
          disabled={isPending}
          error={error ? { message: error } : undefined}
          onChange={(event) => {
            setCantidad(event.target.value);
            setError(null);
          }}
        />
        <FormTextarea
          label="Comentario (opcional)"
          rows={2}
          placeholder="Turno, incidencias, notas…"
          value={comentario}
          disabled={isPending}
          onChange={(event) => setComentario(event.target.value)}
        />
        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton label="Cancelar" onClick={close} disabled={isPending} />
          <FormSubmitButton isPending={isPending} disabled={isPending} loadingLabel="Registrando…">
            Registrar avance
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
