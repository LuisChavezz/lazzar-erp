"use client";

import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";

/**
 * Esqueleto de carga para la lista de correos.
 * Muestra 8 filas con animación pulse mientras se obtienen los mensajes.
 */
export const EmailListSkeleton = () => (
  <div
    className="divide-y divide-slate-100 dark:divide-slate-800"
    aria-busy="true"
    aria-label="Cargando correos"
  >
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 px-4 py-3">
        <LoadingSkeleton className="w-9 h-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between gap-2">
            <LoadingSkeleton className="h-3 w-28 rounded" />
            <LoadingSkeleton className="h-3 w-10 rounded" />
          </div>
          <LoadingSkeleton className="h-3 w-3/4 rounded" />
          <LoadingSkeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>
    ))}
  </div>
);
