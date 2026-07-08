"use client";

import { PackageCheckIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { useReceiptDetail } from "@/src/features/receipts/hooks/useReceiptDetail";
import { ReceiptDetailShell } from "@/src/features/receipts/components/ReceiptDetailShell";
import { formatLocalDate } from "@/src/utils/formatDate";

interface ReceiptDetailDialogProps {
  /** ID de la recepción a consultar. `null` mantiene la consulta deshabilitada. */
  receiptId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDetailDialog({
  receiptId,
  open,
  onOpenChange,
}: ReceiptDetailDialogProps) {
  const { data: receipt, isLoading, isError, error } = useReceiptDetail(receiptId);

  // Vista WMS: mezcla recepciones de ambos orígenes, por lo que el encabezado
  // INCLUYE `tipo_origen` y adapta qué campos se muestran. Toda la lógica
  // condicional por origen vive aquí; `ReceiptDetailShell` permanece genérico.
  const headerFields = receipt
    ? [
        {
          label: "Tipo de origen",
          value:
            receipt.tipo_origen === "OC"
              ? "Orden de Compra"
              : receipt.tipo_origen === "OP"
                ? "Orden de Producción"
                : "Desconocido",
        },
        { label: "Almacén", value: receipt.almacen_nombre },
        { label: "Fecha de recepción", value: formatLocalDate(receipt.fecha_recepcion) },
        { label: "Sucursal", value: receipt.sucursal_nombre },
        // El proveedor solo es significativo en recepciones de origen OC.
        ...(receipt.tipo_origen === "OC"
          ? [{ label: "Proveedor", value: receipt.proveedor_nombre ?? "—" }]
          : []),
      ]
    : [];

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="760px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <PackageCheckIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Recepción
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {receipt ? receipt.folio : "Cargando…"}
            </p>
          </div>
        </div>
      }
    >
      {/* ── Estado: cargando ──────────────────────────────────────────────── */}
      {isLoading && <Loader title="Cargando detalle de la recepción..." className="py-16" />}

      {/* ── Estado: error ─────────────────────────────────────────────────── */}
      {isError && (
        <ErrorState
          title="Error al cargar el detalle de la recepción"
          message={(error as Error)?.message}
        />
      )}

      {/* ── Estado: datos cargados ────────────────────────────────────────── */}
      {!isLoading && !isError && receipt && (
        <ReceiptDetailShell
          receipt={receipt}
          headerFields={headerFields}
          showRemisionFactura={Boolean(receipt.remision || receipt.factura_referencia)}
        />
      )}
    </MainDialog>
  );
}
