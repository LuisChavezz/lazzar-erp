"use client";

import { useState, type FormEvent } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { useMaquileros } from "@/src/features/suppliers/hooks/useMaquileros";
import { formatAmountNoCurrency, formatQuantityValue } from "@/src/utils/formatCurrency";
import { getMexicoTodayDate } from "@/src/utils/mexicoTime";
import { useOpParaSalidaMaquila } from "../hooks/useOpParaSalidaMaquila";
import { salidaMaquilaErrorText, useCreateSalidaMaquila } from "../hooks/useSalidaMaquilaMutations";
import type { OpParaSalidaMaquila } from "../interfaces/salida-maquila.interface";
import {
  draftProblems,
  initialDraft,
  lineImporte,
  lineQty,
  toDetalles,
  type DraftProblem,
  type SalidaMaquilaDraftLine,
} from "../utils/salidaMaquilaDraft";

const PROBLEM_TEXT: Record<DraftProblem, string> = {
  cantidad: "Las piezas deben ser números enteros.",
  sin_piezas: "Captura cuántas piezas salen.",
  excede: "Son más piezas de las que quedan por enviar de esta OP.",
  precio: "Cada prenda que sale necesita su precio de maquila (mayor que 0).",
};

/**
 * "Generar SM" desde la OP: maquilero (por defecto el de la OP), compromiso y
 * las prendas que salen con su precio. El precio parte del costo de maquila de
 * la OP; el tope es por OP: lo programado menos lo ya enviado.
 */
export function GenerarSalidaMaquilaDialog({
  opId,
  yaEnviadas,
  open,
  onClose,
}: {
  opId: number;
  /** Piezas de esta OP en SM no canceladas. */
  yaEnviadas: number;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading, isInitialError } = useOpParaSalidaMaquila(opId, open);

  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Generar salida a maquila"
      description="Registra las prendas de esta OP que salen a confeccionarse con un maquilero."
      maxWidth="900px"
      showCloseButton={false}
    >
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader />
        </div>
      ) : isInitialError || !data ? (
        <EmptyLines>No se pudo cargar la OP. Cierra e intenta de nuevo.</EmptyLines>
      ) : (
        <SalidaMaquilaForm op={data} yaEnviadas={yaEnviadas} onClose={onClose} />
      )}
    </MainDialog>
  );
}

function SalidaMaquilaForm({
  op,
  yaEnviadas,
  onClose,
}: {
  op: OpParaSalidaMaquila;
  yaEnviadas: number;
  onClose: () => void;
}) {
  const { maquileros, isLoading: loadingMaquileros } = useMaquileros();
  const create = useCreateSalidaMaquila(op.op_id);
  const today = getMexicoTodayDate();

  const [maquilero, setMaquilero] = useState(op.centro_confeccion ? String(op.centro_confeccion) : "");
  const [compromiso, setCompromiso] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lines, setLines] = useState<SalidaMaquilaDraftLine[]>(() =>
    initialDraft(op.orden_produccion_detalle, op.costo_maquila_unitario, yaEnviadas),
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const programadas = lines.reduce((acc, l) => acc + l.enOp, 0);
  const quedan = Math.max(programadas - yaEnviadas, 0);
  const piezas = lines.reduce((acc, l) => acc + lineQty(l), 0);
  const total = lines.reduce((acc, l) => acc + lineImporte(l), 0);
  const problems = draftProblems(lines, quedan);
  const sinMaquilero = maquilero === "";
  const isPending = create.isPending;

  const update = (opDetalle: number, patch: Partial<SalidaMaquilaDraftLine>) => {
    setServerError(null);
    setLines((prev) => prev.map((l) => (l.opDetalle === opDetalle ? { ...l, ...patch } : l)));
  };

  const precioParaTodas = (precio: string) => {
    setServerError(null);
    setLines((prev) => prev.map((l) => ({ ...l, precio })));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (problems.length > 0 || sinMaquilero || isPending) return;
    create.mutate(
      {
        op: op.op_id,
        centro_confeccion: Number(maquilero),
        ...(compromiso ? { fecha_compromiso: compromiso } : {}),
        ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
        detalles: toDetalles(lines),
      },
      {
        onSuccess: onClose,
        onError: (error) => setServerError(salidaMaquilaErrorText(error, "No se pudo generar la salida.")),
      },
    );
  };

  if (quedan <= 0) {
    return (
      <div className="space-y-4">
        <EmptyLines>
          Todas las piezas de esta OP ({formatQuantityValue(programadas)}) ya salieron a maquila. Si una salida
          se canceló, sus piezas vuelven a estar disponibles.
        </EmptyLines>
        <div className="flex justify-end">
          <FormCancelButton label="Cerrar" onClick={onClose} />
        </div>
      </div>
    );
  }

  const visibleProblems = touched ? problems.map((p) => PROBLEM_TEXT[p]) : [];
  if (touched && sinMaquilero) visibleProblems.unshift("Elige el maquilero.");

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormSelect
          label="Maquilero"
          name="centro_confeccion"
          value={maquilero}
          disabled={isPending || loadingMaquileros}
          onChange={(e) => {
            setServerError(null);
            setMaquilero(e.target.value);
          }}
        >
          <option value="">{loadingMaquileros ? "Cargando…" : "Selecciona un maquilero"}</option>
          {maquileros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </FormSelect>
        <FormInput
          label="Compromiso de entrega (opcional)"
          name="fecha_compromiso"
          type="date"
          min={today}
          value={compromiso}
          disabled={isPending}
          onChange={(e) => setCompromiso(e.target.value)}
        />
        <FormInput
          label="Observaciones (opcional)"
          name="observaciones"
          value={observaciones}
          disabled={isPending}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </div>
      {!loadingMaquileros && maquileros.length === 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Aún no hay maquileros. Márcalos en Compras → Proveedores → detalle → «Maquilero».
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 dark:bg-white/5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Quedan <span className="font-semibold tabular-nums">{formatQuantityValue(quedan)}</span> de{" "}
            {formatQuantityValue(programadas)} piezas por enviar
            {yaEnviadas > 0 && <> · {formatQuantityValue(yaEnviadas)} ya salieron</>}
          </p>
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            Mismo precio para todas
            <input
              type="text"
              inputMode="decimal"
              placeholder="$"
              aria-label="Precio de maquila para todas las prendas"
              disabled={isPending}
              onBlur={(e) => e.target.value.trim() && precioParaTodas(e.target.value.trim())}
              className="w-24 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-1 text-right tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-zinc-900">
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/10">
                <th className="px-4 py-2 font-medium">Prenda</th>
                <th className="px-3 py-2 font-medium text-right">En la OP</th>
                <th className="px-3 py-2 font-medium text-right">Piezas que salen</th>
                <th className="px-3 py-2 font-medium text-right">Precio</th>
                <th className="px-4 py-2 font-medium text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {lines.map((l) => {
                const qtyBad = touched && l.cantidad.trim() !== "" && !/^\d+$/.test(l.cantidad);
                const priceBad = touched && lineQty(l) > 0 && !(Number(l.precio) > 0);
                return (
                  <tr key={l.opDetalle}>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{l.descripcion}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {formatQuantityValue(l.enOp)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Piezas de ${l.descripcion}`}
                        aria-invalid={qtyBad || undefined}
                        value={l.cantidad}
                        disabled={isPending}
                        onChange={(e) => update(l.opDetalle, { cantidad: e.target.value.replace(/[^\d]/g, "") })}
                        className={`w-20 rounded-lg border bg-white dark:bg-zinc-900 px-2 py-1 text-right font-semibold tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                          qtyBad ? "border-rose-400" : "border-slate-200 dark:border-white/10"
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Precio de maquila de ${l.descripcion}`}
                        aria-invalid={priceBad || undefined}
                        value={l.precio}
                        disabled={isPending}
                        onChange={(e) => update(l.opDetalle, { precio: e.target.value.replace(/[^\d.]/g, "") })}
                        className={`w-24 rounded-lg border bg-white dark:bg-zinc-900 px-2 py-1 text-right tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                          priceBad ? "border-rose-400" : "border-slate-200 dark:border-white/10"
                        }`}
                      />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                      {lineQty(l) > 0 ? formatAmountNoCurrency(lineImporte(l)) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(visibleProblems.length > 0 || serverError) && (
        <div role="alert" className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 space-y-1">
          {serverError && <p>{serverError}</p>}
          {visibleProblems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-white/10 pt-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Salen <span className="font-semibold tabular-nums">{formatQuantityValue(piezas)}</span> piezas · Total{" "}
          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatAmountNoCurrency(total)}
          </span>
        </p>
        <div className="flex gap-2 justify-end">
          <FormCancelButton label="Cancelar" onClick={onClose} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Generando…">
            Generar SM
          </FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
