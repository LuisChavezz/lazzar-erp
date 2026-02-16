"use client";

import { DataTable } from "@/src/components/DataTable";
import { inventoryColumns } from "./InventoryColumns";
import { InventoryItem } from "../interfaces/inventory.interface";

const MOCK_INVENTORY: InventoryItem[] = [
  {
    sku: "SKU-1001",
    name: "Tornillo Acero Inoxidable 2\"",
    category: "Insumos",
    stock: 5000,
    unit: "Pzas",
    status: "Optimal",
    minStock: 1000,
  },
  {
    sku: "SKU-2045",
    name: "Tela Mesh Negra",
    category: "Materia Prima",
    stock: 120,
    unit: "Mts",
    status: "Low",
    minStock: 150,
  },
  {
    sku: "SKU-3012",
    name: "Silla Ergonómica Pro",
    category: "Producto Terminado",
    stock: 45,
    unit: "Pzas",
    status: "Optimal",
    minStock: 10,
  },
  {
    sku: "SKU-1050",
    name: "Caja Cartón Grande",
    category: "Empaque",
    stock: 0,
    unit: "Pzas",
    status: "Out",
    minStock: 50,
  },
  {
    sku: "SKU-4001",
    name: "Pintura Epóxica Negra",
    category: "Insumos",
    stock: 25,
    unit: "Lts",
    status: "Warning",
    minStock: 30,
  },
];

export const InventoryList = () => {
  return (
    <DataTable
      columns={inventoryColumns}
      data={MOCK_INVENTORY}
      title="Inventario"
      searchPlaceholder="Buscar por SKU, producto..."
    />
  );
};
