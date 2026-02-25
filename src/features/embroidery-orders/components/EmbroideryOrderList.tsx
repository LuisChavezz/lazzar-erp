"use client";

import { DataTable } from "@/src/components/DataTable";
import { embroideryOrderColumns } from "./EmbroideryOrderColumns";
import { EmbroideryOrderItem } from "../interfaces/embroidery-order.interface";

const MOCK_EMBROIDERY_ORDERS: EmbroideryOrderItem[] = [
  {
    id: "EMB-001",
    pedido: "PED-3101",
    cliente: "Textiles Andina",
    fecha: "18 Feb 2026",
    estatus: "En proceso",
    piezas: 120,
    total: 18500,
  },
  {
    id: "EMB-002",
    pedido: "PED-3102",
    cliente: "Uniformes Atlas",
    fecha: "19 Feb 2026",
    estatus: "Pendiente",
    piezas: 80,
    total: 9200,
  },
  {
    id: "EMB-003",
    pedido: "PED-3095",
    cliente: "Grupo Boreal",
    fecha: "16 Feb 2026",
    estatus: "En revisión",
    piezas: 55,
    total: 6100,
  },
  {
    id: "EMB-004",
    pedido: "PED-3090",
    cliente: "Corporativo Solaris",
    fecha: "14 Feb 2026",
    estatus: "Completado",
    piezas: 200,
    total: 32400,
  },
  {
    id: "EMB-005",
    pedido: "PED-3105",
    cliente: "Industrias Prisma",
    fecha: "20 Feb 2026",
    estatus: "En proceso",
    piezas: 150,
    total: 24800,
  },
];

export default function EmbroideryOrderList() {
  return (
    <DataTable
      columns={embroideryOrderColumns}
      data={MOCK_EMBROIDERY_ORDERS}
      title="Órdenes de Bordado"
      searchPlaceholder="Buscar por pedido o cliente..."
    />
  );
}
