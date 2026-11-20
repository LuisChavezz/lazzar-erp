import { exportDate, type ListExportColumn } from "@/src/utils/listExport";
import { QUALITY_ESTADO_CFG, type QualityDoneRow, type QualityPendingRow } from "../components/QualityInspectionColumns";

/** Etiqueta del tipo de origen de la recepción. */
export const QUALITY_TIPO_LABEL: Record<string, string> = {
  OC: "Orden de compra",
  OP: "Orden de producción",
  SM: "Salida a maquila",
};

const tipoLabel = (tipo: string) => QUALITY_TIPO_LABEL[tipo] ?? tipo;
const pedidosText = (r: { pedidos: { id: number; folio: string | null }[] }) =>
  r.pedidos.map((p) => p.folio ?? `#${p.id}`).join(", ");

/** Exportación de la pestaña "Por inspeccionar". */
export const QUALITY_PENDING_EXPORT_COLUMNS: ListExportColumn<QualityPendingRow>[] = [
  { header: "Recepción", weight: 1.1, text: (r) => r.folio ?? "" },
  { header: "Fecha recepción", weight: 1, text: (r) => exportDate(r.fecha_recepcion) },
  { header: "Pedido", weight: 1.3, text: pedidosText },
  { header: "Tipo de origen", weight: 1.3, text: (r) => tipoLabel(r.tipo_origen) },
  { header: "Origen", weight: 1.1, text: (r) => r.origen ?? "" },
  { header: "Proveedor", weight: 2, text: (r) => r.proveedor_nombre ?? "" },
  { header: "Almacén", weight: 1.4, text: (r) => r.almacen ?? "" },
  { header: "Piezas", weight: 0.6, text: (r) => String(r.piezas) },
  { header: "Productos", weight: 0.7, text: (r) => String(r.renglones) },
];

/** Exportación de la pestaña "Inspeccionadas". */
export const QUALITY_DONE_EXPORT_COLUMNS: ListExportColumn<QualityDoneRow>[] = [
  { header: "Recepción", weight: 1.1, text: (r) => r.recepcion_folio ?? "" },
  { header: "Fecha inspección", weight: 1, text: (r) => exportDate(r.fecha) },
  { header: "Pedido", weight: 1.3, text: pedidosText },
  { header: "Tipo de origen", weight: 1.3, text: (r) => tipoLabel(r.tipo_origen) },
  { header: "Origen", weight: 1.1, text: (r) => r.origen ?? "" },
  { header: "Proveedor", weight: 2, text: (r) => r.proveedor_nombre ?? "" },
  { header: "Resultado", weight: 1.3, text: (r) => QUALITY_ESTADO_CFG[r.estado]?.label ?? r.estado },
  { header: "Aprobadas", weight: 0.7, text: (r) => String(r.aprobadas) },
  { header: "Rechazadas", weight: 0.7, text: (r) => String(r.rechazadas) },
  { header: "Inspector", weight: 1.5, text: (r) => r.inspector ?? "" },
];
