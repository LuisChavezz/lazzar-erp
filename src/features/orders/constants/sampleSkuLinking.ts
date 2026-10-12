/**
 * Por qué el usuario NO ve las acciones de vincular SKU de muestra, aunque haya
 * tallas listas. Es solo visibilidad (misma regla que la edición en línea de la
 * cabecera); quién puede vincular de verdad lo decide el backend.
 *
 * - `closed`: el pedido ya terminó (`isPedidoTerminal`). Va primero: cerrado,
 *   nadie puede, tenga o no el permiso.
 * - `permission`: falta `E-MESACONTROL-PEDIDOS` (y no es rol "admin").
 */
export type SampleSkuLinkBlock = "closed" | "permission";

/** Texto que ocupa el lugar de la acción cuando está bloqueada. */
export const SAMPLE_SKU_LINK_BLOCK_COPY: Record<SampleSkuLinkBlock, string> = {
  closed: "El pedido está cerrado",
  permission: "Solo mesa de control puede vincular",
};

/**
 * Texto del avance de la corrida de "Vincular todas", el mismo en el aviso del
 * pedido y en el diálogo de una línea. `null`: hay corrida pero su avance se
 * perdió (la página se volvió a montar a media corrida).
 */
export const sampleSkuRunLabel = (
  progress: { processed: number; total: number; refreshing: boolean } | null,
): string => {
  if (!progress) return "Vinculando...";
  if (progress.refreshing) return "Actualizando...";
  return `Vinculando ${Math.min(progress.processed + 1, progress.total)} de ${progress.total}...`;
};
