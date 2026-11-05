import { useState } from "react";

/** Lo que el selector de pedidos de la OC muestra de un pedido marcado. */
export interface PedidoSeleccionado {
  id: number;
  folio: string | null;
  cliente: string | null;
}

/**
 * Folio y cliente de cada pedido que el usuario marcó en el selector de
 * pedidos de la OC, guardados AL MARCARLO. Vive en el step manager del wizard
 * (alta y edición), no en el campo: el campo se desmonta al cambiar de paso
 * (y al cambiar el tipo de compra), y el formulario solo guarda ids. Sin esto,
 * al volver al Paso 1 un pedido marcado se pintaría como "Pedido #id" en
 * cuanto su página de búsqueda saliera de la caché.
 *
 * Los ya ligados a la orden no hace falta recordarlos: su folio viene en
 * `pedidos_vinculados`.
 */
export const usePedidoSelectionMemory = () => {
  const [known, setKnown] = useState<ReadonlyMap<number, PedidoSeleccionado>>(() => new Map());

  const remember = (pedido: PedidoSeleccionado) =>
    setKnown((prev) => new Map(prev).set(pedido.id, pedido));

  return { known, remember };
};

export type PedidoSelectionMemory = ReturnType<typeof usePedidoSelectionMemory>;
