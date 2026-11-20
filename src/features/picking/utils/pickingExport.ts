import type { ListExportColumn } from "@/src/utils/listExport";
import { formatShortCalendarDate, formatShortDate } from "@/src/utils/formatDate";
import { getMexicoTimeHHMM, MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import { PICKING_EMPAQUE_CONFIG } from "../constants/pickingEmpaque";
import { PICKING_STATUS_CONFIG } from "../constants/pickingStatus";
import type { PickingListItem } from "../interfaces/picking.interface";
import { getProgramacionDestinoLabel } from "./pickingDestino";

const num = (value: unknown) => Number(value) || 0;

const empaqueText = (row: PickingListItem) => {
  if (!row.estado_empaque) return "";
  // Igual que la tabla: un cancelado no espera embarque.
  if (row.estado === "Cancelado" && row.estado_empaque === "POR_EMPACAR") return "";
  return PICKING_EMPAQUE_CONFIG[row.estado_empaque]?.label ?? row.estado_empaque;
};

/** Columnas de la exportación (Excel y PDF) del listado de surtidos. */
export const PICKING_EXPORT_COLUMNS: ListExportColumn<PickingListItem>[] = [
  { header: "Surtido", weight: 1.1, text: (r) => r.folio || `#${r.id}` },
  {
    header: "Fecha",
    weight: 1.2,
    text: (r) =>
      r.created_at
        ? `${formatShortDate(r.created_at, { timeZone: MEXICO_TIME_ZONE })} ${getMexicoTimeHHMM(r.created_at)}`
        : "",
  },
  { header: "Pedido", weight: 1.1, text: (r) => r.pedido_folio ?? "" },
  {
    header: "Cliente",
    weight: 1.8,
    text: (r) => r.cliente_nombre?.trim() || r.pedido_vinculado?.cliente?.nombre || "",
  },
  {
    header: "Entrega",
    weight: 1,
    text: (r) => (r.pedido_fecha_entrega ? formatShortCalendarDate(r.pedido_fecha_entrega) : ""),
  },
  {
    header: "Para",
    weight: 1,
    text: (r) => (r.programacion_destino ? getProgramacionDestinoLabel(r.programacion_destino) : "Sin programación"),
  },
  {
    header: "Avance programación",
    weight: 0.9,
    text: (r) => {
      const cantidad = num(r.programacion_avance?.cantidad);
      return cantidad > 0 ? `${num(r.programacion_avance?.surtido)}/${cantidad}` : "";
    },
  },
  { header: "Están en", weight: 1.3, text: (r) => r.almacen_actual_nombre ?? "" },
  { header: "Traspaso", weight: 0.9, text: (r) => r.transferencia_folio ?? "" },
  { header: "Piezas", weight: 0.6, text: (r) => String(num(r.piezas)) },
  { header: "Productos", weight: 0.7, text: (r) => String(num(r.productos)) },
  { header: "Tallas", weight: 0.6, text: (r) => String(num(r.tallas)) },
  { header: "Empaque", weight: 0.9, text: empaqueText },
  { header: "Embarque", weight: 1, text: (r) => (r.packings ?? []).map((p) => p.folio).join(", ") },
  { header: "Estatus", weight: 0.9, text: (r) => PICKING_STATUS_CONFIG[r.estado]?.label ?? r.estado },
  { header: "Surtió", weight: 1.5, text: (r) => r.operador_nombre ?? "" },
];
