"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { RouteIcon } from "@/src/components/Icons";
import { MetricCard, RowProgressBar } from "@/src/components/ProgressPrimitives";
import {
  EmptyLines,
  LineItemsTable,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import type { SurtidoPedido } from "../interfaces/order-fulfillment.interface";
import { isSurtidoCompleto, surtidoEstatusLabel } from "../constants/surtidoEtapa";
import { useSurtidoPedidoDetalle } from "../hooks/useSurtidoPedidoDetalle";
import { SurtidoEtapaChip } from "./SurtidoEtapaChip";

interface SurtidoPedidoDetailDialogProps {
  /** Fila con la que se abrió: da título mientras llega el detalle. */
  pedido: SurtidoPedido | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TH = "px-2.5 py-2 font-medium whitespace-nowrap";
const TH_RIGHT = `${TH} text-right`;
const TD = "px-2.5 py-2 text-slate-700 dark:text-slate-200";
const TD_NUM = "px-2.5 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200";
const TD_MUTED_NUM = "px-2.5 py-2 text-right tabular-nums text-slate-400 dark:text-slate-500";

/**
 * Avance por talla de un pedido (`GET /wms/surtido-pedidos/{id}/`). Las cifras
 * se pintan como llegan; las barras solo acotan su ANCHO a 100. Un producto o
 * SKU nulo (líneas de muestra) se muestra como "—".
 */
export function SurtidoPedidoDetailDialog({
  pedido,
  open,
  onOpenChange,
}: SurtidoPedidoDetailDialogProps) {
  // Copia del pedido tal como estaba al ABRIR: el título no mezcla esa copia
  // con la fila viva, y `session.id` monta un contenido nuevo en cada apertura.
  const session = useDialogSession(open, pedido);
  const titulo = session.snapshot;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="1180px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
            <RouteIcon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Avance de surtido por talla
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate">
              <span className="font-mono">{titulo?.folio || "—"}</span>
              {titulo?.cliente_nombre && <> · {titulo.cliente_nombre}</>}
            </p>
          </div>
        </div>
      }
    >
      {titulo && <SurtidoPedidoDetailContent key={session.id} pedidoId={titulo.id} />}
    </MainDialog>
  );
}

/** Cuerpo del diálogo: consulta y pinta el detalle de UNA apertura. */
function SurtidoPedidoDetailContent({ pedidoId }: { pedidoId: number }) {
  const {
    data: detalle,
    isLoading,
    isInitialError,
    isDefinitiveError,
    error,
  } = useSurtidoPedidoDetalle(pedidoId);

  return (
    <>
      {isLoading && <Loader title="Cargando avance por talla..." className="py-16" />}

      {isDefinitiveError && (
        <ErrorState
          title="Pedido no disponible"
          message="El pedido ya no existe, se canceló o no pertenece a tus sucursales."
        />
      )}

      {isInitialError && (
        <ErrorState
          title="Error al cargar el avance por talla"
          message={extractErrorMessage(error, "No se pudo cargar el avance por talla.")}
        />
      )}

      {detalle && !isLoading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Etapa del pedido:</span>
            <SurtidoEtapaChip etapa={detalle.etapa} />
            <span className="ml-2">
              Estatus: {surtidoEstatusLabel(detalle.estatus, detalle.estatus_display)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <MetricCard label="Pedidas" done={formatQuantityValue(detalle.pedidas)} />
            <MetricCard
              label="Surtidas"
              done={formatQuantityValue(detalle.surtidas)}
              hint={`${formatQuantityValue(detalle.pct_surtido)}% surtido`}
            />
            <MetricCard label="Comprometidas" done={formatQuantityValue(detalle.comprometidas)} />
            <MetricCard
              label="Empacadas"
              done={formatQuantityValue(detalle.empacadas)}
              hint="Informativo"
            />
            <MetricCard
              label="Despachadas"
              done={formatQuantityValue(detalle.despachadas)}
              hint="Informativo"
            />
          </div>

          {detalle.renglones.length === 0 ? (
            <EmptyLines>El pedido no tiene tallas.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className={TH}>SKU</th>
                  <th className={TH}>Producto</th>
                  <th className={TH}>Talla</th>
                  <th className={TH}>Color</th>
                  <th className={`${TH} text-center`}>Etapa</th>
                  <th className={TH_RIGHT}>Pedidas</th>
                  <th className={TH_RIGHT}>Surtidas</th>
                  <th className={TH_RIGHT}>Comprometidas</th>
                  <th className={TH_RIGHT} title="Informativo">
                    Empacadas
                  </th>
                  <th className={TH_RIGHT} title="Informativo">
                    Despachadas
                  </th>
                  <th className={TH_RIGHT}>% surtido</th>
                </>
              }
            >
              {detalle.renglones.map((renglon) => (
                <tr key={renglon.pedido_detalle_talla_id}>
                  <td className={`${TD} font-mono text-xs whitespace-nowrap`}>
                    {textOrDash(renglon.sku)}
                  </td>
                  <td className={`${TD} max-w-56 truncate`} title={renglon.producto_nombre ?? undefined}>
                    {textOrDash(renglon.producto_nombre)}
                  </td>
                  <td className={TD}>{textOrDash(renglon.talla)}</td>
                  <td className={TD}>{textOrDash(renglon.color)}</td>
                  <td className={`${TD} text-center`}>
                    <SurtidoEtapaChip etapa={renglon.etapa} />
                  </td>
                  <td className={TD_NUM}>{formatQuantityValue(renglon.pedidas)}</td>
                  <td className={TD_NUM}>{formatQuantityValue(renglon.surtidas)}</td>
                  <td className={TD_NUM}>{formatQuantityValue(renglon.comprometidas)}</td>
                  <td className={TD_MUTED_NUM}>{formatQuantityValue(renglon.empacadas)}</td>
                  <td className={TD_MUTED_NUM}>{formatQuantityValue(renglon.despachadas)}</td>
                  <td className="px-2.5 py-2">
                    <RowProgressBar
                      percentage={renglon.pct_surtido}
                      complete={isSurtidoCompleto(renglon)}
                    />
                  </td>
                </tr>
              ))}
            </LineItemsTable>
          )}
        </div>
      )}
    </>
  );
}
