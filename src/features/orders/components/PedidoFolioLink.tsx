"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { pedidoDetailHref, type PedidoDetailOrigin } from "../constants/pedidoDetailOrigins";

const HOVER_CLASS = {
  muted: "hover:text-sky-600 dark:hover:text-sky-400",
  accent: "hover:text-sky-700 dark:hover:text-sky-300",
} as const;

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
  /**
   * Color del hover. `muted` (default) para el folio secundario de una tabla,
   * que pasa de gris a `sky-600`; `accent` para un folio que YA se pinta en
   * `sky-600` (el campo "Pedido" de los detalles de producción), que se oscurece
   * a `sky-700`. Va aparte de `className` porque el proyecto no tiene
   * tailwind-merge: un `hover:` en `className` competiría con el de aquí.
   */
  tone?: "muted" | "accent";
  /** Adorno tras el folio (p. ej. el chevron de Ventas/Compras). */
  children?: ReactNode;
  /**
   * Parámetros extra que el origen necesita para su "Volver" (p. ej. `factura`
   * del origen `invoice`). Opcional: sin él la URL es la de siempre.
   */
  query?: Record<string, string>;
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
  tone = "muted",
  children,
  query,
}: PedidoFolioLinkProps) {
  return (
    <Link
      href={pedidoDetailHref(pedidoId, from, query)}
      title="Ver detalle del pedido"
      className={`${className} ${HOVER_CLASS[tone]} hover:underline transition-colors cursor-pointer`}
    >
      {folio || "—"}
      {children}
    </Link>
  );
}
