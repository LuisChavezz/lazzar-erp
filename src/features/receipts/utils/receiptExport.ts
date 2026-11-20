import { tipoCompraLabel } from "@/src/features/purchase-orders/constants/purchaseOrderTipoCompra";
import { exportDate, type ListExportColumn } from "@/src/utils/listExport";
import { receiptTipoOrigenLabel } from "../constants/receiptOrigin";
import { getReceiptEstatusLabel } from "../constants/receiptStatus";
import type { Receipt } from "../interfaces/receipt.interface";

/** Columnas de la exportación (Excel y PDF) del listado de recepciones. */
export const RECEIPT_EXPORT_COLUMNS: ListExportColumn<Receipt>[] = [
  { header: "Folio", weight: 1.1, text: (r) => r.folio ?? "" },
  { header: "Tipo", weight: 1.3, text: (r) => receiptTipoOrigenLabel(r.tipo_origen) },
  {
    header: "Origen",
    weight: 1.1,
    text: (r) =>
      r.orden_compra_folio ??
      r.op_folio ??
      (r as Receipt & { salida_maquila_folio?: string | null }).salida_maquila_folio ??
      "",
  },
  {
    header: "Tipo de compra",
    weight: 1,
    text: (r) => (r.orden_compra_tipo_compra ? tipoCompraLabel(r.orden_compra_tipo_compra) : ""),
  },
  { header: "Proveedor", weight: 2, text: (r) => r.proveedor_nombre ?? "" },
  { header: "Almacén", weight: 1.4, text: (r) => r.almacen_nombre ?? "" },
  { header: "Fecha recepción", weight: 1, text: (r) => exportDate(r.fecha_recepcion) },
  { header: "Remisión", weight: 1, text: (r) => r.remision ?? "" },
  { header: "Factura", weight: 1, text: (r) => r.factura_referencia ?? "" },
  { header: "Estatus", weight: 1, text: (r) => getReceiptEstatusLabel(r.estatus) },
];
