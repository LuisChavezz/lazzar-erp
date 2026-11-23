"use client";

import type React from "react";
import { AccessibleLink } from "@/src/components/AccessibleLink";
import { Button } from "@/src/components/Button";
import { EmptyLines, LineItemsTable, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { DocChevron, DocEstatusBadge } from "@/src/components/DocEstatusBadge";
import { ErrorState } from "@/src/components/ErrorState";
import { FacturacionIcon, FolioIcon, OrdenesIcon, RefreshIcon, WarehouseIcon } from "@/src/components/Icons";
import { KpiCurrencyAmount } from "@/src/components/KpiCurrency";
import { Loader } from "@/src/components/Loader";
import { StatusBadge } from "@/src/components/StatusBadge";
import { SALIDA_MAQUILA_STATUS_CONFIG } from "@/src/features/maquila-outputs/constants/salidaMaquilaStatus";
import { PreOrdenLink } from "@/src/features/production-orders/components/PreOrdenLink";
import { PRE_ORDER_STATUS_CFG } from "@/src/features/pre-orders/constants/preOrderStatus";
import { MOVEMENT_TYPE_CONFIG } from "@/src/features/stock-movements/constants/movementTypes";
import { useRouteAccess } from "@/src/hooks/useRouteAccess";
import {
  formatAmountNoCurrency,
  formatQuantityValue,
  safeParseAmount,
} from "@/src/utils/formatCurrency";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getPedidoEstatusConfig } from "../constants/pedidoStatus";
import { canOpenOrderDocument } from "../constants/orderDocumentAccess";
import type { PedidoDocumentosQuery } from "../hooks/usePedidoDocumentos";
import type { PedidoDetail } from "../interfaces/order.interface";
import type {
  PedidoDocumentoFila,
  PedidoDocumentos,
} from "../interfaces/pedido-documentos.interface";
import { cobroRowKey, filaEstatus, filaFolio } from "../utils/pedidoDocumentos";
import {
  FACTURA_DOC_TIPO,
  getOrderDocumentRoute,
  hasOrderDocumentDialog,
  MOVIMIENTO_INVENTARIO_DOC_TIPO,
  PACKING_DOC_TIPO,
  PICKING_DOC_TIPO,
  SALIDA_MAQUILA_DOC_TIPO,
  type OpenOrderDocument,
} from "./orderDocumentDialogs";
import { OrderBadge, SheetSection } from "./OrderSheetPrimitives";

const DOC_LINK_CLASS =
  "group inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer font-semibold font-mono text-left transition-colors";
const DOC_TEXT_CLASS = "font-mono font-semibold text-slate-700 dark:text-slate-200";
const TH = "px-3 py-2 font-medium";
const TH_RIGHT = `${TH} text-right`;
const TD = "px-3 py-2 text-slate-600 dark:text-slate-300";
const TD_DATE = `${TD} tabular-nums whitespace-nowrap`;
const TD_AMOUNT = "px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white whitespace-nowrap";
const ROW = "hover:bg-slate-50 dark:hover:bg-white/5 transition-colors";

/** Documento abrible desde una fila: su tipo en `ORDER_DOCUMENT_DIALOGS` y su id. */
type CanOpenDoc = (tipo: string, id: number) => boolean;

/**
 * Folio de un documento: botón que abre su diálogo si el usuario puede abrirlo
 * (`canOpenOrderDocument`, la regla de su sección), texto si no.
 */
function DocFolioButton({
  tipo,
  id,
  label,
  canOpen,
  onOpenDoc,
}: {
  tipo: string;
  id: number;
  label: string;
  canOpen: CanOpenDoc;
  onOpenDoc: (doc: OpenOrderDocument) => void;
}) {
  if (!canOpen(tipo, id)) return <span className={DOC_TEXT_CLASS}>{label}</span>;
  return (
    <button
      type="button"
      onClick={() => onOpenDoc({ tipo, id })}
      className={DOC_LINK_CLASS}
      title="Ver detalle"
    >
      {label}
      <DocChevron />
    </button>
  );
}

/** Importe con su moneda (símbolo y código); sin moneda conocida, el número sin símbolo. */
function DocAmount({ value, moneda }: { value: number | string; moneda: string | null }) {
  return moneda ? (
    <KpiCurrencyAmount value={safeParseAmount(String(value))} moneda={moneda} />
  ) : (
    <>{formatAmountNoCurrency(value)}</>
  );
}

/** Un bloque de documentos: título, conteo y su tabla, o "Sin registros". */
function DocBlock({
  title,
  count,
  head,
  children,
}: {
  title: string;
  count: number;
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
        {title}{" "}
        <span className="font-normal text-slate-400 dark:text-slate-500 tabular-nums">({count})</span>
      </h3>
      {count === 0 ? (
        <EmptyLines>Sin registros</EmptyLines>
      ) : (
        <LineItemsTable head={head}>{children}</LineItemsTable>
      )}
    </div>
  );
}

/** Bloque con la forma común `{ id, folio, estatus, estatus_label, fecha }` (EC-920). */
function FilaBlock({
  title,
  tipo,
  filas,
  canOpen,
  onOpenDoc,
}: {
  title: string;
  tipo: string;
  filas: PedidoDocumentoFila[];
  canOpen: CanOpenDoc;
  onOpenDoc: (doc: OpenOrderDocument) => void;
}) {
  return (
    <DocBlock
      title={title}
      count={filas.length}
      head={
        <>
          <th className={TH}>Folio</th>
          <th className={TH}>Fecha</th>
          <th className={TH}>Estatus</th>
        </>
      }
    >
      {filas.map((fila) => {
        const estatus = filaEstatus(fila);
        return (
          <tr key={fila.id} className={ROW}>
            <td className="px-3 py-2">
              <DocFolioButton
                tipo={tipo}
                id={fila.id}
                label={filaFolio(fila)}
                canOpen={canOpen}
                onOpenDoc={onOpenDoc}
              />
            </td>
            <td className={TD_DATE}>{formatShortCalendarDate(fila.fecha)}</td>
            <td className="px-3 py-2">{estatus ? <DocEstatusBadge estatus={estatus} /> : "—"}</td>
          </tr>
        );
      })}
    </DocBlock>
  );
}

const movimientoTipoLabel = (tipo: string): string =>
  Object.hasOwn(MOVEMENT_TYPE_CONFIG, tipo)
    ? MOVEMENT_TYPE_CONFIG[tipo].label
    : tipo.charAt(0) + tipo.slice(1).toLowerCase();

const PRE_ORDEN_ORIGEN_LABEL: Record<string, string> = {
  pedido: "Pedido",
  resurtido: "Resurtido de stock",
};

export function DocumentosBlocks({
  pedidoId,
  docs,
  canOpen,
  onOpenDoc,
}: {
  pedidoId: number;
  docs: PedidoDocumentos;
  canOpen: CanOpenDoc;
  onOpenDoc: (doc: OpenOrderDocument) => void;
}) {
  // La factura abre su página (registro `ORDER_DOCUMENT_ROUTES`), no un diálogo.
  const facturaRoute = getOrderDocumentRoute(FACTURA_DOC_TIPO);
  const { salidas_maquila: salidasMaquila, facturas, cobros } = docs;
  // `total` llega `null` a quien no tiene `R-PRODUCCION-COSTOS`: entonces la
  // columna no existe (no es un total en cero).
  const showSmTotal = salidasMaquila?.some((sm) => sm.total !== null) ?? false;

  return (
    <>
      <SheetSection
        icon={<FolioIcon className="w-5 h-5" />}
        title="Ventas y compras"
        subtitle="Cotización de origen y órdenes de compra del pedido."
      >
        <div className="space-y-6">
          <FilaBlock title="Cotización" tipo="cotizacion" filas={docs.cotizaciones} canOpen={canOpen} onOpenDoc={onOpenDoc} />
          <FilaBlock title="Órdenes de compra" tipo="orden_compra" filas={docs.ordenes_compra} canOpen={canOpen} onOpenDoc={onOpenDoc} />
        </div>
      </SheetSection>

      <SheetSection
        icon={<OrdenesIcon className="w-5 h-5" />}
        title="Producción"
        subtitle="Pre-órdenes, órdenes de trabajo y salidas a maquila."
      >
        <div className="space-y-6">
          <DocBlock
            title="Pre-órdenes"
            count={docs.pre_ordenes.length}
            head={
              <>
                <th className={TH}>Pre-orden</th>
                <th className={TH}>Origen</th>
                <th className={TH}>OP</th>
                <th className={TH}>Fecha</th>
                <th className={TH}>Estatus</th>
              </>
            }
          >
            {docs.pre_ordenes.map((pre) => (
              <tr key={pre.id} className={ROW}>
                <td className="px-3 py-2">
                  <PreOrdenLink preOrden={{ id: pre.id, origen: pre.origen, referencia: "" }} />
                </td>
                <td className={TD}>
                  {Object.hasOwn(PRE_ORDEN_ORIGEN_LABEL, pre.origen)
                    ? PRE_ORDEN_ORIGEN_LABEL[pre.origen]
                    : textOrDash(pre.origen)}
                </td>
                <td className="px-3 py-2">
                  {pre.op_id !== null ? (
                    <DocFolioButton
                      tipo="orden_produccion"
                      id={pre.op_id}
                      label={pre.op_folio || `#${pre.op_id}`}
                      canOpen={canOpen}
                      onOpenDoc={onOpenDoc}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className={TD_DATE}>{formatShortCalendarDate(pre.created_at)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={pre.estatus} config={PRE_ORDER_STATUS_CFG} />
                </td>
              </tr>
            ))}
          </DocBlock>
          <FilaBlock title="Órdenes de producción" tipo="orden_produccion" filas={docs.ordenes_produccion} canOpen={canOpen} onOpenDoc={onOpenDoc} />
          <FilaBlock title="Órdenes de bordado" tipo="orden_bordado" filas={docs.ordenes_bordado} canOpen={canOpen} onOpenDoc={onOpenDoc} />
          <FilaBlock title="Órdenes de reflejante" tipo="orden_reflejante" filas={docs.ordenes_reflejante} canOpen={canOpen} onOpenDoc={onOpenDoc} />
          <FilaBlock title="Órdenes de corte de manga" tipo="orden_corte_manga" filas={docs.ordenes_corte_manga} canOpen={canOpen} onOpenDoc={onOpenDoc} />
          {/* `null` = sin `R-PRODUCCION-OP` (#1304): el bloque no existe. */}
          {salidasMaquila !== null && (
            <DocBlock
              title="Salidas a maquila"
              count={salidasMaquila.length}
              head={
                <>
                  <th className={TH}>Folio</th>
                  <th className={TH}>Origen</th>
                  <th className={TH}>Centro de confección</th>
                  <th className={TH}>Envío</th>
                  <th className={TH}>Recepción</th>
                  <th className={TH_RIGHT}>Piezas</th>
                  {showSmTotal && (
                    <th className={TH_RIGHT} title="Total del documento SM, que puede cubrir más de un pedido">
                      Total del documento SM
                    </th>
                  )}
                  <th className={TH}>Estatus</th>
                </>
              }
            >
              {salidasMaquila.map((sm) => (
                <tr key={sm.id} className={ROW}>
                  <td className="px-3 py-2">
                    <DocFolioButton
                      tipo={SALIDA_MAQUILA_DOC_TIPO}
                      id={sm.id}
                      label={sm.folio || `#${sm.id}`}
                      canOpen={canOpen}
                      onOpenDoc={onOpenDoc}
                    />
                  </td>
                  <td className={`${TD} font-mono`}>
                    {textOrDash([sm.op_folio, sm.ob_folio, sm.or_folio].filter(Boolean).join(" · "))}
                  </td>
                  <td className={TD}>{textOrDash(sm.centro_confeccion_nombre)}</td>
                  <td className={TD_DATE}>{formatShortCalendarDate(sm.fecha_envio)}</td>
                  <td className={TD_DATE}>{formatShortCalendarDate(sm.fecha_recepcion)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{formatQuantityValue(sm.total_piezas)}</td>
                  {showSmTotal && (
                    <td className={TD_AMOUNT}>{sm.total === null ? "—" : formatAmountNoCurrency(sm.total)}</td>
                  )}
                  <td className="px-3 py-2">
                    <StatusBadge status={sm.estatus} config={SALIDA_MAQUILA_STATUS_CONFIG} />
                  </td>
                </tr>
              ))}
            </DocBlock>
          )}
        </div>
      </SheetSection>

      <SheetSection
        icon={<WarehouseIcon className="w-5 h-5" />}
        title="Almacén y envíos"
        subtitle="Surtidos, embarques, despachos, envíos y movimientos de inventario."
      >
        <div className="space-y-6">
          <DocBlock
            title="Surtidos"
            count={docs.pickings.length}
            head={
              <>
                <th className={TH}>Folio</th>
                <th className={TH}>Almacén actual</th>
                <th className={TH}>Estatus</th>
              </>
            }
          >
            {docs.pickings.map((picking) => (
              <tr key={picking.id} className={ROW}>
                <td className="px-3 py-2">
                  <DocFolioButton
                    tipo={PICKING_DOC_TIPO}
                    id={picking.id}
                    label={picking.folio || `#${picking.id}`}
                    canOpen={canOpen}
                    onOpenDoc={onOpenDoc}
                  />
                </td>
                <td className={TD}>{textOrDash(picking.almacen_actual)}</td>
                <td className="px-3 py-2">
                  {picking.estado ? <DocEstatusBadge estatus={picking.estado} /> : "—"}
                </td>
              </tr>
            ))}
          </DocBlock>
          <FilaBlock title="Embarques" tipo={PACKING_DOC_TIPO} filas={docs.packings} canOpen={canOpen} onOpenDoc={onOpenDoc} />
          <DocBlock
            title="Despachos"
            count={docs.despachos.length}
            head={
              <>
                <th className={TH}>Despacho</th>
                <th className={TH}>Embarque</th>
                <th className={TH}>Guía</th>
                <th className={TH}>Envío</th>
              </>
            }
          >
            {docs.despachos.map((despacho) => (
              <tr key={despacho.id} className={ROW}>
                <td className={`px-3 py-2 ${DOC_TEXT_CLASS}`}>#{despacho.id}</td>
                <td className="px-3 py-2">
                  <DocFolioButton
                    tipo={PACKING_DOC_TIPO}
                    id={despacho.packing_id}
                    label={despacho.packing_folio || `#${despacho.packing_id}`}
                    canOpen={canOpen}
                    onOpenDoc={onOpenDoc}
                  />
                </td>
                <td className={`${TD} font-mono`}>{textOrDash(despacho.guia)}</td>
                <td className={`${TD} font-mono`}>
                  {despacho.envio_id === null ? "—" : `#${despacho.envio_id}`}
                </td>
              </tr>
            ))}
          </DocBlock>
          <DocBlock
            title="Envíos"
            count={docs.envios.length}
            head={
              <>
                <th className={TH}>Envío</th>
                <th className={TH}>Transportista</th>
              </>
            }
          >
            {docs.envios.map((envio) => (
              <tr key={envio.id} className={ROW}>
                <td className={`px-3 py-2 ${DOC_TEXT_CLASS}`}>#{envio.id}</td>
                {/* El backend solo manda el id del transportista, sin su nombre. */}
                <td className={`${TD} font-mono`}>#{envio.transportista_id}</td>
              </tr>
            ))}
          </DocBlock>
          <DocBlock
            title="Movimientos de inventario"
            count={docs.movimientos_inventario.length}
            head={
              <>
                <th className={TH}>Movimiento</th>
                <th className={TH}>Tipo</th>
                <th className={TH}>Fecha</th>
                <th className={TH}>Transferencia</th>
                <th className={TH}>Origen → destino</th>
                <th className={TH}>Observaciones</th>
              </>
            }
          >
            {docs.movimientos_inventario.map((mov) => (
              <tr key={mov.id} className={ROW}>
                <td className="px-3 py-2">
                  {/* El detalle se abre por el id del MOVIMIENTO: la respuesta
                      solo trae el folio de la TR, no su id. */}
                  <DocFolioButton
                    tipo={MOVIMIENTO_INVENTARIO_DOC_TIPO}
                    id={mov.id}
                    label={`#${mov.id}`}
                    canOpen={canOpen}
                    onOpenDoc={onOpenDoc}
                  />
                </td>
                <td className={TD}>{movimientoTipoLabel(mov.tipo_movimiento)}</td>
                <td className={TD_DATE}>{formatShortCalendarDate(mov.fecha_movimiento)}</td>
                <td className={`${TD} font-mono`}>{textOrDash(mov.transferencia_folio)}</td>
                <td className={TD}>
                  {mov.origen || mov.destino ? `${textOrDash(mov.origen)} → ${textOrDash(mov.destino)}` : "—"}
                </td>
                <td className={TD}>
                  <span className="block max-w-xs truncate" title={mov.observaciones ?? undefined}>
                    {textOrDash(mov.observaciones)}
                  </span>
                </td>
              </tr>
            ))}
          </DocBlock>
        </div>
      </SheetSection>

      {/* `null` = sin el permiso de lectura de su sección (#1304): el bloque no
          existe (no es "Sin registros"); sin los dos, tampoco la sección. */}
      {(facturas !== null || cobros !== null) && (
        <SheetSection
          icon={<FacturacionIcon className="w-5 h-5" />}
          title="Facturación y cobranza"
          subtitle="Facturas del pedido y cobros aplicados a ellas."
        >
          <div className="space-y-6">
            {facturas !== null && (
              <DocBlock
                title="Facturas"
                count={facturas.length}
                head={
                  <>
                    <th className={TH}>Folio</th>
                    <th className={TH}>Emisión</th>
                    <th className={TH}>Estatus</th>
                    <th className={TH_RIGHT}>Total</th>
                  </>
                }
              >
                {facturas.map((factura) => (
                  <tr key={factura.id} className={ROW}>
                    <td className="px-3 py-2">
                      {/* Página propia con su regla de ruta: sin acceso, texto. */}
                      {facturaRoute ? (
                        <AccessibleLink
                          href={facturaRoute.href(factura.id, pedidoId)}
                          title="Ver detalle"
                          className={DOC_LINK_CLASS}
                          fallbackClassName={DOC_TEXT_CLASS}
                        >
                          {factura.folio || `#${factura.id}`}
                        </AccessibleLink>
                      ) : (
                        <span className={DOC_TEXT_CLASS}>{factura.folio || `#${factura.id}`}</span>
                      )}
                    </td>
                    <td className={TD_DATE}>{formatShortCalendarDate(factura.fecha_emision)}</td>
                    <td className="px-3 py-2">
                      <DocEstatusBadge estatus={factura.estatus} />
                    </td>
                    <td className={TD_AMOUNT}>
                      <DocAmount value={factura.total} moneda={factura.moneda_codigo} />
                    </td>
                  </tr>
                ))}
              </DocBlock>
            )}
            {cobros !== null && (
              <DocBlock
                title="Cobros"
                count={cobros.length}
                head={
                  <>
                    <th className={TH}>Cobro</th>
                    <th className={TH}>Factura</th>
                    <th className={TH}>Fecha</th>
                    <th className={TH}>Estatus</th>
                    <th className={TH_RIGHT}>Importe aplicado</th>
                  </>
                }
              >
                {/* Sin detalle de cobro por id: texto. */}
                {cobros.map((cobro, index) => (
                  <tr key={cobroRowKey(cobro, index)} className={ROW}>
                    <td className={`px-3 py-2 ${DOC_TEXT_CLASS}`}>{cobro.folio || `#${cobro.cobro_id}`}</td>
                    <td className={`${TD} font-mono`}>{textOrDash(cobro.factura_folio)}</td>
                    <td className={TD_DATE}>{formatShortCalendarDate(cobro.fecha)}</td>
                    <td className="px-3 py-2">
                      <DocEstatusBadge estatus={cobro.estatus} />
                    </td>
                    <td className={TD_AMOUNT}>
                      <DocAmount value={cobro.importe_aplicado} moneda={cobro.moneda_codigo} />
                    </td>
                  </tr>
                ))}
              </DocBlock>
            )}
          </div>
        </SheetSection>
      )}
    </>
  );
}

/**
 * Hoja "Documentos" (EC-914): cada documento que nació del pedido, leído de
 * `GET /ventas/pedidos/{id}/documentos/` (única fuente; no lee
 * `pedido.documentos`). La consulta la monta la página y solo se enciende con
 * esta hoja activa (`usePedidoDocumentos`).
 *
 * Un bloque por tipo; una lista vacía es "Sin registros". `salidas_maquila`,
 * `facturas` y `cobros` en `null` (sin el permiso de su módulo, nucleo-erp
 * #1304) ocultan su bloque; sin facturas ni cobros, también su sección. Los documentos
 * con diálogo lo abren por el registro de la página (`onOpenDoc`), con la regla
 * de su sección (`canOpenOrderDocument`); la factura enlaza a su página con
 * `AccessibleLink`; los que no tienen detalle por id (despacho, envío, cobro)
 * quedan como texto.
 */
export function OrderDocumentsSheet({
  pedido,
  documentos,
  onOpenDoc,
}: {
  pedido: PedidoDetail;
  /** Consulta de `documentos/`, montada por la página. */
  documentos: PedidoDocumentosQuery;
  onOpenDoc: (doc: OpenOrderDocument) => void;
}) {
  const { isPending, user } = useRouteAccess();
  // Mientras la sesión carga nada se ofrece como abrible: no se sabe aún la
  // regla de cada sección.
  const canOpen: CanOpenDoc = (tipo, id) =>
    !isPending && hasOrderDocumentDialog(tipo) && canOpenOrderDocument(tipo, id, user);
  const { data, isInitialError, isDefinitiveError, isFetching, error, refetch } = documentos;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[22px] font-medium text-slate-900 dark:text-white">
          Documentos del pedido{" "}
          <span className="font-mono">{pedido.folio || `#${pedido.id}`}</span>
        </h1>
        <OrderBadge config={getPedidoEstatusConfig(pedido.estatus)} />
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {textOrDash(pedido.cliente_razon_social || pedido.cliente_nombre)}
        </span>
      </div>

      {data ? (
        <DocumentosBlocks pedidoId={pedido.id} docs={data} canOpen={canOpen} onOpenDoc={onOpenDoc} />
      ) : isDefinitiveError ? (
        <ErrorState
          title="Documentos no disponibles"
          message="El pedido ya no está disponible para tu usuario."
        />
      ) : isInitialError ? (
        <div className="space-y-4">
          <ErrorState
            title="Error al cargar los documentos"
            message={extractErrorMessage(error, "No se pudieron cargar los documentos del pedido.")}
          />
          <div className="flex justify-center">
            <Button
              type="button"
              variant="secondary"
              rounded="full"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {isFetching ? "Reintentando..." : "Reintentar"}
            </Button>
          </div>
        </div>
      ) : (
        <Loader title="Cargando documentos" message="Obteniendo los documentos del pedido..." />
      )}
    </div>
  );
}
