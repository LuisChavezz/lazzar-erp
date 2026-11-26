"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { Button } from "@/src/components/Button";
import { PackageXIcon, ReopenIcon } from "@/src/components/Icons";
import { SupplierReturnCreateDialog } from "@/src/features/supplier-returns/components/SupplierReturnCreateDialog";
import { WmsCancelDialog } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { InfoField, InfoGrid, LineItemsTable, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { formatLocalDate, formatShortDateTime } from "@/src/utils/formatDate";
import { formatQuantity } from "../utils/qualityQuantities";
import { QUALITY_RESULTADO_OPTIONS } from "../constants/qualityResultado";
import { QUALITY_ESTADO_CFG } from "./QualityInspectionColumns";
import type { QualityInspection } from "../interfaces/quality-inspection.interface";
import { qualityRevertDialogContent } from "../utils/qualityRevertAction";

/**
 * Resultado de una inspección ya registrada. Sin fetch propio: el listado
 * `GET /compras/calidad-inspecciones/` ya trae los renglones.
 *
 * "Revertir calidad" (EC-947) vive en el encabezado de este diálogo y no en la
 * fila: "Inspeccionadas" no tiene menú de acciones (el folio abre este
 * detalle), y es donde WMS ya pone cancelar/revertir un documento (EC-945).
 * `canRevert` lo decide la vista (admin y la inspección revertible); el
 * diálogo de motivo se monta con `isAdmin`, aparte del botón, para que se
 * anime al cerrar. Al revertir se cierra también este detalle: muestra la foto
 * de cuando se abrió y ya no correspondería.
 *
 * "Devolver a proveedor" (EC-951) va junto: con `canCreateReturn`
 * (`C-WMS-RECEPCIONES`) y si la inspección tiene algo rechazado o en cuarentena
 * por devolver (`tiene_devolucion_pendiente`). Abre el alta con esta inspección
 * ya elegida y, al registrarla, cierra también este detalle por la misma razón.
 */
export function QualityInspectionResultDialog({
  inspection,
  isAdmin,
  canRevert,
  ordenCompraId,
  canCreateReturn,
  onClose,
}: {
  inspection: QualityInspection | null;
  /** `role === "admin"`: `is_admin_empresa || is_superuser`, la regla del backend. */
  isAdmin: boolean;
  /** Admin y la inspección revertible (`isQualityInspectionRevertible`). */
  canRevert: boolean;
  /** OC de la recepción (`orden_compra` de su fila), para escribir su estatus al revertir. */
  ordenCompraId: number | null;
  /** `C-WMS-RECEPCIONES`: puede registrar una devolución a proveedor. */
  canCreateReturn: boolean;
  onClose: () => void;
}) {
  const open = inspection !== null;
  const { snapshot: data } = useDialogSession(open, inspection);
  const [isRevertOpen, setIsRevertOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const resultadoLabel = (v: string) => QUALITY_RESULTADO_OPTIONS.find((o) => o.value === v)?.label ?? v;
  const anulada = data?.estado === "anulada";

  const canReturn = canCreateReturn && data?.tiene_devolucion_pendiente === true;

  // Solo con una acción visible (o uno de sus diálogos abierto, para que no se
  // desmonte a media animación): un contenedor vacío cambiaría el encabezado de
  // `MainDialog`, que reserva la columna de acciones.
  const hasHeaderAction = canReturn || (isAdmin && canRevert) || isReturnOpen || isRevertOpen;
  const headerAction =
    hasHeaderAction && data ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canReturn && (
          <Button
            variant="secondary"
            onClick={() => setIsReturnOpen(true)}
            className="px-3! py-1.5! text-xs!"
          >
            <PackageXIcon className="w-4 h-4" aria-hidden="true" />
            Devolver a proveedor
          </Button>
        )}
        {canCreateReturn && (
          <SupplierReturnCreateDialog
            open={isReturnOpen}
            inspection={{ id: data.id, recepcion_folio: data.recepcion_folio }}
            onClose={() => setIsReturnOpen(false)}
            onCreated={onClose}
          />
        )}
        {isAdmin && canRevert && (
          <Button
            variant="secondary"
            onClick={() => setIsRevertOpen(true)}
            className="px-3! py-1.5! text-xs! text-rose-600! dark:text-rose-400!"
          >
            <ReopenIcon className="w-4 h-4" aria-hidden="true" />
            Revertir calidad
          </Button>
        )}
        {isAdmin && (
          <WmsCancelDialog
            content={qualityRevertDialogContent(data, ordenCompraId, onClose)}
            open={isRevertOpen}
            onOpenChange={setIsRevertOpen}
          />
        )}
      </div>
    ) : undefined;

  return (
    <MainDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={data ? `Inspección de ${data.recepcion_folio}` : "Inspección"}
      maxWidth="760px"
      headerAction={headerAction}
    >
      {data && (
        <div className="space-y-4">
          <InfoGrid>
            <InfoField label="Resultado">
              <StatusBadge status={data.estado} config={QUALITY_ESTADO_CFG} />
            </InfoField>
            <InfoField label="Inspector">{textOrDash(data.inspector_nombre)}</InfoField>
            <InfoField label="Fecha">{formatLocalDate(data.fecha)}</InfoField>
            <InfoField label="Observaciones">{textOrDash(data.observaciones)}</InfoField>
            {data.tiene_devolucion_pendiente === true && (
              <InfoField label="Devolución a proveedor">
                <span className="text-amber-700 dark:text-amber-400">
                  Tiene rechazo o cuarentena pendiente de devolver.
                </span>
              </InfoField>
            )}
            {/* EC-947: quién la anuló no, el backend solo manda su id. */}
            {anulada && (
              <>
                <InfoField label="Motivo de la reversa">
                  {data.motivo_anulacion?.trim() || "Sin motivo registrado."}
                </InfoField>
                <InfoField label="Anulada el">{formatShortDateTime(data.fecha_anulacion)}</InfoField>
              </>
            )}
          </InfoGrid>
          <LineItemsTable
            head={
              <>
                <th className="px-3 py-2 font-medium">Prenda</th>
                <th className="px-3 py-2 font-medium text-right">Inspeccionada</th>
                <th className="px-3 py-2 font-medium text-right">Aprobada</th>
                <th className="px-3 py-2 font-medium text-right">Rechazada</th>
                <th className="px-3 py-2 font-medium">Resultado</th>
              </>
            }
          >
            {data.detalles.map((d) => {
              const rechazada = Number(d.cantidad_rechazada) || 0;
              return (
                <tr key={d.id} className={rechazada > 0 ? "bg-rose-50/40 dark:bg-rose-500/5" : undefined}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    {d.producto_nombre}
                    {d.motivo_rechazo && (
                      <span className="block text-[11px] text-rose-600 dark:text-rose-400">Motivo: {d.motivo_rechazo}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(d.cantidad_inspeccionada)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatQuantity(d.cantidad_aprobada)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${rechazada > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
                    {formatQuantity(d.cantidad_rechazada)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{resultadoLabel(d.resultado)}</td>
                </tr>
              );
            })}
          </LineItemsTable>
        </div>
      )}
    </MainDialog>
  );
}
