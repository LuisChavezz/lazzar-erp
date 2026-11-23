import { formatFechaConfirmacion } from "@/src/features/orders/utils/pedidoFormat";
import { exportNum, type ListExportColumn } from "@/src/utils/listExport";
import { getSurtidoEtapaConfig, surtidoEstatusLabel } from "../constants/surtidoEtapa";
import type { SurtidoPedido } from "../interfaces/order-fulfillment.interface";

/** Columnas de la exportación (Excel y PDF) del avance de surtido por pedido. */
export const SURTIDO_PEDIDO_EXPORT_COLUMNS: ListExportColumn<SurtidoPedido>[] = [
  { header: "Pedido", weight: 1.1, text: (r) => r.folio ?? `#${r.id}` },
  { header: "Estatus", weight: 1.1, text: (r) => surtidoEstatusLabel(r.estatus, r.estatus_display) },
  { header: "Cliente", weight: 2.2, text: (r) => r.cliente_nombre ?? "" },
  // Misma lectura que la hoja del pedido (zona del navegador, EC-936).
  {
    header: "Confirmado",
    weight: 1,
    text: (r) => (r.fecha_confirmacion ? formatFechaConfirmacion(r.fecha_confirmacion) : ""),
  },
  { header: "Etapa", weight: 0.9, text: (r) => getSurtidoEtapaConfig(r.etapa).label },
  { header: "% surtido", weight: 0.7, text: (r) => `${Math.round(exportNum(r.pct_surtido))}%` },
  { header: "Pedidas", weight: 0.7, text: (r) => String(exportNum(r.pedidas)) },
  { header: "Surtidas", weight: 0.7, text: (r) => String(exportNum(r.surtidas)) },
  { header: "Comprometidas", weight: 0.9, text: (r) => String(exportNum(r.comprometidas)) },
  { header: "Empacadas", weight: 0.8, text: (r) => String(exportNum(r.empacadas)) },
  { header: "Despachadas", weight: 0.8, text: (r) => String(exportNum(r.despachadas)) },
  { header: "Salidas manuales", weight: 0.9, text: (r) => String(exportNum(r.salidas_manuales)) },
];
