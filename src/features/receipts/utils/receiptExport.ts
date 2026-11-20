import { tipoCompraLabel } from "@/src/features/purchase-orders/constants/purchaseOrderTipoCompra";
import { exportDate, exportNum, type ListExportColumn } from "@/src/utils/listExport";
import { receiptInspeccionLabel, receiptPedidosText } from "./receiptInspeccion";
import { receiptTipoOrigenLabel } from "../constants/receiptOrigin";
import { getReceiptEstatusLabel } from "../constants/receiptStatus";
import type { Receipt } from "../interfaces/receipt.interface";
import { RECEIPT_ALCANCE_LABEL, receiptAlcance } from "./receiptAlcance";
import { receiptOrigenFolio } from "../components/ReceiptColumns";

/** Columnas de la exportación (Excel y PDF) del listado de recepciones. */
export const RECEIPT_EXPORT_COLUMNS: ListExportColumn<Receipt>[] = [
  { header: "Folio", weight: 1.1, text: (r) => r.folio ?? "" },
  { header: "Registró", weight: 1.4, text: (r) => r.usuario_nombre ?? "" },
  { header: "Pedido", weight: 1.3, text: (r) => receiptPedidosText(r.pedidos) },
  { header: "Tipo", weight: 1.3, text: (r) => receiptTipoOrigenLabel(r.tipo_origen) },
  { header: "Origen", weight: 1.1, text: receiptOrigenFolio },

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
  { header: "Piezas", weight: 0.6, text: (r) => String(exportNum(r.piezas_recibidas)) },
  { header: "Renglones", weight: 0.7, text: (r) => String(r.renglones ?? "") },
  { header: "Calidad", weight: 1.1, text: (r) => receiptInspeccionLabel(r.inspeccion_estado) },
  { header: "Aprobadas", weight: 0.7, text: (r) => (r.inspeccion_estado ? String(exportNum(r.piezas_aprobadas)) : "") },
  { header: "Rechazadas", weight: 0.7, text: (r) => (r.inspeccion_estado ? String(exportNum(r.piezas_rechazadas)) : "") },
  {
    header: "Recibida",
    weight: 0.8,
    text: (r) => {
      const alcance = receiptAlcance(r);
      return alcance ? RECEIPT_ALCANCE_LABEL[alcance] : "";
    },
  },
  { header: "Estatus", weight: 1, text: (r) => getReceiptEstatusLabel(r.estatus) },
];
