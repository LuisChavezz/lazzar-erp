"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  RegimenesFiscale,
  MetodosPago,
  FormasPago,
} from "../interfaces/sat-info.interface";
import { CheckCircleIcon } from "@/src/components/Icons";

// Helper para renderizar booleanos
const BooleanCell = ({ value }: { value: boolean }) => {
  return value ? (
    <div className="flex justify-center">
      <CheckCircleIcon className="w-5 h-5 text-green-500" />
    </div>
  ) : (
    <div className="flex justify-center">
      <span className="text-slate-300">-</span>
    </div>
  );
};

export const regimenesFiscalesColumns: ColumnDef<RegimenesFiscale>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => <span className="font-mono font-medium">{row.getValue("codigo")}</span>,
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => <span className="font-medium">{row.getValue("descripcion")}</span>,
  },
  {
    accessorKey: "aplica_fisica",
    header: "Aplica Física",
    cell: ({ row }) => <BooleanCell value={row.getValue("aplica_fisica")} />,
  },
  {
    accessorKey: "aplica_moral",
    header: "Aplica Moral",
    cell: ({ row }) => <BooleanCell value={row.getValue("aplica_moral")} />,
  },
];

export const usosCfdiColumns: ColumnDef<RegimenesFiscale>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => <span className="font-mono font-medium">{row.getValue("codigo")}</span>,
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => <span className="font-medium">{row.getValue("descripcion")}</span>,
  },
  {
    accessorKey: "aplica_fisica",
    header: "Aplica Física",
    cell: ({ row }) => <BooleanCell value={row.getValue("aplica_fisica")} />,
  },
  {
    accessorKey: "aplica_moral",
    header: "Aplica Moral",
    cell: ({ row }) => <BooleanCell value={row.getValue("aplica_moral")} />,
  },
];

export const metodosPagoColumns: ColumnDef<MetodosPago>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => <span className="font-mono font-medium">{row.getValue("codigo")}</span>,
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => <span className="font-medium">{row.getValue("descripcion")}</span>,
  },
];

export const formasPagoColumns: ColumnDef<FormasPago>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => <span className="font-mono font-medium">{row.getValue("codigo")}</span>,
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => <span className="font-medium">{row.getValue("descripcion")}</span>,
  },
  {
    accessorKey: "bancarizado",
    header: "Bancarizado",
    cell: ({ row }) => <BooleanCell value={row.getValue("bancarizado")} />,
  },
];
