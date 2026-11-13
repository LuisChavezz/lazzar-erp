/**
 * Piezas de los PDF de las órdenes de trabajo —bordado, reflejante y corte de
 * manga— (EC-857): las prendas agrupadas por prenda + color, como la pantalla
 * (`WorkOrderGarmentGroups`), y la cobertura del pedido
 * (`WorkOrderCoverageSheet`). Agrupación, columnas opcionales y porcentaje
 * salen de `src/utils/workOrderGarments.ts`, el mismo módulo que usa la
 * pantalla.
 */
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { pluralForQuantity } from "@/src/utils/plural";
import { EMPTY_VALUE, textOrDash } from "@/src/utils/textOrDash";
import {
  groupWorkOrderGarments,
  workOrderCoveragePercent,
  workOrderGarmentOptionalColumns,
  workOrderQuantityOrDash,
  type WorkOrderGarmentLine,
} from "@/src/utils/workOrderGarments";
import { PdfLineItemsTable, type PdfColumn, type PdfInfoItem } from "./DocumentPdfLayout";

/** Renglón de la tabla de una prenda: el renglón del backend y su forma normalizada. */
export interface WorkOrderPdfGarmentRow<T> {
  item: T;
  line: WorkOrderGarmentLine;
}

/**
 * Una tabla por prenda + color, con el título que en la pantalla es el
 * encabezado de la tarjeta (prenda, color y piezas). Columnas: talla, SKU, las
 * propias del módulo (`extraColumns`), las piezas en esta orden y lo
 * programado, pedido y pendiente. Las cuatro opcionales siguen la regla de la
 * pantalla: aparecen si ALGÚN renglón de la orden trae el dato.
 *
 * Devuelve un arreglo de elementos (no un componente) para que el árbol del
 * documento quede plano.
 */
export function workOrderGarmentTables<T>({
  items,
  toLine,
  extraColumns = [],
}: {
  items: readonly T[];
  toLine: (item: T) => WorkOrderGarmentLine;
  extraColumns?: PdfColumn<WorkOrderPdfGarmentRow<T>>[];
}) {
  const groups = groupWorkOrderGarments(items, toLine);
  if (groups.length === 0) {
    return [
      <PdfLineItemsTable<WorkOrderPdfGarmentRow<T>>
        key="sin-prendas"
        title="PRENDAS DE LA ORDEN"
        rows={[]}
        columns={[{ id: "talla", header: "Talla", flex: 1, cell: () => EMPTY_VALUE }]}
        emptyMessage="Esta orden no tiene artículos registrados."
      />,
    ];
  }

  const show = workOrderGarmentOptionalColumns(groups.flatMap((group) => group.rows.map((row) => row.line)));
  const columns: PdfColumn<WorkOrderPdfGarmentRow<T>>[] = [
    { id: "talla", header: "Talla", flex: 0.9, bold: true, cell: ({ line }) => textOrDash(line.talla) },
    ...(show.sku
      ? [{ id: "sku", header: "SKU", flex: 1.4, cell: ({ line }: WorkOrderPdfGarmentRow<T>) => textOrDash(line.sku) }]
      : []),
    ...extraColumns,
    {
      id: "cantidad",
      header: "En esta orden",
      flex: 1.4,
      align: "right",
      bold: true,
      cell: ({ line }) => formatQuantityValue(line.cantidad),
    },
    ...(show.programado
      ? [
          {
            id: "programado",
            header: "Programado",
            flex: 1.1,
            align: "right" as const,
            cell: ({ line }: WorkOrderPdfGarmentRow<T>) => workOrderQuantityOrDash(line.programado),
          },
        ]
      : []),
    ...(show.pedido
      ? [
          {
            id: "pedido",
            header: "Pedido",
            flex: 1,
            align: "right" as const,
            cell: ({ line }: WorkOrderPdfGarmentRow<T>) => workOrderQuantityOrDash(line.pedido),
          },
        ]
      : []),
    ...(show.pendiente
      ? [
          {
            id: "pendiente",
            header: "Pendiente",
            flex: 1,
            align: "right" as const,
            cell: ({ line }: WorkOrderPdfGarmentRow<T>) => workOrderQuantityOrDash(line.pendiente),
          },
        ]
      : []),
  ];

  return groups.map((group) => (
    <PdfLineItemsTable
      key={group.key}
      title={`${group.producto} · ${group.color ?? "Sin color"} · ${formatQuantityValue(group.total)} ${pluralForQuantity(group.total, "pieza", "piezas")}`}
      rows={group.rows}
      columns={columns}
      emptyMessage="Sin tallas."
    />
  ));
}

/**
 * Renglones de la tarjeta "COBERTURA DEL PEDIDO": lo que programa esta orden
 * contra lo contratado, el porcentaje (mismo redondeo que la pantalla), si es
 * completa o parcial y las otras órdenes del mismo pedido.
 */
export function workOrderCoverageItems({
  cubierta,
  contratada,
  completa,
  otrasOrdenes,
  repartoAproximado,
}: {
  cubierta: number;
  contratada: number;
  completa: boolean;
  /** Folios de las otras órdenes del pedido, en el orden del backend. */
  otrasOrdenes: readonly (string | null)[];
  repartoAproximado?: boolean;
}): PdfInfoItem[] {
  const porcentaje = workOrderCoveragePercent(cubierta, contratada);
  return [
    { label: "Piezas en esta orden", value: formatQuantityValue(cubierta) },
    { label: "Piezas contratadas", value: formatQuantityValue(contratada) },
    { label: "Cobertura", value: porcentaje === null ? EMPTY_VALUE : `${porcentaje}%` },
    { label: "Estado", value: completa ? "Completa" : "Parcial" },
    {
      label: "Otras órdenes del pedido",
      value: otrasOrdenes.length > 0 ? otrasOrdenes.map((folio) => textOrDash(folio)).join(", ") : "Ninguna",
    },
    ...(repartoAproximado ? [{ label: "Reparto por talla", value: "Aproximado" }] : []),
  ];
}
