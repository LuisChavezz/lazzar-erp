import { DataTable } from "@/src/components/DataTable";
import { customerColumns } from "./CustomerColumns";
import { CustomerItem } from "../interfaces/customer.interface";

const CUSTOMERS_DATA: CustomerItem[] = [
  {
    id: "CUS-001",
    code: "CLI-1001",
    name: "Grupo Comercial Alfa",
    segment: "Retail",
    city: "Monterrey, NL",
    status: "Activo",
    lastOrder: "22 Feb 2026",
    totalSales: "$1,240,500",
  },
  {
    id: "CUS-002",
    code: "CLI-1024",
    name: "Industrias del Bajío",
    segment: "Industrial",
    city: "León, GTO",
    status: "En riesgo",
    lastOrder: "10 Feb 2026",
    totalSales: "$642,120",
  },
  {
    id: "CUS-003",
    code: "CLI-1088",
    name: "Distribuciones Pacífico",
    segment: "Mayoreo",
    city: "Tijuana, BC",
    status: "Prospecto",
    lastOrder: "18 Feb 2026",
    totalSales: "$124,800",
  },
  {
    id: "CUS-004",
    code: "CLI-1112",
    name: "Servicios Nova",
    segment: "Servicios",
    city: "CDMX",
    status: "Activo",
    lastOrder: "24 Feb 2026",
    totalSales: "$980,450",
  },
  {
    id: "CUS-005",
    code: "CLI-1166",
    name: "Tecnología Andina",
    segment: "Tecnología",
    city: "Querétaro, QRO",
    status: "Inactivo",
    lastOrder: "29 Ene 2026",
    totalSales: "$412,900",
  },
];

export const CustomerList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={customerColumns}
        data={CUSTOMERS_DATA}
        title="Clientes"
        searchPlaceholder="Buscar por cliente, segmento o ciudad..."
      />
    </div>
  );
};
