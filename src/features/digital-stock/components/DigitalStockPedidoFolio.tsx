"use client";

import { useRouteAccess } from "@/src/hooks/useRouteAccess";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import {
  pedidoDetailHref,
  type PedidoDetailOrigin,
} from "@/src/features/orders/constants/pedidoDetailOrigins";

/**
 * Folio de pedido del detalle de stock digital con la MISMA regla que los
 * folios de OP y OC (`AccessibleLink`): solo es enlace si el usuario puede abrir
 * `/orders/{id}` (`useRouteAccess`, la regla del proxy). Sin acceso se pinta como
 * texto, para no ofrecer una ruta que acabaría en "sin acceso"; mientras la
 * sesión carga, atenuado. Con acceso es el `PedidoFolioLink` de siempre (y su
 * origen de "Volver"). Es un envoltorio local: `PedidoFolioLink` no cambia para
 * el resto de la app.
 */
export function DigitalStockPedidoFolio({
  pedidoId,
  folio,
  from,
  className,
  textClassName,
}: {
  pedidoId: number;
  folio: string | null;
  from: PedidoDetailOrigin;
  /** Clase del enlace. */
  className: string;
  /** Clase del texto sin enlace. */
  textClassName: string;
}) {
  const { isPending, canOpen } = useRouteAccess();
  const text = folio || "—";
  if (isPending) {
    return (
      <span className={`${textClassName} animate-pulse`} aria-busy="true">
        {text}
      </span>
    );
  }
  if (!canOpen(pedidoDetailHref(pedidoId, from).split(/[?#]/)[0])) {
    return <span className={textClassName}>{text}</span>;
  }
  return (
    <PedidoFolioLink pedidoId={pedidoId} folio={folio} from={from} tone="accent" className={className} />
  );
}
