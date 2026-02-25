"use client";

import { DataTable } from "@/src/components/DataTable";
import { productionColumns } from "./ProductionColumns";
import { ProductionOrder } from "../interfaces/production.interface";

const MOCK_PRODUCTIONS: ProductionOrder[] = [
  {
    estatusOp: "En Proceso",
    pedido: "PED-2301",
    fechaIngreso: "12/02/2026",
    fechaEntrega: "20/02/2026",
    op: "OP-2024-001",
    fechaOp: "12/02/2026",
    modelo: "ERG-PRO",
    producto: "Rompevientos Orion Caballero",
    color: "Negro",
    categoria: "Rompevientos",
    cantidad: 50,
    centroConfeccion: "Planta Norte",
  },
  {
    estatusOp: "Planificado",
    pedido: "PED-2302",
    fechaIngreso: "13/02/2026",
    fechaEntrega: "25/02/2026",
    op: "OP-2024-002",
    fechaOp: "13/02/2026",
    modelo: "DESK-AJ",
    producto: "Pantalones Vaqueros Caballero",
    color: "Azul rey",
    categoria: "Pantalones",
    cantidad: 20,
    centroConfeccion: "Planta Centro",
  },
  {
    estatusOp: "Control Calidad",
    pedido: "PED-2303",
    fechaIngreso: "10/02/2026",
    fechaEntrega: "18/02/2026",
    op: "OP-2024-003",
    fechaOp: "10/02/2026",
    modelo: "GAB-MET",
    producto: "Pantalón Ejecutivo Dama",
    color: "Caqui",
    categoria: "Pantalones",
    cantidad: 100,
    centroConfeccion: "Planta Norte",
  },
  {
    estatusOp: "Terminado",
    pedido: "PED-2304",
    fechaIngreso: "08/02/2026",
    fechaEntrega: "16/02/2026",
    op: "OP-2024-004",
    fechaOp: "08/02/2026",
    modelo: "VIS-STD",
    producto: "Pantalón Ejecutivo Caballero",
    color: "Gris",
    categoria: "Pantalones",
    cantidad: 200,
    centroConfeccion: "Planta Sur",
  },
  {
    estatusOp: "En Proceso",
    pedido: "PED-2305",
    fechaIngreso: "11/02/2026",
    fechaEntrega: "26/02/2026",
    op: "OP-2024-005",
    fechaOp: "11/02/2026",
    modelo: "MES-JUN",
    producto: "Camisa Ejecutiva Caballero",
    color: "Blanco",
    categoria: "Camisas",
    cantidad: 5,
    centroConfeccion: "Planta Centro",
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
