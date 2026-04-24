"use client";

import { useState } from "react";

// --- MetaRow simple ---

interface MetaRowProps {
  label: string;
  value: string;
}

/**
 * Fila de metadato del encabezado del correo.
 * Muestra una etiqueta y su valor en una sola línea.
 */
export const MetaRow = ({ label, value }: MetaRowProps) => (
  <div className="flex items-start gap-2 text-xs">
    <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400 w-10">
      {label}:
    </span>
    <span className="text-slate-700 dark:text-slate-300 break-all">{value}</span>
  </div>
);

// --- MetaRowRecipients (campo "Para" con toggle expandir/colapsar) ---

/** Número de destinatarios visibles antes de mostrar el botón "ver más". */
const VISIBLE_RECIPIENTS = 2;

interface MetaRowRecipientsProps {
  label: string;
  /** Cadena de destinatarios separados por coma: "a@a.com, b@b.com, ..." */
  value: string;
}

/**
 * Variante del MetaRow para el campo "Para:".
 *
 * Cuando la lista de destinatarios supera `VISIBLE_RECIPIENTS`, muestra
 * un resumen colapsado con un botón toggle para expandir/colapsar el listado
 * completo sin desplazar el resto del contenido abruptamente.
 */
export const MetaRowRecipients = ({ label, value }: MetaRowRecipientsProps) => {
  const [expanded, setExpanded] = useState(false);

  // Divide la cadena de destinatarios y normaliza espacios en blanco.
  const recipients = value
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const hasOverflow = recipients.length > VISIBLE_RECIPIENTS;
  const visible = expanded ? recipients : recipients.slice(0, VISIBLE_RECIPIENTS);
  const hiddenCount = recipients.length - VISIBLE_RECIPIENTS;

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400 w-10">
        {label}:
      </span>

      <span className="flex-1 min-w-0">
        {/* Lista de destinatarios visibles */}
        <span className="text-slate-700 dark:text-slate-300 break-all">
          {visible.join(", ")}
        </span>

        {/* Badge colapsado: muestra cuántos más hay sin expandir */}
        {hasOverflow && !expanded && (
          <>
            <span className="text-slate-400 dark:text-slate-500">{", "}</span>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={`Mostrar ${hiddenCount} destinatario${hiddenCount !== 1 ? "s" : ""} más`}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-150 font-medium cursor-pointer align-middle"
            >
              +{hiddenCount} más
            </button>
          </>
        )}

        {/* Botón para colapsar cuando está expandido */}
        {hasOverflow && expanded && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Ocultar destinatarios adicionales"
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-150 font-medium cursor-pointer align-middle"
            >
              Ver menos
            </button>
          </>
        )}
      </span>
    </div>
  );
};
