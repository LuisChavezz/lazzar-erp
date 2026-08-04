"use client";

import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { CopyIcon, FileCode2Icon } from "@/src/components/Icons";
import { SectionTitle } from "@/src/components/DetailDialogPrimitives";

const DEFAULT_EMPTY_MESSAGE = "Sin ZPL registrado para esta impresión.";

interface RfidLabelZplBlockProps {
  zpl: string | null;
  /** Mensaje del estado vacío. El historial pasa su propia constante
   *  (`SIN_ZPL_MESSAGE`, compartida con el motivo de bloqueo del botón de
   *  reimpresión) para que ambos sitios digan exactamente lo mismo. */
  emptyMessage?: string;
  /** Contenido opcional bajo el bloque de ZPL —p. ej. la nota de "esto es una
   *  muestra representativa" del asistente cuando `cantidad > 1`—. Con `zpl`
   *  ausente no se renderiza (no aplica al estado vacío). */
  note?: ReactNode;
}

/**
 * Sección "ZPL generado": título + botón "Copiar" + bloque `<pre>` con el ZPL,
 * o el estado vacío cuando no hay ZPL. Extraída de `RfidLabelDetailDialog`
 * (mismo `handleCopyZpl` de ahí, ahora aquí) para reutilizarse en la vista
 * previa del asistente de "Nueva impresión" (`RfidLabelPrintStep`), que
 * muestra `zpl_individual[0]` como muestra representativa del lote.
 */
export function RfidLabelZplBlock({
  zpl,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  note,
}: RfidLabelZplBlockProps) {
  const handleCopy = async () => {
    if (!zpl) return;
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API no disponible");
      }
      await navigator.clipboard.writeText(zpl);
      toast.success("ZPL copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el ZPL. Selecciónalo y cópialo manualmente.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <SectionTitle>ZPL generado</SectionTitle>
        {zpl && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
          >
            <CopyIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Copiar
          </button>
        )}
      </div>
      {zpl ? (
        <>
          <pre className="max-h-56 overflow-auto rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
            {zpl}
          </pre>
          {note}
        </>
      ) : (
        <p className="flex items-center gap-1.5 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 px-3 py-3 text-xs text-slate-400 dark:text-slate-500 italic">
          <FileCode2Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {emptyMessage}
        </p>
      )}
    </div>
  );
}
