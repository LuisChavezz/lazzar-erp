"use client";

import Link from "next/link";
import { SALIDA_MAQUILA_ORIGENES, salidaMaquilaOrigenRef } from "../constants/salidaMaquilaOrigen";
import type { SalidaMaquilaListItem } from "../interfaces/salida-maquila.interface";

/** "OP 2026-OP-00037", "OB …" u "OR …", con enlace al detalle de su orden. */
export function SalidaMaquilaOrigenLink({ salida }: { salida: SalidaMaquilaListItem }) {
  const ref = salidaMaquilaOrigenRef(salida);
  if (!ref) return <span className="text-slate-400">—</span>;
  const cfg = SALIDA_MAQUILA_ORIGENES[ref.origen];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
        {ref.origen}
      </span>
      <Link
        href={cfg.detailPath(ref.id)}
        title={`Ver ${cfg.nombre}`}
        className="font-mono text-sm font-semibold text-sky-600 dark:text-sky-400 underline decoration-dotted underline-offset-4"
      >
        {ref.folio || `#${ref.id}`}
      </Link>
    </span>
  );
}
