/** Resultado de la última inspección de calidad de una recepción (nucleo-erp #1286). */
export const RECEIPT_INSPECCION_LABEL: Record<string, string> = {
  aprobada: "Aprobada",
  aprobada_condicion: "Aprobada con condición",
  rechazada: "Rechazada",
  pendiente: "Pendiente",
};

export const receiptInspeccionLabel = (estado: string | null | undefined): string =>
  estado ? (RECEIPT_INSPECCION_LABEL[estado] ?? estado) : "";

/** Pedidos ligados como texto: "P-00160-2026, P-00161-2026". */
export const receiptPedidosText = (pedidos: { id: number; folio: string | null }[] | undefined): string =>
  (pedidos ?? []).map((p) => p.folio ?? `#${p.id}`).join(", ");
