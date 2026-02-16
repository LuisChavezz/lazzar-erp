"use client";

import { DataTable } from "@/src/components/DataTable";
import { productionColumns } from "./ProductionColumns";
import { ProductionOrder } from "../interfaces/production.interface";

const MOCK_PRODUCTIONS: ProductionOrder[] = [
  {
    id: "OP-2024-001",
    product: "Silla Ergonómica Pro",
    quantity: 50,
    startDate: "12/02/2026",
    status: "En Producción",
    progress: 65,
  },
  {
    id: "OP-2024-002",
    product: "Escritorio Ajustable",
    quantity: 20,
    startDate: "13/02/2026",
    status: "Planificado",
    progress: 0,
  },
  {
    id: "OP-2024-003",
    product: "Gabinete Metálico",
    quantity: 100,
    startDate: "10/02/2026",
    status: "Control Calidad",
    progress: 90,
  },
  {
    id: "OP-2024-004",
    product: "Silla Visitante",
    quantity: 200,
    startDate: "08/02/2026",
    status: "Terminado",
    progress: 100,
  },
  {
    id: "OP-2024-005",
    product: "Mesa de Juntas",
    quantity: 5,
    startDate: "11/02/2026",
    status: "En Producción",
    progress: 30,
  },
];

export const ProductionList = () => {
  return (
    <DataTable
      columns={productionColumns}
      data={MOCK_PRODUCTIONS}
      title="Producción"
      searchPlaceholder="Buscar orden de producción..."
    />
  );
};
