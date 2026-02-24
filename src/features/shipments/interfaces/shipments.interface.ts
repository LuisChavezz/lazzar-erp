export interface ShipmentItem {
  id: string;
  shipmentId: string;
  orderNumber: string;
  carrier: string;
  origin: string;
  destination: string;
  eta: string;
  status: "Programado" | "En tránsito" | "Entregado" | "Incidencia";
  lastUpdate: string;
}
