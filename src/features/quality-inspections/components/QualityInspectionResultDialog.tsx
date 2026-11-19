"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { InfoField, InfoGrid, LineItemsTable, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { formatLocalDate } from "@/src/utils/formatDate";
import { formatQuantity } from "../utils/qualityQuantities";
import { QUALITY_RESULTADO_OPTIONS } from "../constants/qualityResultado";
import { QUALITY_ESTADO_CFG } from "./QualityInspectionColumns";
import type { QualityInspection } from "../interfaces/quality-inspection.interface";

/**
 * Resultado de una inspección ya registrada. Sin fetch propio: el listado
 * `GET /compras/calidad-inspecciones/` ya trae los renglones.
 */
export function QualityInspectionResultDialog({
  inspection,
  onClose,
}: {
  inspection: QualityInspection | null;
  onClose: () => void;
}) {
  const open = inspection !== null;
  const { snapshot: data } = useDialogSession(open, inspection);
  const resultadoLabel = (v: string) => QUALITY_RESULTADO_OPTIONS.find((o) => o.value === v)?.label ?? v;

  return (
    <MainDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={data ? `Inspección de ${data.recepcion_folio}` : "Inspección"}
      maxWidth="760px"
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
