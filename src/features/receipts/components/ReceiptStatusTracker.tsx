"use client";

import { getReceiptEstatusLabel } from "../constants/receiptStatus";
import type { Receipt } from "../interfaces/receipt.interface";
import { RECEIPT_ALCANCE_LABEL, receiptAlcance } from "../utils/receiptAlcance";
import { RECEIPT_INSPECCION_LABEL } from "../utils/receiptInspeccion";

type StepState = "done" | "active" | "partial" | "warn" | "failed" | "skipped" | "todo";

type TrackerReceipt = Pick<Receipt, "estatus" | "alcance_recepcion" | "inspeccion_estado">;

const SEGMENT: Record<StepState, string> = {
  done: "bg-emerald-500",
  active: "bg-sky-500 animate-pulse motion-reduce:animate-none",
  partial: "bg-amber-400",
  warn: "bg-amber-400",
  failed: "bg-rose-500",
  skipped: "bg-slate-200 dark:bg-white/10 bg-[repeating-linear-gradient(135deg,transparent_0_3px,rgba(148,163,184,.45)_3px_5px)]",
  todo: "bg-slate-200 dark:bg-white/10",
};

const CAPTION: Record<StepState, string> = {
  done: "text-emerald-600/80 dark:text-emerald-400/80",
  active: "text-slate-700 dark:text-slate-200",
  partial: "text-amber-600 dark:text-amber-400",
  warn: "text-amber-600 dark:text-amber-400",
  failed: "text-rose-600 dark:text-rose-400",
  skipped: "text-slate-400 dark:text-slate-500",
  todo: "text-slate-400 dark:text-slate-500",
};

const LABEL_TONE: Record<number, string> = {
  1: "text-slate-600 dark:text-slate-300",
  2: "text-emerald-700 dark:text-emerald-400",
  3: "text-amber-700 dark:text-amber-400",
  4: "text-sky-700 dark:text-sky-300",
  5: "text-emerald-700 dark:text-emerald-400",
};

/**
 * Paso de Calidad:
 *  - 4 En calidad: en curso.
 *  - 5 Cerrada: el resultado de su última inspección (aprobada, con
 *    condición, rechazada). Sin inspección, "no aplicó": las SM de bordado y
 *    reflejante se registran directo como Cerradas (nucleo-erp #1286).
 *  - 2 / 3: anteriores al filtro de Calidad, no pasaron por inspección.
 */
const calidadState = ({ estatus, inspeccion_estado }: TrackerReceipt): StepState => {
  if (estatus === 1) return "todo";
  if (estatus === 4) return "active";
  if (estatus === 2 || estatus === 3) return "skipped";
  if (!inspeccion_estado) return "skipped";
  if (inspeccion_estado === "rechazada") return "failed";
  if (inspeccion_estado === "aprobada_condicion") return "warn";
  return "done";
};

/**
 * Estatus de una recepción como tracker de 3 pasos (Recibida → Calidad →
 * Cerrada), tipo "seguimiento de pedido":
 *  1. Recibida: PARCIAL (ámbar) o COMPLETA (verde) respecto a su orden.
 *  2. Calidad: en curso, o el resultado de la inspección.
 *  3. Cerrada: calidad la liberó (una parcial también se cierra; lo que sigue
 *     abierto es la ORDEN, esperando la siguiente recepción).
 * La cancelada no tiene pasos: solo su etiqueta en rojo.
 */
export function ReceiptStatusTracker({ receipt }: { receipt: TrackerReceipt }) {
  const { estatus } = receipt;
  const label = getReceiptEstatusLabel(estatus);

  if (![1, 2, 3, 4, 5].includes(estatus)) {
    const cancelada = estatus === 6;
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
          cancelada ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${cancelada ? "bg-rose-500" : "bg-slate-400"}`} />
        {label}
      </span>
    );
  }

  const alcance = receiptAlcance(receipt);
  const inspeccion = receipt.inspeccion_estado ? RECEIPT_INSPECCION_LABEL[receipt.inspeccion_estado] : null;
  const states: StepState[] = [
    estatus === 1 ? "active" : alcance === "PARCIAL" ? "partial" : "done",
    calidadState(receipt),
    estatus === 5 || estatus === 2 ? "done" : "todo",
  ];
  const captions = [
    alcance ? RECEIPT_ALCANCE_LABEL[alcance] : "Recibida",
    states[1] === "warn" ? "Condición" : states[1] === "failed" ? "Rechazo" : "Calidad",
    "Cerrada",
  ];
  const texto: Record<StepState, string> = {
    done: "lista",
    active: "en curso",
    partial: "parcial",
    warn: "con condición",
    failed: "rechazada",
    skipped: "no aplicó",
    todo: "pendiente",
  };
  const resumen = [
    `Recibida: ${estatus === 1 ? "en curso" : alcance ? RECEIPT_ALCANCE_LABEL[alcance].toLowerCase() : "lista"}`,
    `Calidad: ${inspeccion && estatus === 5 ? inspeccion.toLowerCase() : texto[states[1]]}`,
    `Cerrada: ${texto[states[2]]}`,
  ].join(" · ");
  // En 2/3 la etiqueta ya dice "Recibida"/"Parcial": no se repite el alcance.
  const conSufijo = alcance && estatus !== 2 && estatus !== 3;

  return (
    <span className="inline-flex w-40 flex-col gap-1" title={resumen} aria-label={`${label}. ${resumen}`}>
      <span className="text-xs">
        <b className={`font-semibold ${LABEL_TONE[estatus] ?? ""}`}>{label}</b>
        {conSufijo && (
          <span className={alcance === "PARCIAL" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}>
            {" · "}
            {alcance === "PARCIAL" ? "parcial" : "completa"}
          </span>
        )}
      </span>
      <span aria-hidden="true" className="grid grid-cols-3 gap-1">
        {states.map((state, i) => (
          <span key={i} className="flex flex-col items-center gap-0.5">
            <span className={`h-2 w-full rounded-full ${SEGMENT[state]}`} />
            <span className={`text-[9px] font-semibold uppercase tracking-wide ${CAPTION[state]}`}>{captions[i]}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
