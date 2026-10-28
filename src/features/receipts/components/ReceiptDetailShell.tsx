"use client";

import type { ReceiptDetail, ReceiptDetailLine } from "../interfaces/receipt.interface";
import { StatusBadge } from "@/src/components/StatusBadge";
import { RECEIPT_STATUS_CONFIG } from "../constants/receiptStatus";

// ── Shell presentacional compartido del detalle de recepción ──────────────────
// Recibe un `ReceiptDetail` YA CARGADO (no hace fetch — eso vive en el diálogo
// de cada consumidor) y renderiza la estructura común: rejilla de encabezado +
// tabla de líneas de detalle. Es totalmente genérico: no toma ninguna decisión
// sobre `tipo_origen`, ni sobre campos específicos de OC/OP, ni sobre
// transportista/ubicación. Esas decisiones las compone cada consumidor mediante
// `headerFields` y banderas explícitas como `showRemisionFactura`.

interface ReceiptDetailShellProps {
  receipt: ReceiptDetail;
  headerFields: Array<{ label: string; value: string }>;
  /** Muestra la sección Remisión / Factura de referencia (relevante en OC). */
  showRemisionFactura?: boolean;
}

// ── Helpers de formato ────────────────────────────────────────────────────────

/** Formatea el string numérico de cantidad ("1.0000") sin ceros sobrantes. */
const formatCantidad = (value: string): string => {
  if (!value) return "—";
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? "—" : parsed.toLocaleString("es-MX");
};

// ── Sub-componentes ────────────────────────────────────────────────────────────

/** Dato del encabezado como mosaico: etiqueta pequeña arriba, valor legible abajo. */
const InfoTile = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0 rounded-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2.5">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {label}
    </p>
    <div
      className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100"
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </div>
  </div>
);

/** Lote / serie de una línea como mini-pill; se omite si la línea no lo trae. */
const LinePill = ({ label, value }: { label: string; value: string | null | undefined }) =>
  value ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
      <span className="font-mono">{value}</span>
    </span>
  ) : null;

const DetalleList = ({ detalles }: { detalles: ReceiptDetailLine[] }) => {
  if (detalles.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
        Esta recepción no tiene líneas de detalle.
      </p>
    );
  }

  return (
    <ul className="max-h-80 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
      {detalles.map((linea) => (
        <li
          key={linea.id}
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100" title={linea.producto_nombre}>
              {linea.producto_nombre}
            </p>
            {(linea.lote || linea.serie) && (
              <div className="mt-1 flex flex-wrap gap-1">
                <LinePill label="Lote" value={linea.lote} />
                <LinePill label="Serie" value={linea.serie} />
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
              {formatCantidad(linea.cantidad_recibida)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">recibidas</p>
          </div>
        </li>
      ))}
    </ul>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

export function ReceiptDetailShell({
  receipt,
  headerFields,
  showRemisionFactura = false,
}: ReceiptDetailShellProps) {
  const showRemisionFacturaSection =
    showRemisionFactura && (receipt.remision !== null || receipt.factura_referencia !== null);

  // Resumen de lo recibido: cuántas líneas y cuántas piezas en total.
  const totalRecibido = receipt.detalles.reduce((sum, linea) => {
    const cantidad = parseFloat(linea.cantidad_recibida);
    return Number.isNaN(cantidad) ? sum : sum + cantidad;
  }, 0);
  const lineas = receipt.detalles.length;

  return (
    <div className="space-y-4">
      {/* Resumen: estatus y totales de un vistazo */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 px-4 py-3">
        <StatusBadge status={receipt.estatus_label} config={RECEIPT_STATUS_CONFIG} />
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {totalRecibido.toLocaleString("es-MX")}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-300">piezas recibidas</span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 sm:ml-auto">
          {lineas} {lineas === 1 ? "producto" : "productos"}
        </span>
      </div>

      {/* Información general (+ remisión / factura en OC) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {headerFields.map((field) => (
          <InfoTile key={field.label} label={field.label}>
            {field.value}
          </InfoTile>
        ))}
        {showRemisionFacturaSection && (
          <>
            <InfoTile label="Remisión">{receipt.remision || "—"}</InfoTile>
            <InfoTile label="Factura de referencia">{receipt.factura_referencia || "—"}</InfoTile>
          </>
        )}
      </div>

      {/* Líneas de detalle */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Productos recibidos
        </h3>
        <DetalleList detalles={receipt.detalles} />
      </div>
    </div>
  );
}
