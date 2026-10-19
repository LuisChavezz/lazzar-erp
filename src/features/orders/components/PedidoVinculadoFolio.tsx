"use client";

import { useSession } from "next-auth/react";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { pedidoDetailPath, type PedidoDetailOrigin } from "../constants/pedidoDetailOrigins";
import { PedidoFolioLink } from "./PedidoFolioLink";

interface PedidoVinculadoFolioProps {
  /** `pedido_vinculado` de la orden (`armar_pedido_vinculado` en el backend). */
  pedidoVinculado: { id: number; folio: string } | null | undefined;
  /** `pedido_folio` plano: lo que se muestra como texto si no hay enlace. */
  pedidoFolio: string | null | undefined;
  /** Origen para el "Volver" del detalle del pedido: el listado de la orden. */
  from: PedidoDetailOrigin;
}

/**
 * Campo "Pedido" del detalle de una orden de producción, bordado, reflejante o
 * corte de manga: enlace al detalle 360° del pedido madre (`/orders/[id]`).
 *
 * - Se navega por `pedido_vinculado`, no por el par plano `pedido`/`pedido_folio`:
 *   su presencia es la única señal de que el pedido madre existe. Sin él queda
 *   el folio como texto (o "—").
 * - Solo se enlaza si el usuario puede abrir `/orders` (`canAccessRoute`, la
 *   misma regla que el proxy). Hoy los códigos de las cuatro órdenes están en
 *   esa regla, pero que dos reglas coincidan no se da por hecho: si dejaran de
 *   coincidir, el enlace rebotaría al Home en silencio.
 */
export function PedidoVinculadoFolio({
  pedidoVinculado,
  pedidoFolio,
  from,
}: PedidoVinculadoFolioProps) {
  const { data: session } = useSession();

  if (!pedidoVinculado || !canAccessRoute(pedidoDetailPath(pedidoVinculado.id), session?.user)) {
    return <span className="font-mono">{textOrDash(pedidoVinculado?.folio ?? pedidoFolio)}</span>;
  }

  return (
    <PedidoFolioLink
      pedidoId={pedidoVinculado.id}
      folio={pedidoVinculado.folio}
      from={from}
      className="font-mono text-sky-600 dark:text-sky-400"
      tone="accent"
    />
  );
}
