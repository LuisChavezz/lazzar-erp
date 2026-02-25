"use client";

import { DataTable } from "@/src/components/DataTable";
import { productionOrderColumns } from "./ProductionOrderColumns";
import { ProductionOrderItem } from "../interfaces/production-order.interface";

const MOCK_PRODUCTION_ORDERS: ProductionOrderItem[] = [
  {
    id: "PROD-001",
    pedido: "PED-3201",
    cliente: "Moda Integral",
    fecha: "17 Feb 2026",
    estatus: "En proceso",
    piezas: 320,
    total: 58200,
  },
  {
    id: "PROD-002",
    pedido: "PED-3202",
    cliente: "Industria Nimbus",
    fecha: "18 Feb 2026",
    estatus: "Pendiente",
    piezas: 150,
    total: 27650,
  },
  {
    id: "PROD-003",
    pedido: "PED-3198",
    cliente: "Distribuidora Lumen",
    fecha: "15 Feb 2026",
    estatus: "En revisión",
    piezas: 210,
    total: 38900,
  },
  {
    id: "PROD-004",
    pedido: "PED-3190",
    cliente: "Corporativo Zenith",
    fecha: "13 Feb 2026",
    estatus: "Completado",
    piezas: 400,
    total: 74500,
  },
  {
    id: "PROD-005",
    pedido: "PED-3207",
    cliente: "Telas del Norte",
    fecha: "20 Feb 2026",
    estatus: "En proceso",
    piezas: 95,
    total: 18400,
  },
];

export default function ProductionOrderList() {
  return (
    <DataTable
      columns={productionOrderColumns}
      data={MOCK_PRODUCTION_ORDERS}
      title="Órdenes de Producción"
      searchPlaceholder="Buscar por pedido o cliente..."
    />
  );
}
