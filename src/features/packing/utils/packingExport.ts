import { exportDate, exportNum, type ListExportColumn } from "@/src/utils/listExport";
import { PACKING_STATUS_CONFIG } from "../constants/packingStatus";
import type { Packing } from "../interfaces/packing.interface";

/** Columnas de la exportación (Excel y PDF) del listado de embarques. */
export const PACKING_EXPORT_COLUMNS: ListExportColumn<Packing>[] = [
  { header: "Folio", weight: 1.1, text: (r) => r.folio ?? "" },
  { header: "Surtido", weight: 1.1, text: (r) => r.picking_folio ?? "" },
  { header: "Pedido", weight: 1.1, text: (r) => r.pedido_folio ?? "" },
  { header: "Cliente", weight: 2, text: (r) => r.pedido_vinculado?.cliente?.nombre ?? "" },
  { header: "Estatus", weight: 1, text: (r) => PACKING_STATUS_CONFIG[r.estado]?.label ?? r.estado },
  { header: "Cajas", weight: 0.6, text: (r) => String(exportNum(r.numero_cajas)) },
  {
    header: "Piezas",
    weight: 0.6,
    text: (r) => String((r.packing_detalle ?? []).reduce((acc, d) => acc + exportNum(d.cantidad_empacada), 0)),
  },
  { header: "Peso (kg)", weight: 0.8, text: (r) => String(exportNum(r.peso_total)) },
  { header: "Operador", weight: 1.6, text: (r) => r.operador_nombre ?? "" },
  { header: "Creado", weight: 1, text: (r) => exportDate(r.created_at) },
];
