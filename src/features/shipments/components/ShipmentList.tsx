import { DataTable } from "@/src/components/DataTable";
import { shipmentColumns } from "./ShipmentColumns";
import { ShipmentItem } from "../interfaces/shipment.interface";

const SHIPMENTS_DATA: ShipmentItem[] = [
  {
    pedido: "PED-2401",
    fecha: "24 Feb 2026",
    cliente: "Grupo Comercial Alfa",
    factura: "FAC-2026-1201",
    importe: 25400,
    paqueteria: "DHL",
    guias: "DHL-45902011",
    vendedor: "Laura Pérez",
    piezas: 50,
    packingList: "PL-2401",
  },
  {
    pedido: "PED-2402",
    fecha: "24 Feb 2026",
    cliente: "Industrias del Bajío",
    factura: "FAC-2026-1202",
    importe: 12850.5,
    paqueteria: "FedEx",
    guias: "FDX-90122318",
    vendedor: "Carlos Rivas",
    piezas: 20,
    packingList: "PL-2402",
  },
  {
    pedido: "PED-2399",
    fecha: "23 Feb 2026",
    cliente: "Distribuciones Pacífico",
    factura: "FAC-2026-1198",
    importe: 8900,
    paqueteria: "Estafeta",
    guias: "EST-77230012",
    vendedor: "Diana Ortega",
    piezas: 100,
    packingList: "PL-2399",
  },
  {
    pedido: "PED-2387",
    fecha: "22 Feb 2026",
    cliente: "Servicios Nova",
    factura: "FAC-2026-1182",
    importe: 4500,
    paqueteria: "PaqueteExpress",
    guias: "PEX-55100987",
    vendedor: "Mario Silva",
    piezas: 12,
    packingList: "PL-2387",
  },
  {
    pedido: "PED-2405",
    fecha: "25 Feb 2026",
    cliente: "Tecnología Andina",
    factura: "FAC-2026-1205",
    importe: 156000,
    paqueteria: "DHL",
    guias: "DHL-77100823",
    vendedor: "Andrea Soto",
    piezas: 5,
    packingList: "PL-2405",
  },
];

export const ShipmentList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={shipmentColumns}
        data={SHIPMENTS_DATA}
        title="Embarques"
        searchPlaceholder="Buscar por pedido, cliente o factura..."
      />
    </div>
  );
};
