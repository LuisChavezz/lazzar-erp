"use client";

import { DataTable } from "@/src/components/DataTable";
import { purchaseOrderColumns } from "./PurchaseOrderColumns";
import { PurchaseOrderItem } from "../interfaces/purchase-order.interface";

const MOCK_PURCHASE_ORDERS: PurchaseOrderItem[] = [
  {
    id: "COMP-001",
    pedido: "OC-5601",
    proveedor: "Textiles del Sur",
    fecha: "18 Feb 2026",
    estatus: "En proceso",
    piezas: 500,
    total: 96400,
  },
  {
    id: "COMP-002",
    pedido: "OC-5602",
    proveedor: "Suministros Orion",
    fecha: "19 Feb 2026",
    estatus: "Pendiente",
    piezas: 220,
    total: 38850,
  },
  {
    id: "COMP-003",
    pedido: "OC-5595",
    proveedor: "Empaques Nova",
    fecha: "16 Feb 2026",
    estatus: "En revisión",
    piezas: 140,
    total: 15200,
  },
  {
    id: "COMP-004",
    pedido: "OC-5580",
    proveedor: "Hilaturas Sierra",
    fecha: "12 Feb 2026",
    estatus: "Completado",
    piezas: 300,
    total: 52500,
  },
  {
    id: "COMP-005",
    pedido: "OC-5610",
    proveedor: "Tinturas Prisma",
    fecha: "20 Feb 2026",
    estatus: "En proceso",
    piezas: 90,
    total: 11800,
  },
];

export default function PurchaseOrderList() {
  return (
    <DataTable
      columns={purchaseOrderColumns}
      data={MOCK_PURCHASE_ORDERS}
      title="Órdenes de Compra"
      searchPlaceholder="Buscar por orden o proveedor..."
    />
  );
}
