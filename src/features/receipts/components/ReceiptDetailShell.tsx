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

const InfoField = ({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <span className="text-slate-400 dark:text-slate-500">{label}</span>
    <div className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{children}</div>
  </div>
);

const DetalleTable = ({ detalles }: { detalles: ReceiptDetailLine[] }) => {
  if (detalles.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 italic px-1 py-4 text-center">
        Esta recepción no tiene líneas de detalle.
      </p>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 dark:bg-zinc-800/90 backdrop-blur">
          <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Producto</th>
            <th className="px-3 py-2 font-medium text-right">Cant. Recibida</th>
            <th className="px-3 py-2 font-medium">Lote</th>
            <th className="px-3 py-2 font-medium">Serie</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {detalles.map((linea) => (
            <tr key={linea.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                {linea.producto_nombre}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                {formatCantidad(linea.cantidad_recibida)}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {linea.lote || "—"}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {linea.serie || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  return (
    <div className="space-y-5">
      {/* Información general */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
        <InfoField label="Estatus">
          <StatusBadge status={receipt.estatus_label} config={RECEIPT_STATUS_CONFIG} />
        </InfoField>
        {headerFields.map((field) => (
          <InfoField key={field.label} label={field.label}>
            {field.value}
          </InfoField>
        ))}
      </div>

      {/* Remisión / Factura de referencia (opcional) */}
      {showRemisionFacturaSection && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10 text-xs">
          <InfoField label="Remisión">{receipt.remision || "—"}</InfoField>
          <InfoField label="Factura de referencia">
            {receipt.factura_referencia || "—"}
          </InfoField>
        </div>
      )}

      {/* Líneas de detalle */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
          Productos recibidos
        </h3>
        <DetalleTable detalles={receipt.detalles} />
      </div>
    </div>
  );
}
