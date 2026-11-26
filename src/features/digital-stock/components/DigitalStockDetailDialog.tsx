"use client";

import type { ReactNode } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { AccessibleLink } from "@/src/components/AccessibleLink";
import { BLUE_FOLIO_LINK_CLASS } from "@/src/components/FolioButton";
import { InventariosIcon } from "@/src/components/Icons";
import {
  EmptyLines,
  HeaderStat,
  HeaderStatRow,
  LineItemsTable,
  SectionTitle,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatShortCalendarDate, formatShortDateTime } from "@/src/utils/formatDate";
import { productionOrderDetailPath } from "@/src/constants/workOrderRoutes";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import type { PedidoDetailOrigin } from "@/src/features/orders/constants/pedidoDetailOrigins";
import type {
  StockDigitalDetalle,
  StockDigitalFila,
} from "../interfaces/digital-stock.interface";
import {
  EXISTENCIA_ALM00_LABEL,
  existenciaAlm00Hint,
  type DigitalStockModule,
} from "../constants/digitalStockTable";
import { useDigitalStockDetail } from "../hooks/useDigitalStockDetail";
import { digitalStockErrorMessage } from "../utils/digitalStockErrors";
import { DigitalStockPedidoFolio } from "./DigitalStockPedidoFolio";
import { DigitalStockQuantity } from "./DigitalStockQuantity";

interface DigitalStockDetailDialogProps {
  /**
   * Fila con la que se abrió (da título mientras llega el detalle) y la
   * sucursal con que estaba filtrado el listado, para pedir el detalle con las
   * MISMAS cifras que la fila.
   */
  target: { fila: StockDigitalFila; sucursal: number | undefined } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: DigitalStockModule;
  pedidoOrigin: PedidoDetailOrigin;
}

const TH = "px-2.5 py-2 font-medium whitespace-nowrap";
const TH_RIGHT = `${TH} text-right`;
const TD = "px-2.5 py-2 text-slate-700 dark:text-slate-200";
const TD_NUM = "px-2.5 py-2 text-right";
const TD_DATE = `${TD} whitespace-nowrap`;
const FOLIO_TEXT_CLASS = "font-mono text-[13px] font-bold text-slate-700 dark:text-slate-200";

const InactiveMark = () => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300">
    Inactivo
  </span>
);

/**
 * Detalle de un SKU del stock digital (`GET /ventas/stock-digital/{id}/`): sus
 * cifras y de dónde sale cada una. Todo se pinta como llega del backend: ni las
 * cifras se recalculan ni `estatus_display` se normaliza (el del pedido llega
 * en mayúsculas y el de la OP sin acentos).
 */
export function DigitalStockDetailDialog({
  target,
  open,
  onOpenChange,
  module,
  pedidoOrigin,
}: DigitalStockDetailDialogProps) {
  // Copia de la fila (y la sucursal) tal como estaban al ABRIR; `session.id`
  // monta un contenido nuevo en cada apertura.
  const session = useDialogSession(open, target);
  const titulo = session.snapshot?.fila ?? null;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="1180px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
            <InventariosIcon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              <span className="font-mono">{titulo?.sku ?? "—"}</span>
              {titulo && !titulo.activo && <InactiveMark />}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate">
              {textOrDash(titulo?.nombre || titulo?.producto_nombre)}
            </p>
          </div>
        </div>
      }
    >
      {titulo && (
        <DigitalStockDetailContent
          key={session.id}
          varianteId={titulo.variante_id}
          sucursal={session.snapshot?.sucursal}
          module={module}
          pedidoOrigin={pedidoOrigin}
          showInactiveMark={titulo.activo}
        />
      )}
    </MainDialog>
  );
}

/** Cuerpo del diálogo: consulta y pinta el detalle de UNA apertura. */
function DigitalStockDetailContent({
  varianteId,
  sucursal,
  module,
  pedidoOrigin,
  showInactiveMark,
}: {
  varianteId: number;
  sucursal: number | undefined;
  module: DigitalStockModule;
  pedidoOrigin: PedidoDetailOrigin;
  /**
   * La fila con que se abrió decía "activo": si el detalle dice lo contrario,
   * la marca va en el cuerpo (el título ya la pinta cuando la fila la traía).
   */
  showInactiveMark: boolean;
}) {
  const {
    data: detalle,
    isLoading,
    isInitialError,
    isDefinitiveError,
    error,
  } = useDigitalStockDetail(varianteId, sucursal);

  return (
    <>
      {isLoading && <Loader title="Cargando detalle del SKU..." className="py-16" />}

      {isDefinitiveError && (
        <ErrorState title="SKU no disponible" message="No existe ese SKU en tu empresa." />
      )}

      {isInitialError && (
        <ErrorState
          title="Error al cargar el detalle del SKU"
          // 403 `{detail}` y 400 `{campo: mensaje}` del backend, tal cual.
          message={
            digitalStockErrorMessage(error) ??
            extractErrorMessage(error, "No se pudo cargar el detalle del SKU.")
          }
        />
      )}

      {detalle && !isLoading && (
        <DetalleBody
          detalle={detalle}
          module={module}
          pedidoOrigin={pedidoOrigin}
          showInactiveMark={showInactiveMark && !detalle.activo}
        />
      )}
    </>
  );
}

function DetalleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}

function DetalleBody({
  detalle,
  module,
  pedidoOrigin,
  showInactiveMark,
}: {
  detalle: StockDigitalDetalle;
  module: DigitalStockModule;
  pedidoOrigin: PedidoDetailOrigin;
  showInactiveMark: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {showInactiveMark && <InactiveMark />}
          <span>Producto: {textOrDash(detalle.producto_nombre)}</span>
          <span>Categoría: {textOrDash(detalle.categoria_nombre)}</span>
          <span>Color: {textOrDash(detalle.color)}</span>
          <span>Talla: {textOrDash(detalle.talla)}</span>
        </div>
        <HeaderStatRow>
          <HeaderStat label={EXISTENCIA_ALM00_LABEL}>
            <span title={existenciaAlm00Hint(module)} className="cursor-help">
              <DigitalStockQuantity value={detalle.existencia_real} />
            </span>
          </HeaderStat>
          <HeaderStat label="Comprometido">
            <DigitalStockQuantity value={detalle.comprometido} />
          </HeaderStat>
          <HeaderStat label="En producción">
            <DigitalStockQuantity value={detalle.en_produccion} />
          </HeaderStat>
          <HeaderStat label="En compra">
            <DigitalStockQuantity value={detalle.en_compra} />
          </HeaderStat>
          <HeaderStat label="Disponible hoy">
            <DigitalStockQuantity value={detalle.disponible_hoy} />
          </HeaderStat>
          <HeaderStat label="Disponible digital" bold>
            <DigitalStockQuantity value={detalle.disponible_digital} shortageWhenNegative bold />
          </HeaderStat>
          <HeaderStat label="Próxima entrada">
            {detalle.proxima_entrada ? formatShortCalendarDate(detalle.proxima_entrada) : "Sin fecha"}
          </HeaderStat>
        </HeaderStatRow>
      </div>

      <DetalleSection title={`${EXISTENCIA_ALM00_LABEL} por sucursal`}>
        {detalle.existencias.length === 0 ? (
          <EmptyLines>Sin existencia en ALM-00.</EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className={TH}>Sucursal</th>
                <th className={TH}>Almacén</th>
                <th className={TH_RIGHT}>Cantidad</th>
              </>
            }
          >
            {detalle.existencias.map((existencia) => (
              <tr key={existencia.almacen_id}>
                <td className={TD}>{textOrDash(existencia.sucursal)}</td>
                <td className={`${TD} font-mono text-xs`}>{textOrDash(existencia.almacen)}</td>
                <td className={TD_NUM}>
                  <DigitalStockQuantity value={existencia.cantidad} />
                </td>
              </tr>
            ))}
          </LineItemsTable>
        )}
      </DetalleSection>

      <DetalleSection title="Pedidos que lo comprometen">
        {detalle.compromisos.length === 0 ? (
          <EmptyLines>Ningún pedido lo compromete.</EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className={TH}>Pedido</th>
                <th className={TH}>Cliente</th>
                <th className={TH}>Vendedor</th>
                <th className={TH}>Clasificación</th>
                <th className={TH}>Estatus</th>
                <th className={TH}>Confirmado</th>
                <th className={TH}>Entrega estimada</th>
                <th className={TH_RIGHT}>Pedida</th>
                <th className={TH_RIGHT}>Surtida</th>
                <th className={TH_RIGHT}>Pendiente</th>
              </>
            }
          >
            {detalle.compromisos.map((compromiso) => (
              <tr key={compromiso.pedido_id}>
                <td className={`${TD} whitespace-nowrap`}>
                  <DigitalStockPedidoFolio
                    pedidoId={compromiso.pedido_id}
                    folio={compromiso.folio}
                    from={pedidoOrigin}
                    className={BLUE_FOLIO_LINK_CLASS}
                    textClassName={FOLIO_TEXT_CLASS}
                  />
                </td>
                <td className={`${TD} max-w-48 truncate`} title={compromiso.cliente_nombre ?? undefined}>
                  {textOrDash(compromiso.cliente_nombre)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>{textOrDash(compromiso.vendedor)}</td>
                <td className={TD}>{textOrDash(compromiso.clasificacion)}</td>
                <td className={TD}>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="whitespace-nowrap">{textOrDash(compromiso.estatus_display)}</span>
                    {compromiso.retenido && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                        Retenido
                      </span>
                    )}
                  </div>
                </td>
                <td className={TD_DATE}>{formatShortDateTime(compromiso.fecha_confirmacion)}</td>
                <td className={TD_DATE}>
                  <EntregaEstimada desde={compromiso.entrega_desde} hasta={compromiso.entrega_hasta} />
                </td>
                <td className={TD_NUM}>
                  <DigitalStockQuantity value={compromiso.pedida} />
                </td>
                <td className={TD_NUM}>
                  <DigitalStockQuantity value={compromiso.surtida} />
                </td>
                <td className={TD_NUM}>
                  <DigitalStockQuantity value={compromiso.pendiente} bold />
                </td>
              </tr>
            ))}
          </LineItemsTable>
        )}
      </DetalleSection>

      <DetalleSection title="Entradas de producción">
        {detalle.entradas_produccion.length === 0 ? (
          <EmptyLines>No hay órdenes de producción por llegar.</EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className={TH}>OP</th>
                <th className={TH}>Pedido</th>
                <th className={TH}>Estatus</th>
                <th className={TH}>Entrega estimada</th>
                <th className={TH_RIGHT}>Cantidad</th>
                <th className={TH_RIGHT}>Recibido</th>
                <th className={TH_RIGHT}>Pendiente</th>
              </>
            }
          >
            {detalle.entradas_produccion.map((entrada) => (
              <tr key={entrada.op_id}>
                <td className={`${TD} whitespace-nowrap`}>
                  <AccessibleLink
                    href={productionOrderDetailPath(entrada.op_id)}
                    className={`${BLUE_FOLIO_LINK_CLASS} hover:underline`}
                    fallbackClassName={FOLIO_TEXT_CLASS}
                  >
                    {textOrDash(entrada.folio)}
                  </AccessibleLink>
                </td>
                <td className={`${TD} font-mono text-xs`}>{textOrDash(entrada.pedido_folio)}</td>
                <td className={`${TD} whitespace-nowrap`}>{textOrDash(entrada.estatus_display)}</td>
                <td className={TD_DATE}>{formatShortCalendarDate(entrada.fecha_entrega_estimada)}</td>
                <td className={TD_NUM}>
                  <DigitalStockQuantity value={entrada.cantidad} />
                </td>
                <td className={TD_NUM}>
                  <DigitalStockQuantity value={entrada.recibido} />
                </td>
                <td className={TD_NUM}>
                  <DigitalStockQuantity value={entrada.pendiente} bold />
                </td>
              </tr>
            ))}
          </LineItemsTable>
        )}
      </DetalleSection>

      <DetalleSection title="Entradas de compra">
        {detalle.entradas_compra.length === 0 ? (
          <EmptyLines>No hay órdenes de compra por llegar.</EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className={TH}>OC</th>
                <th className={TH}>Proveedor</th>
                <th className={TH}>Estatus</th>
                <th className={TH}>Entrega estimada</th>
                <th className={TH_RIGHT}>Cantidad</th>
                <th className={TH_RIGHT}>Recibido</th>
                <th className={TH_RIGHT}>Pendiente</th>
              </>
            }
          >
            {detalle.entradas_compra.map((entrada) => (
              <tr key={entrada.orden_compra_id}>
                <td className={`${TD} whitespace-nowrap`}>
                  <AccessibleLink
                    href={purchaseOrderDetailHref(entrada.orden_compra_id)}
                    className={`${BLUE_FOLIO_LINK_CLASS} hover:underline`}
                    fallbackClassName={FOLIO_TEXT_CLASS}
                  >
                    {textOrDash(entrada.folio)}
                  </AccessibleLink>
                </td>
                <td className={`${TD} max-w-48 truncate`} title={entrada.proveedor ?? undefined}>
                  {textOrDash(entrada.proveedor)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>{textOrDash(entrada.estatus_display)}</td>
                <td className={TD_DATE}>{formatShortCalendarDate(entrada.fecha_entrega_estimada)}</td>
                <td className={TD_NUM}>
                  <DigitalStockQuantity value={entrada.cantidad} />
                </td>
                <td className={TD_NUM}>
                  <DigitalStockQuantity value={entrada.recibido} />
                </td>
                <td className={TD_NUM}>
                  <DigitalStockQuantity value={entrada.pendiente} bold />
                </td>
              </tr>
            ))}
          </LineItemsTable>
        )}
      </DetalleSection>
    </div>
  );
}

/** Rango de entrega estimada del pedido; "—" sin fechas. */
function EntregaEstimada({ desde, hasta }: { desde: string | null; hasta: string | null }) {
  if (!desde && !hasta) return <>—</>;
  if (desde && hasta && desde !== hasta) {
    return (
      <>
        {formatShortCalendarDate(desde)} – {formatShortCalendarDate(hasta)}
      </>
    );
  }
  return <>{formatShortCalendarDate(hasta ?? desde)}</>;
}
