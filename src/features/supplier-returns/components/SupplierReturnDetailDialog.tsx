"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { BanIcon, PackageXIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { StatusBadge } from "@/src/components/StatusBadge";
import { CancellationInfo } from "@/src/components/CancellationInfo";
import {
  EmptyLines,
  InfoField,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatExactQuantityValue, formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatShortDateTime } from "@/src/utils/formatDate";
import { hasPermission } from "@/src/utils/permissions";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import { WmsCancelDialog } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import { useSupplierReturnDetail } from "../hooks/useSupplierReturnDetail";
import {
  SUPPLIER_RETURN_STATUS_CONFIG,
  SUPPLIER_RETURN_WRITE_PERMISSION,
} from "../constants/supplierReturns";
import { supplierReturnCancelDialogContent } from "../utils/supplierReturnActions";
import { SupplierReturnPdfButton } from "./SupplierReturnPdfButton";

interface SupplierReturnDetailDialogProps {
  /** Id de la devolución; `null` mantiene la consulta apagada. */
  returnId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de una devolución a proveedor (EC-951), por id: lo abren el listado y
 * la bitácora (`devolucion_proveedor`). Lee `GET .../{id}/` aunque el listado
 * tenga la misma forma, porque la bitácora solo tiene el id.
 *
 * "Cancelar devolución" va en el encabezado, con `C-WMS-RECEPCIONES` y solo si
 * está aplicada; el diálogo de motivo se monta con el permiso, aparte del
 * botón, para que cierre con su animación cuando el botón desaparece.
 * "Descargar PDF" (EC-976) lo ve cualquiera que lea el detalle. Los importes son
 * MXN: el backend valúa al costo MXN del renglón de la OC.
 */
export function SupplierReturnDetailDialog({ returnId, open, onOpenChange }: SupplierReturnDetailDialogProps) {
  const { data, isLoading, isInitialError, isNotFound, error } = useSupplierReturnDetail(returnId ?? 0);
  const { data: session } = useSession();
  const canWrite = hasPermission(SUPPLIER_RETURN_WRITE_PERMISSION, session?.user);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const headerAction =
    data && !isNotFound ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <SupplierReturnPdfButton supplierReturn={data} />
        {canWrite && data.estatus === "aplicada" && (
          <Button
            variant="secondary"
            onClick={() => setIsCancelOpen(true)}
            className="px-3! py-1.5! text-xs! text-rose-600! dark:text-rose-400!"
          >
            <BanIcon className="w-4 h-4" aria-hidden="true" />
            Cancelar
          </Button>
        )}
        {canWrite && (
          <WmsCancelDialog
            content={supplierReturnCancelDialogContent(data)}
            open={isCancelOpen}
            onOpenChange={setIsCancelOpen}
          />
        )}
      </div>
    ) : null;

  const ocHref = data?.orden_compra ? purchaseOrderDetailHref(data.orden_compra) : null;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="760px"
      showCloseButton={true}
      headerAction={headerAction}
      title={
        <div className={`flex items-center gap-2.5 ${headerAction ? "" : "pr-8"}`}>
          <PackageXIcon className="w-5 h-5 text-sky-500 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Devolución a proveedor
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {data ? data.folio || `#${data.id}` : isInitialError || isNotFound ? "Error al cargar" : "Cargando…"}
            </p>
          </div>
        </div>
      }
    >
      {isLoading && <Loader title="Cargando la devolución..." className="py-16" />}

      {isNotFound && (
        <ErrorState
          title="Error al cargar la devolución"
          message="No tienes acceso a esta devolución o ya no existe."
        />
      )}
      {isInitialError && (
        <ErrorState title="Error al cargar la devolución" message={(error as Error)?.message} />
      )}

      {!isLoading && data && (
        <div className="space-y-5">
          {data.estatus === "cancelada" && (
            <CancellationInfo
              title="Devolución cancelada"
              motivo={data.motivo_cancelacion}
              fecha={data.fecha_cancelacion}
              canceladoPor={data.cancelado_por_nombre}
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            <InfoField label="Estatus">
              <StatusBadge status={data.estatus} config={SUPPLIER_RETURN_STATUS_CONFIG} />
            </InfoField>
            <InfoField label="Fecha">
              <span className="tabular-nums">{formatShortDateTime(data.fecha)}</span>
            </InfoField>
            <InfoField label="Registró">{textOrDash(data.usuario_nombre)}</InfoField>
            <InfoField label="Proveedor">{textOrDash(data.proveedor_nombre)}</InfoField>
            <InfoField label="Recepción">
              <span className="font-mono">{textOrDash(data.recepcion_folio)}</span>
            </InfoField>
            <InfoField label="Orden de compra">
              {ocHref && data.orden_compra_folio && canAccessRoute(ocHref, session?.user) ? (
                <Link
                  href={ocHref}
                  title="Ver orden de compra"
                  className="font-mono text-sky-600 dark:text-sky-400 hover:underline"
                >
                  {data.orden_compra_folio}
                </Link>
              ) : (
                <span className="font-mono">{textOrDash(data.orden_compra_folio)}</span>
              )}
            </InfoField>
            <InfoField label="Almacén">{textOrDash(data.almacen_nombre)}</InfoField>
            <InfoField label="Sucursal">{textOrDash(data.sucursal_nombre)}</InfoField>
            <InfoField label="Total (MXN)">
              <span className="tabular-nums font-semibold">{formatMoneyValueOrDash(data.total, "MXN")}</span>
            </InfoField>
            <InfoField label="Motivo" className="col-span-2">
              <span className="whitespace-pre-line wrap-break-word">{textOrDash(data.motivo)}</span>
            </InfoField>
          </div>

          <div>
            <SectionTitle>Renglones devueltos</SectionTitle>
            {data.detalles.length === 0 ? (
              <EmptyLines>Esta devolución no tiene renglones.</EmptyLines>
            ) : (
              <LineItemsTable
                head={
                  <>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 font-medium">Color</th>
                    <th className="px-3 py-2 font-medium">Talla</th>
                    <th className="px-3 py-2 font-medium text-right">Cantidad</th>
                    <th className="px-3 py-2 font-medium text-right">Costo unitario</th>
                    <th className="px-3 py-2 font-medium text-right">Importe</th>
                  </>
                }
              >
                {data.detalles.map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">
                      {textOrDash(line.producto_variante_sku)}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{textOrDash(line.producto_nombre)}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {textOrDash(line.producto_variante_color)}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {textOrDash(line.producto_variante_talla)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatExactQuantityValue(line.cantidad)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoneyValueOrDash(line.costo_unitario, "MXN")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoneyValueOrDash(line.importe, "MXN")}</td>
                  </tr>
                ))}
              </LineItemsTable>
            )}
          </div>
        </div>
      )}
    </MainDialog>
  );
}
