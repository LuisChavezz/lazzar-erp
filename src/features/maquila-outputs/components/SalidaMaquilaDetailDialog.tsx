"use client";

import { SalidaMaquilaPiezas } from "./SalidaMaquilaPiezas";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { StatusBadge } from "@/src/components/StatusBadge";
import { CancellationInfo } from "@/src/components/CancellationInfo";
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
import { useSalidaMaquilaRegreso } from "../hooks/useSalidaMaquilaRegreso";
import { SALIDA_MAQUILA_STATUS_CONFIG } from "../constants/salidaMaquilaStatus";
import { puedeCancelarSalidaMaquila } from "../utils/salidaMaquilaDocumentos";
import { salidaMaquilaFolio } from "../constants/salidaMaquilaOrigen";
import { SalidaMaquilaActions } from "./SalidaMaquilaActions";
import { SalidaMaquilaOrigenLink } from "./SalidaMaquilaOrigenLink";
import { SalidaMaquilaDocumentos } from "./SalidaMaquilaDocumentos";

/**
 * Detalle de una SM. Se abre por id: el listado no trae renglones, así que el
 * detalle hace su propio GET. Sin `R-PRODUCCION-COSTOS` (`canSeeAmounts`) no
 * muestra precio, importe ni total; con él, una clave ausente es "—".
 */
export function SalidaMaquilaDetailDialog({
  id,
  onClose,
  canWrite,
  canSeeAmounts,
}: {
  id: number | null;
  onClose: () => void;
  canWrite: boolean;
  canSeeAmounts: boolean;
}) {
  const { data, isLoading, isInitialError, isDefinitiveError } = useSalidaMaquila(id);
  // Qué regresó de cada renglón (de sus recepciones).
  const { porRenglon } = useSalidaMaquilaRegreso(data);

  return (
    <MainDialog
      open={id !== null}
      onOpenChange={(open) => !open && onClose()}
      title={data ? `Salida a maquila ${salidaMaquilaFolio(data)}` : "Salida a maquila"}
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
              {formatQuantityValue(data.total_piezas)} piezas{" "}
              <SalidaMaquilaPiezas
                recibidas={data.piezas_recibidas}
                faltantes={data.piezas_faltantes}
                estatus={data.estatus}
              />
              {canSeeAmounts && (
                <>
                  {" · "}
                  <span className="font-semibold text-slate-800 dark:text-white tabular-nums">
                    {formatAmountNoCurrency(data.total)}
                  </span>
                </>
              )}
            </span>
          </div>

          {data.estatus === "CANCELADA" && (
            <CancellationInfo
              title="Salida cancelada"
              motivo={data.motivo_cancelacion}
              fecha={data.fecha_cancelacion}
              canceladoPor={data.cancelado_por_nombre}
            />
          )}

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
                  <th className="px-3 py-2 font-medium text-right">Enviadas</th>
                  {porRenglon && (
                    <>
                      <th className="px-3 py-2 font-medium text-right">Regresaron</th>
                      <th className="px-3 py-2 font-medium text-right">Estado</th>
                    </>
                  )}
                  {canSeeAmounts && (
                    <>
                      <th className="px-3 py-2 font-medium text-right">Precio</th>
                      <th className="px-3 py-2 font-medium text-right">Importe</th>
                    </>
                  )}
                </>
              }
            >
              {data.detalles.map((d) => {
                const regreso = porRenglon?.[d.id];
                const enviadas = Number(d.cantidad) || 0;
                // Lo pendiente del backend (#1270); si aún no lo manda, enviadas − recibidas.
                const faltan =
                  d.cantidad_pendiente !== undefined
                    ? Number(d.cantidad_pendiente) || 0
                    : Math.max(0, enviadas - (regreso?.recibidas ?? 0));
                return (
                <tr key={d.id} className={regreso && faltan > 0 ? "bg-amber-50/50 dark:bg-amber-500/5" : undefined}>
                  <td className="px-3 py-2">
                    <span className="block font-mono text-sm font-semibold text-slate-800 dark:text-white">{d.descripcion}</span>
                    {regreso?.nombre && (
                      <span className="block max-w-72 truncate text-[11px] text-slate-500 dark:text-slate-400" title={regreso.nombre}>
                        {regreso.nombre}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQuantityValue(enviadas)}</td>
                  {regreso && (
                    <>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatQuantityValue(regreso.recibidas)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {faltan === 0 ? (
                          <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                            Completo
                          </span>
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                              data.estatus === "RECIBIDA"
                                ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {data.estatus === "RECIBIDA" ? `No regresaron ${formatQuantityValue(faltan)}` : `Faltan ${formatQuantityValue(faltan)}`}
                          </span>
                        )}
                      </td>
                    </>
                  )}
                  {canSeeAmounts && (
                    <>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatAmountNoCurrency(d.precio_unitario)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">
                        {formatAmountNoCurrency(d.importe)}
                      </td>
                    </>
                  )}
                </tr>
                );
              })}
            </LineItemsTable>
          )}

          <SalidaMaquilaDocumentos salida={data} />

          {/* Con una recepción viva, lo que falta se cierra desde WMS ("Cerrar la
              SM con faltante"), no cancelando la SM (EC-919). */}
          {canWrite && puedeCancelarSalidaMaquila(data) && <SalidaMaquilaActions salida={data} />}
        </div>
      )}
    </MainDialog>
  );
}
