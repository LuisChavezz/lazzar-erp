"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useAltaCatalogoLinea } from "../hooks/useAltaCatalogoLinea";
import type { SpecialOrderLine } from "../interfaces/special-order.interface";
import { isTallaPendingCatalogAlta } from "../utils/catalogAlta";

interface CatalogAltaConfirmDialogProps {
  pedidoId: number;
  open: boolean;
  /** La línea del detalle vigente; `null` cuando no hay ninguna elegida. */
  line: SpecialOrderLine | null;
  onClose: () => void;
}

/**
 * Confirmación de "Dar de alta en catálogo" de UNA línea. Trabaja con la línea
 * tal como estaba al abrir (`useDialogSession`): el texto no cambia si el
 * detalle se relee a media confirmación, y sobrevive a la animación de salida.
 */
export function CatalogAltaConfirmDialog({
  pedidoId,
  open,
  line,
  onClose,
}: CatalogAltaConfirmDialogProps) {
  const session = useDialogSession(open, line);
  if (!session.snapshot) return null;

  return (
    <CatalogAltaConfirmDialogContent
      key={session.id}
      pedidoId={pedidoId}
      open={open}
      line={session.snapshot}
      onClose={onClose}
    />
  );
}

function CatalogAltaConfirmDialogContent({
  pedidoId,
  open,
  line,
  onClose,
}: Omit<CatalogAltaConfirmDialogProps, "line"> & { line: SpecialOrderLine }) {
  const { altaCatalogo, isPending } = useAltaCatalogoLinea(pedidoId, line.id);

  const pendientes = line.tallas
    .filter(isTallaPendingCatalogAlta)
    .map((talla) => talla.talla_nombre || "—")
    .join(", ");
  // Alta incremental: el backend cuelga las tallas nuevas del producto de
  // catálogo que la línea ya tenga.
  const yaEnCatalogo = line.tallas.some((talla) => talla.aplica_catalogo);
  const categoria = line.categoria_producto?.nombre ?? "—";

  const description = yaEnCatalogo
    ? `Se agregará un SKU de catálogo por cada talla pendiente (${pendientes}) al producto que la línea ya tiene en catálogo, con su lista de materiales, para que salgan en Nueva OP y en los movimientos de stock.`
    : `Se creará el producto de catálogo (categoría ${categoria}) y un SKU por cada talla pendiente (${pendientes}), con su lista de materiales, para que salgan en Nueva OP y en los movimientos de stock.`;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Dar de alta en catálogo"
      description={`${line.producto_nombre_externo || "Línea de muestra"}: ${description}`}
      confirmText={isPending ? "Dando de alta..." : "Dar de alta"}
      confirmColor="blue"
      closeOnConfirm={false}
      busy={isPending}
      onConfirm={() => altaCatalogo({ onSettled: onClose })}
    />
  );
}
