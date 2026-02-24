export interface ShipmentTrackingItem {
  id: string;
  trackingId: string;
  carrier: string;
  origin: string;
  destination: string;
  eta: string;
  status: "En tránsito" | "Entregado" | "Incidencia" | "Atrasado";
  lastUpdate: string;
}
