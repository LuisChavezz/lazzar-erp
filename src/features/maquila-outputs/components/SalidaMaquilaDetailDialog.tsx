"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  InfoField,
  InfoGrid,
  LineItemsTable,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatAmountNoCurrency, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate, formatShortDateTime } from "@/src/utils/formatDate";
import { useSalidaMaquila } from "../hooks/useSalidaMaquila";
import {
  isSalidaMaquilaAbierta,
  SALIDA_MAQUILA_STATUS_CONFIG,
} from "../constants/salidaMaquilaStatus";
import { SalidaMaquilaActions } from "./SalidaMaquilaActions";
import { SalidaMaquilaOrigenLink } from "./SalidaMaquilaOrigenLink";

/**
 * Detalle de una SM. Se abre por id: el listado no trae renglones, así que el
 * detalle hace su propio GET.
 */
export function SalidaMaquilaDetailDialog({
  id,
  onClose,
  canWrite,
}: {
  id: number | null;
  onClose: () => void;
  canWrite: boolean;
}) {
  const { data, isLoading, isInitialError, isDefinitiveError } = useSalidaMaquila(id);

  return (
    <MainDialog
      open={id !== null}
      onOpenChange={(open) => !open && onClose()}
      title={data ? `Salida a maquila ${data.folio}` : "Salida a maquila"}
      description="Prendas que salieron a confeccionarse con un maquilero."
      maxWidth="820px"
    >
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader />
        </div>
      ) : isDefinitiveError ? (
        <EmptyLines>Esta salida no existe o no pertenece a tus sucursales.</EmptyLines>
      ) : isInitialError || !data ? (
        <EmptyLines>No se pudo cargar la salida. Intenta de nuevo.</EmptyLines>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={data.estatus} config={SALIDA_MAQUILA_STATUS_CONFIG} />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {formatQuantityValue(data.total_piezas)} piezas ·{" "}
              <span className="font-semibold text-slate-800 dark:text-white tabular-nums">
                {formatAmountNoCurrency(data.total)}
              </span>
            </span>
          </div>

          <InfoGrid>
            <InfoField label="Origen">
              <SalidaMaquilaOrigenLink salida={data} />
            </InfoField>
            <InfoField label="Maquilero">{textOrDash(data.centro_confeccion_nombre)}</InfoField>
            <InfoField label="Envío">{formatShortCalendarDate(data.fecha_envio)}</InfoField>
            <InfoField label="Compromiso">{formatShortCalendarDate(data.fecha_compromiso)}</InfoField>
            <InfoField label="Recibida">
              {data.fecha_recepcion ? formatShortDateTime(data.fecha_recepcion) : "—"}
            </InfoField>
            <InfoField label="Observaciones">{textOrDash(data.observaciones)}</InfoField>
          </InfoGrid>

          {data.detalles.length === 0 ? (
            <EmptyLines>Sin renglones.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">Prenda</th>
                  <th className="px-3 py-2 font-medium text-right">Piezas</th>
                  <th className="px-3 py-2 font-medium text-right">Precio</th>
                  <th className="px-3 py-2 font-medium text-right">Importe</th>
                </>
              }
            >
              {data.detalles.map((d) => (
                <tr key={d.id}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{d.descripcion}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQuantityValue(d.cantidad)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatAmountNoCurrency(d.precio_unitario)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {formatAmountNoCurrency(d.importe)}
                  </td>
                </tr>
              ))}
            </LineItemsTable>
          )}

          {canWrite && isSalidaMaquilaAbierta(data.estatus) && <SalidaMaquilaActions salida={data} />}
        </div>
      )}
    </MainDialog>
  );
}
