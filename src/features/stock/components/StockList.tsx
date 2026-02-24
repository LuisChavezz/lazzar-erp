import { DataTable } from "@/src/components/DataTable";
import { stockColumns } from "./StockColumns";
import { StockItem } from "../stock.interface";

const STOCK_DATA: StockItem[] = [
  {
    id: "STK-001",
    sku: "SKU-4201",
    product: "Motor Eléctrico 5HP",
    warehouse: "Almacén Central",
    available: 120,
    reserved: 18,
    incoming: 40,
    status: "Saludable",
    lastMovement: "12 Feb 2026",
  },
  {
    id: "STK-002",
    sku: "SKU-1884",
    product: "Banda Transportadora 3m",
    warehouse: "Cedis Norte",
    available: 28,
    reserved: 16,
    incoming: 0,
    status: "Riesgo",
    lastMovement: "10 Feb 2026",
  },
  {
    id: "STK-003",
    sku: "SKU-9044",
    product: "Caja Cartón Reforzada",
    warehouse: "Almacén Empaque",
    available: 6400,
    reserved: 320,
    incoming: 900,
    status: "Sobrestock",
    lastMovement: "11 Feb 2026",
  },
  {
    id: "STK-004",
    sku: "SKU-3320",
    product: "Sensor de Proximidad",
    warehouse: "Almacén Electrónica",
    available: 6,
    reserved: 12,
    incoming: 20,
    status: "Crítico",
    lastMovement: "09 Feb 2026",
  },
  {
    id: "STK-005",
    sku: "SKU-6102",
    product: "Aceite Industrial 20L",
    warehouse: "Almacén Químicos",
    available: 84,
    reserved: 22,
    incoming: 60,
    status: "Saludable",
    lastMovement: "13 Feb 2026",
  },
];

export const StockList = () => {
  return (
    <div className="mt-12">
      <DataTable
        columns={stockColumns}
        data={STOCK_DATA}
        title="Existencias"
        searchPlaceholder="Buscar por SKU, producto o almacén..."
      />
    </div>
  );
};
