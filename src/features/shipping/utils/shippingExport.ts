import { exportDate, type ListExportColumn } from "@/src/utils/listExport";
import { shipmentContenido, shipmentTransporteLabel } from "../components/ShippingColumns";
import type { Shipment } from "../interfaces/shipping.interface";

/** Columnas de la exportación (Excel y PDF) del listado de envíos. */
export const SHIPPING_EXPORT_COLUMNS: ListExportColumn<Shipment>[] = [
  { header: "Embarque", weight: 1.1, text: (r) => r.packing_folio ?? "" },
  { header: "Salió", weight: 1, text: (r) => exportDate(r.fecha_creacion) },
  { header: "Registró", weight: 1.4, text: (r) => r.usuario_nombre ?? "" },
  { header: "Pedido", weight: 1.1, text: (r) => r.pedido_folio ?? "" },
  { header: "Cliente", weight: 2, text: (r) => r.cliente_nombre ?? "" },
  { header: "Transporte", weight: 1.1, text: shipmentTransporteLabel },
  { header: "Chofer", weight: 1.3, text: (r) => (r.tipo_envio === "LOCAL" ? (r.chofer_nombre ?? "") : "") },
  { header: "Guía", weight: 1.4, text: (r) => r.guia ?? "" },
  { header: "Piezas", weight: 0.6, text: (r) => String(shipmentContenido(r).piezas) },
  { header: "Líneas", weight: 0.6, text: (r) => String(shipmentContenido(r).lineas) },
  { header: "Cajas", weight: 0.6, text: (r) => String(shipmentContenido(r).cajas) },
];
