import { DataTable } from "@/src/components/DataTable";
import { shipmentTrackingColumns } from "./ShipmentTrackingColumns";
import { ShipmentTrackingItem } from "../interfaces/shipment-tracking.interface";

const SHIPMENT_DATA: ShipmentTrackingItem[] = [
  {
    id: "TRK-001",
    trackingId: "MX-783901",
    carrier: "Logística Norte",
    origin: "Monterrey, NL",
    destination: "Guadalajara, JAL",
    eta: "26 Feb 2026",
    status: "En tránsito",
    lastUpdate: "24 Feb 2026",
  },
  {
    id: "TRK-002",
    trackingId: "MX-783944",
    carrier: "Transporte Delta",
    origin: "CDMX",
    destination: "Querétaro, QRO",
    eta: "25 Feb 2026",
    status: "Entregado",
    lastUpdate: "24 Feb 2026",
  },
  {
    id: "TRK-003",
    trackingId: "MX-784120",
    carrier: "Expresos del Bajío",
    origin: "León, GTO",
    destination: "Tijuana, BC",
    eta: "28 Feb 2026",
    status: "Atrasado",
    lastUpdate: "23 Feb 2026",
  },
  {
    id: "TRK-004",
    trackingId: "MX-784221",
    carrier: "Carga Sureste",
    origin: "Mérida, YUC",
    destination: "Puebla, PUE",
    eta: "27 Feb 2026",
    status: "Incidencia",
    lastUpdate: "24 Feb 2026",
  },
  {
    id: "TRK-005",
    trackingId: "MX-784330",
    carrier: "Rápidos del Pacífico",
    origin: "Culiacán, SIN",
    destination: "Hermosillo, SON",
    eta: "26 Feb 2026",
    status: "En tránsito",
    lastUpdate: "24 Feb 2026",
  },
];

export const ShipmentTrackingList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={shipmentTrackingColumns}
        data={SHIPMENT_DATA}
        title="Rastreo de Guías"
        searchPlaceholder="Buscar por guía, transportista o ruta..."
      />
    </div>
  );
};
