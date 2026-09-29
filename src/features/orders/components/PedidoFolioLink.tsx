"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { PedidoDetailOrigin } from "../constants/pedidoDetailOrigins";

interface PedidoFolioLinkProps {
  /** PK del pedido. Siempre presente en las filas que usan este enlace. */
  pedidoId: number;
  /** `Pedido.folio` es nullable en el backend: sin folio se muestra "—". */
  folio: string | null;
  /** Origen para el "Volver" del detalle (llave de `BACK_TARGETS`). */
  from: PedidoDetailOrigin;
  /**
   * Tipografía y color base. Por defecto, el estilo secundario de una columna
   * "Pedido" junto al folio propio del registro; donde el folio del pedido ES
   * el elemento principal (listados de pedidos) se pasa el suyo en negritas.
   * El hover no se sobrescribe: es la convención de folio clicable del
   * proyecto.
   */
  className?: string;
  /** Adorno tras el folio (p. ej. el chevron de Ventas/Compras). */
  children?: ReactNode;
}

/**
 * Folio de pedido que enlaza al detalle 360° (`/orders/[id]`). Es un `<Link>`
 * real (no un botón con `router.push`) para que clic central / Ctrl+clic abran
 * pestaña nueva y las columnas no necesiten el router. Sin folio sigue siendo
 * clicable ("—") mientras exista el id: es la única entrada al detalle en
 * varias tablas.
 */
export function PedidoFolioLink({
  pedidoId,
  folio,
  from,
  className = "font-mono text-sm text-slate-600 dark:text-slate-300",
  children,
}: PedidoFolioLinkProps) {
  return (
    <Link
      href={`/orders/${pedidoId}?from=${from}`}
      title="Ver detalle del pedido"
      className={`${className} hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer`}
    >
      {folio || "—"}
      {children}
    </Link>
  );
}
