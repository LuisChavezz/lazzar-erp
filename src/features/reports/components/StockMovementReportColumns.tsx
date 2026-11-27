"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { StockMovementReportRow } from "@/src/features/stock/interfaces/stock-movement-report.interface";
// Estilos del módulo de movimientos con las etiquetas del reporte (que llama
// `TRANSFERENCIA` a lo que allá es `TRASPASO`).
import { STOCK_MOVEMENT_REPORT_TYPE_CONFIG } from "@/src/features/stock/constants/stockMovementReportTypes";
import { formatMoneyValue, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { movementOriginLabel } from "../constants/movementOrigin";
import {
  MOVEMENT_REPORT_VISTA_COLUMNS,
  categoriaInventarioLabel,
  type MovementReportVista,
} from "../constants/movementReportViews";

// Marcador para valores de texto vacíos, con el mismo estilo que el resto de
// tablas del proyecto (StockColumns / StockReportColumns).
const Dash = () => <span className="text-xs text-slate-400 dark:text-slate-600">—</span>;

/** Línea secundaria de una celda (origen, nivel del saldo, tipo de tercero). */
const MUTED = "text-[10px] font-medium text-slate-500 dark:text-slate-400";

/** Folio del documento de origen: el que resuelve el backend, o el que se pueda armar. */
const movementReference = (r: StockMovementReportRow): string | null =>
  r.origen_folio ||
  r.pedido_folio ||
  r.recepcion_folio ||
  r.op_folio ||
  r.transferencia_folio ||
  (r.recepcion_id ? `Recepción #${r.recepcion_id}` : null) ||
  (r.ajuste_inventario_id ? `Ajuste #${r.ajuste_inventario_id}` : null) ||
  (r.op_id ? `OP #${r.op_id}` : null);

/** Folios ligados además del principal: el pedido detrás de un surtido, su TR… */
const relatedFolios = (r: StockMovementReportRow, principal: string | null): string[] =>
  [r.pedido_folio, r.transferencia_folio, r.recepcion_folio, r.op_folio].filter(
    (f, i, all): f is string => !!f && f !== principal && all.indexOf(f) === i,
  );

/** Motivo del ajuste, observaciones y comentarios, sin repetir el mismo texto. */
const notasDe = (r: StockMovementReportRow): string[] =>
  [r.motivo_ajuste, r.observaciones, r.comentarios].filter(
    (t, i, all): t is string => !!t?.trim() && all.indexOf(t) === i,
  );

/** Dos lugares "de → a"; uno solo cuando coinciden o falta uno. */
const fromTo = (a: string | null | undefined, b: string | null | undefined) => {
  if (a && b && a !== b) return { a, b };
  const uno = a || b;
  return uno ? { a: uno, b: null } : null;
};

/** "a" arriba y "→ b" abajo, como se lee un traslado. */
function FromTo({ a, b, className }: { a: string; b: string | null; className: string }) {
  return (
    <div className={`flex min-w-0 flex-col leading-snug ${className}`} title={b ? `De ${a} a ${b}` : a}>
      <span className="truncate">{a}</span>
      {b && (
        <span className="truncate">
          <span className="text-blue-700 dark:text-blue-400" aria-hidden="true">
            →{" "}
          </span>
          <span className="sr-only">a </span>
          {b}
        </span>
      )}
    </div>
  );
}

// ── Columnas de la tabla del reporte de movimientos ──────────────────────────

const stockMovementReportColumns: ColumnDef<StockMovementReportRow>[] = [
  {
    accessorKey: "fecha_movimiento",
    header: "Fecha",
    meta: { label: "Fecha" },
    cell: ({ row }) => {
      const raw = row.original.fecha_movimiento;
      if (!raw) return <Dash />;
      return (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {formatShortDate(raw)}
          </span>
          <span className={MUTED}>{formatShortTime(raw)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "tipo_movimiento",
    header: "Tipo",
    meta: { label: "Tipo Movimiento" },
    cell: ({ row }) => {
      const tipo = row.original.tipo_movimiento;
      const cfg = STOCK_MOVEMENT_REPORT_TYPE_CONFIG[tipo] ?? {
        label: tipo,
        dot: "bg-slate-400",
        badgeClass:
          "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800/50",
        textClass: "text-slate-600 dark:text-slate-400",
      };
      return (
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <span
            className={`whitespace-nowrap text-[11px] font-semibold px-2 py-1 rounded-full border leading-none ${cfg.badgeClass}`}
          >
            {cfg.label}
          </span>
        </div>
      );
    },
  },
  {
    // Documento que originó el movimiento: el folio que el usuario reconoce, de
    // qué tipo es y, debajo, los folios ligados (el pedido de un surtido, su TR).
    id: "referencia",
    accessorFn: (row) => movementReference(row) ?? "",
    header: "Referencia",
    meta: { label: "Referencia" },
    cell: ({ row }) => {
      const ref = movementReference(row.original);
      const origen = movementOriginLabel(row.original.origen_tipo);
      const ligados = relatedFolios(row.original, ref);
      if (!ref && !origen) return <Dash />;
      return (
        <div className="flex flex-col leading-tight">
          <span className="whitespace-nowrap font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
            {ref ?? "—"}
          </span>
          {origen && <span className={MUTED}>{origen}</span>}
          {ligados.length > 0 && (
            <span className="whitespace-nowrap font-mono text-[10px] text-slate-500 dark:text-slate-400">
              {ligados.join(" · ")}
            </span>
          )}
        </div>
      );
    },
  },
  {
    // `producto_nombre` cae al nombre base cuando el renglón no trae variante.
    // Debajo: SKU completo y color/talla, lo que almacén usa para ubicar la prenda.
    id: "producto_nombre",
    accessorFn: (row) => row.producto_nombre || row.producto_base_nombre || "",
    header: "Producto",
    size: 280,
    meta: { label: "Producto" },
    cell: ({ row }) => {
      const r = row.original;
      const nombre = r.producto_nombre || r.producto_base_nombre;
      const variante = [r.color, r.talla].filter(Boolean).join(" · ");
      if (!nombre && !r.sku) return <Dash />;
      return (
        <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
            {nombre || "—"}
          </span>
          <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {r.sku && (
              <Link
                href={`/system/reports/auxiliar?q=${encodeURIComponent(r.sku)}`}
                title="Ver auxiliar del SKU"
                className="cursor-pointer font-mono hover:text-sky-600 hover:underline dark:hover:text-sky-400"
              >
                {r.sku}
              </Link>
            )}
            {r.sku && variante && " · "}
            {variante}
          </span>
        </div>
      );
    },
  },
  {
    id: "categoria",
    accessorFn: (row) => categoriaInventarioLabel(row.categoria_inventario) ?? "",
    header: "Categoría",
    meta: { label: "Categoría" },
    cell: ({ row }) => {
      const c = categoriaInventarioLabel(row.original.categoria_inventario);
      return c ? (
        <span className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">{c}</span>
      ) : (
        <Dash />
      );
    },
  },
  {
    accessorKey: "almacen_nombre",
    header: "Almacén",
    size: 210,
    meta: { label: "Almacén" },
    // Transferencia: origen → destino. Los demás tipos, su almacén.
    cell: ({ row }) => {
      const r = row.original;
      const lugar =
        fromTo(r.almacen_origen_nombre, r.almacen_destino_nombre) ??
        (r.almacen_nombre ? { a: r.almacen_nombre, b: null } : null);
      if (!lugar) return <Dash />;
      return (
        <FromTo
          a={lugar.a}
          b={lugar.b}
          className={`text-slate-600 dark:text-slate-300 ${lugar.b ? "text-xs" : "text-sm"}`}
        />
      );
    },
  },
  {
    // De qué ubicación salió y a cuál llegó; una sola cuando coinciden o falta
    // una. `accessorFn` colapsa `null` a `""` (ver `CorteMangaOrderColumns.tsx`).
    id: "ubicacion_nombre",
    accessorFn: (row) =>
      row.ubicacion_origen_nombre || row.ubicacion_destino_nombre || row.ubicacion_nombre || "",
    header: "Ubicación",
    size: 190,
    meta: { label: "Ubicación" },
    cell: ({ row }) => {
      const r = row.original;
      const u =
        fromTo(r.ubicacion_origen_nombre, r.ubicacion_destino_nombre) ??
        (r.ubicacion_nombre ? { a: r.ubicacion_nombre, b: null } : null);
      if (!u) return <Dash />;
      return <FromTo a={u.a} b={u.b} className="font-mono text-[11px] text-slate-600 dark:text-slate-300" />;
    },
  },
  {
    accessorKey: "cantidad",
    header: "Cantidad",
    meta: { align: "right", label: "Cantidad" },
    // Con signo cuando el backend lo manda: + entra (verde), − sale (rojo).
    cell: ({ row }) => {
      const signed = row.original.cantidad_signed;
      if (signed === undefined) {
        return (
          <div className="tabular-nums text-slate-700 dark:text-slate-200">
            {formatQuantityValue(row.original.cantidad)}
          </div>
        );
      }
      const n = Number(signed) || 0;
      // Transferencia sin filtro de almacén: el backend la manda en 0 porque no
      // cambia el total. Se muestran las piezas movidas, sin signo y en el azul
      // de su tipo. Con un almacén filtrado trae su signo y cae al caso común.
      if (row.original.tipo_movimiento === "TRANSFERENCIA" && n === 0) {
        return (
          <div
            className="font-semibold tabular-nums text-blue-700 dark:text-blue-400"
            title="Transferencia entre almacenes: no cambia el inventario total"
          >
            {formatQuantityValue(row.original.cantidad)}
          </div>
        );
      }
      return (
        <div
          className={`font-semibold tabular-nums ${
            n > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : n < 0
                ? "text-red-600 dark:text-red-400"
                : "text-slate-700 dark:text-slate-200"
          }`}
        >
          {n > 0 ? "+" : n < 0 ? "−" : ""}
          {formatQuantityValue(Math.abs(n))}
        </div>
      );
    },
  },
  {
    // Existencia del SKU antes → después de este renglón, en la ubicación o en
    // el almacén según `saldo_nivel`. En rojo cuando quedó negativa.
    id: "saldo",
    accessorFn: (row) => row.saldo_despues ?? "",
    header: "Saldo",
    meta: { align: "right", label: "Saldo antes → después" },
    cell: ({ row }) => {
      const r = row.original;
      if (r.saldo_despues == null) return <Dash />;
      const negativo = r.saldo_negativo === true;
      return (
        <div className="flex flex-col items-end leading-tight">
          <span className="whitespace-nowrap tabular-nums">
            {r.saldo_antes != null && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatQuantityValue(r.saldo_antes)} →{" "}
              </span>
            )}
            <span
              className={`font-bold ${
                negativo ? "text-red-700 dark:text-red-400" : "text-slate-800 dark:text-slate-100"
              }`}
            >
              {formatQuantityValue(r.saldo_despues)}
            </span>
          </span>
          <span
            className={negativo ? "text-[10px] font-semibold text-red-700 dark:text-red-400" : MUTED}
          >
            {negativo
              ? "Quedó en negativo"
              : r.saldo_nivel === "UBICACION"
                ? "en la ubicación"
                : "en el almacén"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "costo_unitario",
    header: "Costo Unit.",
    meta: { align: "right", label: "Costo Unitario" },
    cell: ({ row }) => (
      <div className="tabular-nums text-slate-600 dark:text-slate-300">
        {formatMoneyValue(row.original.costo_unitario, null)}
      </div>
    ),
  },
  {
    accessorKey: "costo_total",
    header: "Costo Total",
    meta: { align: "right", label: "Costo Total" },
    cell: ({ row }) => (
      <div className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
        {formatMoneyValue(row.original.costo_total, null)}
      </div>
    ),
  },
  {
    // Valor del inventario del SKU antes → después del renglón.
    id: "valor",
    accessorFn: (row) => row.valor_despues ?? "",
    header: "Valor",
    meta: { align: "right", label: "Valor antes → después" },
    cell: ({ row }) => {
      const r = row.original;
      if (r.valor_despues == null) return <Dash />;
      return (
        <div className="whitespace-nowrap tabular-nums">
          {r.valor_antes != null && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatMoneyValue(r.valor_antes, null)} →{" "}
            </span>
          )}
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {formatMoneyValue(r.valor_despues, null)}
          </span>
        </div>
      );
    },
  },
  {
    // Cliente en salidas, proveedor en entradas.
    id: "tercero",
    accessorFn: (row) => row.cliente_nombre || row.proveedor_nombre || "",
    header: "Cliente / Proveedor",
    size: 200,
    meta: { label: "Cliente / Proveedor" },
    cell: ({ row }) => {
      const r = row.original;
      const nombre = r.cliente_nombre || r.proveedor_nombre;
      if (!nombre) return <Dash />;
      return (
        <div className="flex min-w-0 flex-col leading-tight" title={nombre}>
          <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{nombre}</span>
          <span className={MUTED}>{r.cliente_nombre ? "Cliente" : "Proveedor"}</span>
        </div>
      );
    },
  },
  {
    id: "factura",
    accessorFn: (row) => row.factura_folio ?? "",
    header: "Factura",
    meta: { label: "Factura" },
    cell: ({ row }) => {
      const r = row.original;
      if (!r.factura_folio) return <Dash />;
      return (
        <div
          className="flex flex-col leading-tight"
          title={r.factura_uuid ? `UUID ${r.factura_uuid}` : undefined}
        >
          <span className="whitespace-nowrap font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
            {r.factura_folio}
          </span>
          <span className={MUTED}>{r.factura_tipo === "CLIENTE" ? "De cliente" : "De proveedor"}</span>
        </div>
      );
    },
  },
  {
    id: "poliza",
    accessorFn: (row) => row.poliza_folio ?? "",
    header: "Póliza",
    meta: { label: "Póliza" },
    cell: ({ row }) =>
      row.original.poliza_folio ? (
        <span className="whitespace-nowrap font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
          {row.original.poliza_folio}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    accessorKey: "usuario_nombre",
    header: "Usuario",
    meta: { label: "Usuario" },
    cell: ({ row }) =>
      row.original.usuario_nombre ? (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {row.original.usuario_nombre}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    // Por qué se movió: motivo del ajuste, observaciones y comentarios.
    id: "notas",
    accessorFn: (row) => notasDe(row).join(" · "),
    header: "Notas",
    meta: { label: "Notas", hideOnMobile: true },
    cell: ({ row }) => {
      const nota = notasDe(row.original).join(" · ");
      return nota ? (
        <span title={nota} className="block max-w-56 truncate text-xs text-slate-500 dark:text-slate-400">
          {nota}
        </span>
      ) : (
        <Dash />
      );
    },
  },
];

/**
 * Columnas del reporte con la visibilidad inicial de la vista elegida. La
 * tabla toma la visibilidad al montarse, así que quien la usa la remonta
 * (`key`) al cambiar de vista.
 */
export const getStockMovementReportColumns = (
  vista: MovementReportVista,
): ColumnDef<StockMovementReportRow>[] => {
  const visibles = MOVEMENT_REPORT_VISTA_COLUMNS[vista];
  return stockMovementReportColumns.map((col) => {
    const id = col.id ?? ("accessorKey" in col ? String(col.accessorKey) : "");
    return { ...col, meta: { ...col.meta, hiddenByDefault: !visibles.includes(id) } };
  });
};
