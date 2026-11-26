import { exportDate, type ListExportColumn } from "@/src/utils/listExport";
import { shipmentContenido, shipmentTransporteLabel } from "../components/ShippingColumns";
import type { Shipment } from "../interfaces/shipping.interface";
import { SHIPMENT_STATUS_CONFIG } from "../constants/shipmentStatus";
import { shipmentDisplayStatus } from "./shipmentDelivery";

/** Columnas de la exportación (Excel y PDF) del listado de envíos. */
/**
 * Resumen de la exportación: los envíos vigentes y sus piezas; los cancelados
 * se cuentan aparte, sin sumar sus piezas (regresaron al almacén, EC-945).
 */
export const shippingExportSummary = (rows: Shipment[]): string => {
  const vigentes = rows.filter((r) => r.estado !== "CANCELADO");
  const piezas = vigentes.reduce((acc, r) => acc + shipmentContenido(r).piezas, 0);
  const cancelados = rows.length - vigentes.length;
  return [
    `${vigentes.length} envío${vigentes.length === 1 ? "" : "s"}`,
    `${piezas.toLocaleString("es-MX", { maximumFractionDigits: 4 })} pzas`,
    ...(cancelados > 0 ? [`${cancelados} cancelado${cancelados === 1 ? "" : "s"}`] : []),
  ].join(" · ");
};

export const SHIPPING_EXPORT_COLUMNS: ListExportColumn<Shipment>[] = [
  { header: "Embarque", weight: 1.1, text: (r) => r.packing_folio ?? "" },
  {
    header: "Estado",
    weight: 0.8,
    // El mismo estado que la tabla: "Entregado" sale de `fecha_entrega` (#1361).
    text: (r) => {
      if (!r.estado) return "";
      const status = shipmentDisplayStatus(r);
      return SHIPMENT_STATUS_CONFIG[status]?.label ?? status;
    },
  },
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
