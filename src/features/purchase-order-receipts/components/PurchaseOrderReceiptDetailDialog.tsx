"use client";

import { PackageCheckIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { useReceiptDetail } from "@/src/features/receipts/hooks/useReceiptDetail";
import { ReceiptDetailShell } from "@/src/features/receipts/components/ReceiptDetailShell";
import { formatLocalDate } from "@/src/utils/formatDate";

interface PurchaseOrderReceiptDetailDialogProps {
  /** ID de la recepción a consultar. `null` mantiene la consulta deshabilitada. */
  receiptId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseOrderReceiptDetailDialog({
  receiptId,
  open,
  onOpenChange,
}: PurchaseOrderReceiptDetailDialogProps) {
  const { data: receipt, isLoading, isError, error } = useReceiptDetail(receiptId);

  // Defensa en profundidad: esta vista depende de que el listado ya filtró por
  // `tipo_origen=OC` server-side. Estructuralmente no debería llegar aquí una
  // recepción OP, pero si ocurriera preferimos registrarlo en vez de renderizar
  // en silencio datos con la sección Remisión/Factura mal etiquetada.
  if (receipt && receipt.tipo_origen !== "OC") {
    console.error(
      `PurchaseOrderReceiptDetailDialog recibió una recepción no-OC (id: ${receipt.id}, tipo_origen: ${receipt.tipo_origen})`
    );
  }

  // Encabezado compuesto explícitamente para el contexto Compras/OC. Se omite a
  // propósito `tipo_origen` (esta vista siempre es OC, mostrarlo sería redundante)
  // y `Estatus` (el shell lo pinta como badge a partir de `estatus_label`).
  const headerFields = receipt
    ? [
        { label: "Proveedor", value: receipt.proveedor_nombre ?? "—" },
        { label: "Almacén", value: receipt.almacen_nombre },
        { label: "Fecha de recepción", value: formatLocalDate(receipt.fecha_recepcion) },
        { label: "Sucursal", value: receipt.sucursal_nombre },
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
          showRemisionFactura
        />
      )}
    </MainDialog>
  );
}
