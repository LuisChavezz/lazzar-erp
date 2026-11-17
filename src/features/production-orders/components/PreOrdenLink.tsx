"use client";

import { AccessibleLink } from "@/src/components/AccessibleLink";
import type { ProductionOrderPreOrdenRef } from "../interfaces/production-order.interface";

/**
 * Enlace a la pre-orden de la que salió la OP ("Resurtido #41"). Pre-órdenes
 * exige `R-PRODUCCION` y la OP `R-PRODUCCION-OP`: quien solo tiene el segundo
 * ve la referencia como texto, no un enlace que acabaría en "sin acceso"
 * (EC-895).
 */
export const PreOrdenLink = ({ preOrden }: { preOrden: ProductionOrderPreOrdenRef }) => (
  <AccessibleLink
    href={`/manufacturing/pre-orders/${preOrden.id}`}
    title="Ver pre-orden"
    className="text-sm font-semibold text-sky-600 dark:text-sky-400 underline decoration-dotted underline-offset-4 hover:text-sky-700 dark:hover:text-sky-300"
    fallbackClassName="text-sm font-semibold text-slate-700 dark:text-slate-200"
  >
    {preOrden.referencia || `Pre-orden #${preOrden.id}`}
  </AccessibleLink>
);
