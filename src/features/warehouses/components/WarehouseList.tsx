import { DataTable } from "../../../components/DataTable";
import { Warehouse } from "../interfaces/warehouse.interface";
import { columns } from "./WarehouseColumns";

const WAREHOUSES_DATA: Warehouse[] = [
  {
    id: "WH-001",
    name: "Almacén Central",
    location: "Ciudad de México, CDMX",
    manager: "Roberto Sánchez",
    capacity: "85%",
    status: "Activo",
    type: "Distribución",
  },
  {
    id: "WH-002",
    name: "Sucursal Norte",
    location: "Monterrey, NL",
    manager: "Alicia Torres",
    capacity: "45%",
    status: "Activo",
    type: "Regional",
  },
  {
    id: "WH-003",
    name: "Bodega Sur",
    location: "Mérida, YUC",
    manager: "Carlos Ruiz",
    capacity: "92%",
    status: "Mantenimiento",
    type: "Almacenaje",
  },
  {
    id: "WH-004",
    name: "Centro de Envíos",
    location: "Guadalajara, JAL",
    manager: "Diana López",
    capacity: "30%",
    status: "Activo",
    type: "Logística",
  },
  {
    id: "WH-005",
    name: "Depósito Este",
    location: "Veracruz, VER",
    manager: "Eduardo Meza",
    capacity: "10%",
    status: "Inactivo",
    type: "Respaldo",
  },
];

export default function WarehouseList() {
  return (
    <DataTable
      columns={columns}
      data={WAREHOUSES_DATA}
      title="Almacenes"
      searchPlaceholder="Buscar almacén..."
      actionButton={
        <button className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
          + Nuevo Almacén
        </button>
      }
    />
  );
}
