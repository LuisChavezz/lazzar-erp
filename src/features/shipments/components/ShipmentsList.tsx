import { DataTable } from "@/src/components/DataTable";
import { shipmentsColumns } from "./ShipmentsColumns";
import { ShipmentItem } from "../interfaces/shipments.interface";

const SHIPMENTS_DATA: ShipmentItem[] = [
  {
    id: "SHP-001",
    shipmentId: "EMB-24021",
    orderNumber: "OV-9012",
    carrier: "Logística Norte",
    origin: "Monterrey, NL",
    destination: "Guadalajara, JAL",
    eta: "26 Feb 2026",
    status: "En tránsito",
    lastUpdate: "24 Feb 2026",
  },
  {
    id: "SHP-002",
    shipmentId: "EMB-24022",
    orderNumber: "OV-9015",
    carrier: "Transporte Delta",
    origin: "CDMX",
    destination: "Querétaro, QRO",
    eta: "27 Feb 2026",
    status: "Programado",
    lastUpdate: "24 Feb 2026",
  },
  {
    id: "SHP-003",
    shipmentId: "EMB-24023",
    orderNumber: "OV-9021",
    carrier: "Expresos del Bajío",
    origin: "León, GTO",
    destination: "Tijuana, BC",
    eta: "28 Feb 2026",
    status: "Incidencia",
    lastUpdate: "23 Feb 2026",
  },
  {
    id: "SHP-004",
    shipmentId: "EMB-24024",
    orderNumber: "OV-9030",
    carrier: "Carga Sureste",
    origin: "Mérida, YUC",
    destination: "Puebla, PUE",
    eta: "25 Feb 2026",
    status: "Entregado",
    lastUpdate: "24 Feb 2026",
  },
  {
    id: "SHP-005",
    shipmentId: "EMB-24025",
    orderNumber: "OV-9038",
    carrier: "Rápidos del Pacífico",
    origin: "Culiacán, SIN",
    destination: "Hermosillo, SON",
    eta: "26 Feb 2026",
    status: "En tránsito",
    lastUpdate: "24 Feb 2026",
  },
];

export const ShipmentsList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={shipmentsColumns}
        data={SHIPMENTS_DATA}
        title="Embarques"
        searchPlaceholder="Buscar por embarque, orden o ruta..."
      />
    </div>
  );
};
