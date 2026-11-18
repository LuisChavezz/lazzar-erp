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
import { SALIDA_MAQUILA_ORIGENES } from "../constants/salidaMaquilaOrigen";
import { useCreateSalidaMaquila } from "../hooks/useSalidaMaquilaMutations";
import type {
  CreateSalidaMaquilaBody,
  SalidaMaquilaOrdenSeed,
  SalidaMaquilaOrigen,
} from "../interfaces/salida-maquila.interface";
import {
  draftProblems,
  initialDraft,
  lineImporte,
  lineQty,
  linesToSend,
  toDetalles,
  type DraftProblem,
  type SalidaMaquilaDraftLine,
} from "../utils/salidaMaquilaDraft";
import { parseSalidaMaquilaCreateError, type SalidaMaquilaCreateError } from "../utils/salidaMaquilaErrors";

const problemText = (problem: DraftProblem, origen: SalidaMaquilaOrigen): string =>
  ({
    cantidad: "Las piezas deben ser números enteros.",
    sin_piezas: "Captura cuántas piezas salen.",
    excede: `Son más piezas de las que quedan por enviar de esta ${origen}.`,
    precio: "Cada prenda que sale necesita su precio de maquila (mayor que 0).",
  })[problem];

/**
 * "Generar SM" desde una orden (OP, OB u OR, EC-911): maquilero, compromiso y
 * las prendas que salen con su precio. El tope es por orden: lo programado
 * menos lo ya enviado.
 *
 * - OP: el maquilero y el precio parten de los de la OP.
 * - OB: el maquilero parte de su proveedor si es maquilero; el precio, en blanco.
 * - OR: sin maquilero ni precio propuestos.
 *
 * Siempre viaja el maquilero elegido y los renglones explícitos: en OB y OR un
 * alta sin renglones es un 400 (no tienen costo de maquila).
 *
 * `seed` llega de quien abre el diálogo: la OP la pide al abrirlo (su retrieve
 * trae los ids de renglón y el costo); OB y OR pasan los `detalles` que su
 * página ya cargó.
 */
export function GenerarSalidaMaquilaDialog({
  origen,
  seed,
  isLoading = false,
  isError = false,
  yaEnviadas,
  open,
  onClose,
}: {
  origen: SalidaMaquilaOrigen;
  seed: SalidaMaquilaOrdenSeed | undefined;
  isLoading?: boolean;
  isError?: boolean;
  /** Piezas de esta orden en SM no canceladas. */
  yaEnviadas: number;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Generar salida a maquila"
      description={`Registra las prendas de esta ${origen} que salen a confeccionarse con un maquilero.`}
      maxWidth="900px"
      showCloseButton={false}
    >
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader />
        </div>
      ) : isError || !seed ? (
        <EmptyLines>
          No se pudo cargar la {SALIDA_MAQUILA_ORIGENES[origen].nombre}. Cierra e intenta de nuevo.
        </EmptyLines>
      ) : (
        <SalidaMaquilaForm seed={seed} yaEnviadas={yaEnviadas} onClose={onClose} />
      )}
    </MainDialog>
  );
}

function SalidaMaquilaForm({
  seed,
  yaEnviadas,
  onClose,
}: {
  seed: SalidaMaquilaOrdenSeed;
  yaEnviadas: number;
  onClose: () => void;
}) {
  const { origen } = seed;
  const { maquileros, isLoading: loadingMaquileros } = useMaquileros();
  const create = useCreateSalidaMaquila(origen, seed.ordenId);
  const today = getMexicoTodayDate();

  // `null` = el usuario aún no elige: se propone el maquilero de la orden solo
  // si está en el catálogo de maquileros (el proveedor de una OB puede no
  // serlo, y un valor fuera de las opciones se enviaría sin verse).
  const [maquileroElegido, setMaquileroElegido] = useState<string | null>(null);
  const propuesto =
    seed.centroConfeccion !== null && maquileros.some((m) => m.id === seed.centroConfeccion)
      ? String(seed.centroConfeccion)
      : "";
  const maquilero = maquileroElegido ?? propuesto;
  const [compromiso, setCompromiso] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lines, setLines] = useState<SalidaMaquilaDraftLine[]>(() =>
    initialDraft(seed.renglones, seed.precioSugerido, yaEnviadas),
  );
  const [serverError, setServerError] = useState<SalidaMaquilaCreateError | null>(null);
  const [touched, setTouched] = useState(false);

  const programadas = lines.reduce((acc, l) => acc + l.enOrden, 0);
  const quedan = Math.max(programadas - yaEnviadas, 0);
  const piezas = lines.reduce((acc, l) => acc + lineQty(l), 0);
  const total = lines.reduce((acc, l) => acc + lineImporte(l), 0);
  const problems = draftProblems(lines, quedan);
  const sinMaquilero = maquilero === "";
  const isPending = create.isPending;

  const update = (detalleId: number, patch: Partial<SalidaMaquilaDraftLine>) => {
    setServerError(null);
    setLines((prev) => prev.map((l) => (l.detalleId === detalleId ? { ...l, ...patch } : l)));
  };

  const precioParaTodas = (precio: string) => {
    setServerError(null);
    setLines((prev) => prev.map((l) => ({ ...l, precio })));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (problems.length > 0 || sinMaquilero || isPending) return;
    const sentIds = linesToSend(lines).map((l) => l.detalleId);
    const body = {
      [SALIDA_MAQUILA_ORIGENES[origen].campo]: seed.ordenId,
      centro_confeccion: Number(maquilero),
      ...(compromiso ? { fecha_compromiso: compromiso } : {}),
      ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
      detalles: toDetalles(lines, origen),
    } as CreateSalidaMaquilaBody;
    create.mutate(body, {
      onSuccess: onClose,
      onError: (error) =>
        setServerError(parseSalidaMaquilaCreateError(error, sentIds, "No se pudo generar la salida.")),
    });
  };

  if (quedan <= 0) {
    return (
      <div className="space-y-4">
        <EmptyLines>
          {programadas > 0
            ? `Todas las piezas de esta ${origen} (${formatQuantityValue(programadas)}) ya salieron a maquila. Si una salida se canceló, sus piezas vuelven a estar disponibles.`
            : `Esta ${origen} no tiene piezas que enviar a maquila.`}
        </EmptyLines>
        <div className="flex justify-end">
          <FormCancelButton label="Cerrar" onClick={onClose} />
        </div>
      </div>
    );
  }

  const visibleProblems = touched ? problems.map((p) => problemText(p, origen)) : [];
  if (touched && sinMaquilero) visibleProblems.unshift("Elige el maquilero.");
  const fieldError = (message: string | undefined) => (message ? { message } : undefined);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormSelect
          label="Maquilero"
          name="centro_confeccion"
          value={maquilero}
          disabled={isPending || loadingMaquileros}
          error={fieldError(serverError?.fields.centro_confeccion)}
          onChange={(e) => {
            setServerError(null);
            setMaquileroElegido(e.target.value);
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
          error={fieldError(serverError?.fields.fecha_compromiso)}
          onChange={(e) => {
            setServerError(null);
            setCompromiso(e.target.value);
          }}
        />
        <FormInput
          label="Observaciones (opcional)"
          name="observaciones"
          value={observaciones}
          disabled={isPending}
          error={fieldError(serverError?.fields.observaciones)}
          onChange={(e) => {
            setServerError(null);
            setObservaciones(e.target.value);
          }}
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
                <th className="px-3 py-2 font-medium text-right">En la {origen}</th>
                <th className="px-3 py-2 font-medium text-right">Piezas que salen</th>
                <th className="px-3 py-2 font-medium text-right">Precio</th>
                <th className="px-4 py-2 font-medium text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {lines.map((l) => {
                const lineError = serverError?.lines[l.detalleId];
                const qtyBad = touched && l.cantidad.trim() !== "" && !/^\d+$/.test(l.cantidad);
                const priceBad = touched && lineQty(l) > 0 && !(Number(l.precio) > 0);
                return (
                  <tr key={l.detalleId} className={lineError ? "bg-rose-50/60 dark:bg-rose-500/5" : undefined}>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                      {l.descripcion}
                      {lineError && (
                        <p role="alert" className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">
                          {lineError}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                      {formatQuantityValue(l.enOrden)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Piezas de ${l.descripcion}`}
                        aria-invalid={qtyBad || !!lineError || undefined}
                        value={l.cantidad}
                        disabled={isPending}
                        onChange={(e) => update(l.detalleId, { cantidad: e.target.value.replace(/[^\d]/g, "") })}
                        className={`w-20 rounded-lg border bg-white dark:bg-zinc-900 px-2 py-1 text-right font-semibold tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                          qtyBad || lineError ? "border-rose-400" : "border-slate-200 dark:border-white/10"
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
                        onChange={(e) => update(l.detalleId, { precio: e.target.value.replace(/[^\d.]/g, "") })}
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

      {(visibleProblems.length > 0 || (serverError && serverError.messages.length > 0)) && (
        <div role="alert" className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 space-y-1">
          {serverError?.messages.map((m) => (
            <p key={`server-${m}`}>{m}</p>
          ))}
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
