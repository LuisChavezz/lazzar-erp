"use client";

import Link from "next/link";
import type { ProductionOrderPreOrdenRef } from "../interfaces/production-order.interface";

/**
 * Enlace a la pre-orden de la que salió la OP ("Resurtido #41"). Las dos
 * pantallas viven en Producción, así que quien ve la OP puede abrirla.
 */
export const PreOrdenLink = ({ preOrden }: { preOrden: ProductionOrderPreOrdenRef }) => (
  <Link
    href={`/manufacturing/pre-orders/${preOrden.id}`}
    title="Ver pre-orden"
    className="text-sm font-semibold text-sky-600 dark:text-sky-400 underline decoration-dotted underline-offset-4 hover:text-sky-700 dark:hover:text-sky-300"
  >
    {preOrden.referencia || `Pre-orden #${preOrden.id}`}
  </Link>
);
