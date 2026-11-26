"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import {
  CategoryHeaderFilter,
  ColorHeaderFilter,
  SizeHeaderFilter,
} from "@/src/features/products/components/CatalogHeaderFilters";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import type { StockDigitalFila } from "../interfaces/digital-stock.interface";
import {
  EXISTENCIA_ALM00_LABEL,
  existenciaAlm00Hint,
  type DigitalStockModule,
} from "../constants/digitalStockTable";
import { useDigitalStockRowActionsContext } from "../hooks/useDigitalStockRowActions";
import { DigitalStockQuantity } from "./DigitalStockQuantity";

/** SKU: abre el detalle (el diálogo vive en la lista y llega por contexto). */
const SkuCell = ({ fila }: { fila: StockDigitalFila }) => {
  const { onViewDetail } = useDigitalStockRowActionsContext();
  return (
    <button
      type="button"
      onClick={() => onViewDetail(fila)}
      title="Ver detalle"
      className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer text-left"
    >
      {fila.sku}
    </button>
  );
};

type QuantityKey =
  | "existencia_real"
  | "comprometido"
  | "en_produccion"
  | "en_compra"
  | "disponible_hoy"
  | "disponible_digital";

const quantityColumn = (
  key: QuantityKey,
  label: string,
  options: { title?: string; shortageWhenNegative?: boolean; hideOnMobile?: boolean } = {},
): ColumnDef<StockDigitalFila> => ({
  id: key,
  accessorKey: key,
  meta: { align: "right", label, hideOnMobile: options.hideOnMobile },
  header: () => (
    <span title={options.title} className={options.title ? "cursor-help" : undefined}>
      {label}
    </span>
  ),
  cell: ({ row }) => (
    <DigitalStockQuantity
      value={row.original[key]}
      shortageWhenNegative={options.shortageWhenNegative}
    />
  ),
});

/**
 * Columnas del stock digital del módulo que monta la pantalla (`module` decide
 * la explicación de la existencia ALM-00). El detalle llega a la celda del SKU
 * por contexto, no por aquí. Sin orden (`meta.serverSort`): el endpoint ordena
 * siempre por SKU. Categoría, color y talla filtran en el servidor
 * (`meta.serverFilter`) con opciones de sus catálogos, nunca de las filas.
 */
export const getDigitalStockColumns = ({
  module,
}: {
  module: DigitalStockModule;
}): ColumnDef<StockDigitalFila>[] => [
  {
    id: "sku",
    accessorKey: "sku",
    header: "SKU",
    meta: { label: "SKU" },
    cell: ({ row }) => <SkuCell fila={row.original} />,
  },
  {
    id: "producto",
    accessorKey: "producto_nombre",
    header: "Producto",
    meta: { label: "Producto" },
    cell: ({ row }) => (
      <span
        className="block max-w-64 truncate text-slate-700 dark:text-slate-200"
        title={row.original.producto_nombre}
      >
        {textOrDash(row.original.producto_nombre)}
      </span>
    ),
  },
  {
    id: "categoria",
    accessorFn: (row) => row.categoria_nombre ?? "",
    header: ({ column }) => <CategoryHeaderFilter column={column} title="Categoría" />,
    meta: { label: "Categoría", serverFilter: "categoria", hideOnMobile: true },
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {textOrDash(row.original.categoria_nombre)}
      </span>
    ),
  },
  {
    id: "color",
    accessorKey: "color",
    header: ({ column }) => <ColorHeaderFilter column={column} title="Color" />,
    meta: { label: "Color", serverFilter: "color" },
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">{textOrDash(row.original.color)}</span>
    ),
  },
  {
    id: "talla",
    accessorFn: (row) => row.talla ?? "",
    header: ({ column }) => <SizeHeaderFilter column={column} title="Talla" />,
    meta: { label: "Talla", serverFilter: "talla" },
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">{textOrDash(row.original.talla)}</span>
    ),
  },
  quantityColumn("existencia_real", EXISTENCIA_ALM00_LABEL, { title: existenciaAlm00Hint(module) }),
  quantityColumn("comprometido", "Comprometido", {
    title: "Pedidos autorizados o en proceso: lo pedido menos lo ya surtido por picking.",
  }),
  quantityColumn("en_produccion", "En producción", {
    title: "OP abiertas: cantidad menos lo recibido.",
    hideOnMobile: true,
  }),
  quantityColumn("en_compra", "En compra", {
    title: "OC autorizadas o parcialmente recibidas: cantidad menos lo recibido.",
    hideOnMobile: true,
  }),
  quantityColumn("disponible_hoy", "Disponible hoy", {
    title: "Existencia ALM-00 menos lo comprometido.",
  }),
  quantityColumn("disponible_digital", "Disponible digital", {
    title:
      "Existencia ALM-00 + en producción + en compra − comprometido. En rojo: faltante (lo comprometido no alcanza ni con lo que viene).",
    shortageWhenNegative: true,
  }),
  {
    id: "proxima_entrada",
    accessorKey: "proxima_entrada",
    header: "Próxima entrada",
    meta: { label: "Próxima entrada", hideOnMobile: true },
    cell: ({ row }) => {
      const fecha = row.original.proxima_entrada;
      return fecha ? (
        <span className="whitespace-nowrap text-slate-700 dark:text-slate-200">
          {formatShortCalendarDate(fecha)}
        </span>
      ) : (
        <span className="whitespace-nowrap text-slate-400 dark:text-slate-500">Sin fecha</span>
      );
    },
  },
];
