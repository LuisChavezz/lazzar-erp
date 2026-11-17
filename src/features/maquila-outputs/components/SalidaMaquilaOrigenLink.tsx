"use client";

import Link from "next/link";
import type { SalidaMaquilaListItem } from "../interfaces/salida-maquila.interface";

/** "OP 2026-OP-00037" u "OB …", con enlace a su detalle. */
export function SalidaMaquilaOrigenLink({ salida }: { salida: SalidaMaquilaListItem }) {
  const esOb = salida.origen === "OB" || (salida.op == null && salida.ob != null);
  const id = salida.origen_id ?? (esOb ? salida.ob : salida.op);
  const folio = salida.origen_folio ?? (esOb ? salida.ob_folio : salida.op_folio);
  if (id == null) return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
        {esOb ? "OB" : "OP"}
      </span>
      <Link
        href={esOb ? `/manufacturing/embroidery/${id}` : `/manufacturing/production-orders/${id}`}
        title={esOb ? "Ver orden de bordado" : "Ver orden de producción"}
        className="font-mono text-sm font-semibold text-sky-600 dark:text-sky-400 underline decoration-dotted underline-offset-4"
      >
        {folio || `#${id}`}
      </Link>
    </span>
  );
}
