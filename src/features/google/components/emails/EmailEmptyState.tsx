"use client";

import { EmailIcon } from "@/src/components/Icons";

/**
 * Estado vacío de la bandeja de entrada.
 * Se muestra cuando la petición fue exitosa pero no devolvió mensajes.
 */
export const EmailEmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-slate-400 dark:text-slate-500">
    <EmailIcon className="w-10 h-10" aria-hidden="true" />
    <p className="text-sm">No hay correos en la bandeja de entrada.</p>
  </div>
);
