"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeftIcon,
  BanIcon,
  EditIcon,
  PedidosIcon,
  RefreshIcon,
  TrendingUpIcon,
} from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { hasPermission } from "@/src/utils/permissions";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { usePedidoDetailPage } from "../hooks/usePedidoDetail";
import { useSampleSkuLinking } from "../hooks/useSampleSkuLinking";
import {
  canEditPedidoMesaControl,
  canRecomprarPedido,
  isPedidoTerminal,
  PEDIDO_ESTATUS,
} from "../constants/pedidoStatus";
import {
  INVOICE_ORIGIN_ID_PARAM,
  INVOICE_ORIGIN_SHEET_PARAM,
  OPPORTUNITY_ORIGIN_ID_PARAM,
  isPedidoDetailOrigin,
  type PedidoDetailOrigin,
} from "../constants/pedidoDetailOrigins";
import {
  buildInvoiceDetailHref,
  invoiceDetailPath,
} from "@/src/features/invoicing/constants/invoiceDetailOrigins";
import {
  OPPORTUNITIES_LIST_PATH,
  OPPORTUNITY_LIST_PARAM,
  opportunityDetailPath,
} from "@/src/features/opportunities/constants/opportunityRoutes";
import {
  opportunityDetailHref,
  readOpportunityListParam,
} from "@/src/features/opportunities/utils/opportunityListQuery";
import { parsePositiveId } from "@/src/utils/parsePositiveId";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { canLandOnQuoteEdit } from "@/src/features/quotes/utils/quoteEditRouteAccess";
import { resolveInvoiceDetailSheet } from "@/src/features/invoicing/constants/invoiceDetailSheets";
import {
  buildOrderDetailSheetHref,
  resolveOrderDetailSheet,
  type OrderDetailSearchParams,
  type OrderDetailSheet,
} from "../constants/orderDetailSheets";
import type { SampleSkuLinkBlock } from "../constants/sampleSkuLinking";
import { canSeeAccounting } from "../utils/orderAccounting";
import { isSampleLine } from "../utils/orderLines";
import { OrderMainSheet } from "./OrderMainSheet";
import { OrderProgressSheet } from "./OrderProgressSheet";
import { OrderRecompraAction } from "./OrderRecompraAction";
import { PedidoCancelDialog, type PedidoCancelTarget } from "./PedidoCancelDialog";
import { SampleSkuLinkDialog, SampleSkuSizeCatalogPrefetch } from "./SampleSkuLinkDialog";
import {
  hasOrderDocumentDialog,
  ORDER_DOCUMENT_DIALOGS,
  type OpenOrderDocument,
} from "./orderDocumentDialogs";

// ── Navegación "Volver" según el módulo de origen (?from=) ───────────────────
// La ruta es neutra, así que el destino de "Volver" lo decide quien enlazó.
// Sin `?from=` válido cae en `home` (ver abajo), no en un listado de módulo.
// Las llaves salen de `PEDIDO_DETAIL_ORIGINS`: el `Record` exige un destino por
// cada origen declarado y rechaza llaves que no lo estén.
const BACK_TARGETS: Record<PedidoDetailOrigin, { href: string; label: string }> = {
  operations: { href: "/operations/orders", label: "Volver a Mesa de Control" },
  // Quien llega desde "Pedidos programados" vuelve a ESA lista, no a "Pedidos".
  // Misma convención de llave por ORIGEN concreto que `embroidery`.
  "scheduled-orders": {
    href: "/operations/scheduled-orders",
    label: "Volver a Pedidos Programados",
  },
  // Sin esta entrada, un usuario solo-WMS caería en /operations/orders y el
  // proxy lo rebotaría al home por falta de R-MESACONTROL.
  wms: { href: "/wms/orders", label: "Volver a Pedidos" },
  // Folio de pedido en las tablas de Surtido/Embarque/Envíos (`PedidoFolioLink`):
  // cada una vuelve a SU listado. Misma convención de llave por ORIGEN concreto
  // que `embroidery`.
  picking: { href: "/wms/picking", label: "Volver a Surtido" },
  packing: { href: "/wms/packing", label: "Volver a Embarque" },
  shipping: { href: "/wms/shipping", label: "Volver a Envíos" },
  procurement: { href: "/procurement/orders", label: "Volver a Compras" },
  sales: { href: "/sales/orders", label: "Volver a Mis Pedidos" },
  // Mismo motivo que `wms`: sin esta entrada, quien llega desde el detalle de
  // una orden de bordado caería en /operations/orders y el proxy lo rebotaría
  // al home por falta de R-MESACONTROL. La llave nombra el ORIGEN concreto
  // (`embroidery`) y no el módulo (`manufacturing`), porque Producción tiene
  // varias listas que pueden enlazar aquí y cada una vuelve a la suya.
  embroidery: {
    href: "/manufacturing/embroidery",
    label: "Volver a Órdenes de Bordado",
  },
  // Igual que `embroidery`, y con la misma llave por ORIGEN concreto: quien
  // llega desde el detalle de una orden de reflejante
  // (`ReflectiveOrderDetailContent`) vuelve a SU listado, no al de bordado ni a
  // Mesa de Control.
  reflective: {
    href: "/manufacturing/reflective-orders",
    label: "Volver a Órdenes de Reflejante",
  },
  // Igual que las dos anteriores: quien llega desde el detalle de una orden de
  // corte de manga (`CorteMangaOrderPageContent`) vuelve a SU listado.
  "corte-manga": {
    href: "/manufacturing/corte-manga",
    label: "Volver a Órdenes de Corte de Manga",
  },
  // Igual que las tres anteriores: quien llega desde el detalle de una orden de
  // producción (`ProductionOrderPageContent`) vuelve a SU listado.
  "production-orders": {
    href: "/manufacturing/production-orders",
    label: "Volver a Órdenes de Producción",
  },
  // Quien llega desde el detalle de una orden de COMPRA
  // (`PurchaseOrderPageContent`, por sus `pedidos_vinculados`) vuelve al listado
  // de órdenes de compra. Nótese que NO es la llave `procurement` de arriba:
  // esa apunta a `/procurement/orders`, el listado de PEDIDOS del módulo de
  // Compras, que es otra pantalla. Misma convención de llave por ORIGEN
  // concreto que `embroidery`/`reflective`/`corte-manga`.
  "purchase-orders": {
    href: "/procurement/purchase-orders",
    label: "Volver a Órdenes de Compra",
  },
  // Quien llega desde los pedidos recientes del detalle de un cliente
  // (`CustomerResumenPedidos`) vuelve al listado de clientes. La tabla es estática,
  // así que no puede volver al cliente CONCRETO.
  customers: { href: "/sales/customers", label: "Volver a Clientes" },
  // Quien llega desde el detalle de una factura con su id (`?factura=`) vuelve a
  // ESA factura: el destino real lo arma `resolveBack` con el id validado. Esta
  // entrada fija es el respaldo cuando el id falta o no es válido.
  invoice: { href: "/finance/invoicing", label: "Volver a Facturación" },
  // Igual que `invoice`: quien llega desde las cotizaciones del detalle de una
  // oportunidad con su id (`?oportunidad=`) vuelve a ESA oportunidad
  // (`resolveBack`). Esta entrada fija es el respaldo sin id válido.
  opportunities: { href: OPPORTUNITIES_LIST_PATH, label: "Volver a Oportunidades" },
  // Quien llega desde la campana (`cotizacion_autorizada`, que solo recibe el
  // VENDEDOR) vuelve a su listado de pedidos, donde está el que se acaba de
  // generar: la campana no tiene página propia a la que volver. Sin
  // R-CRM-PEDIDOS cae al Home (`resolveBack`).
  notifications: { href: "/sales/orders", label: "Volver a Mis Pedidos" },
  // Destino universal: el Home no exige ningún permiso de módulo, así que sirve
  // como salida para quien llega sin `?from=` (URL pegada, recarga, enlace
  // externo). También es válido como valor explícito de `?from=home`.
  home: { href: "/", label: "Volver al inicio" },
};
// Fallback cuando `?from=` falta o no es una llave conocida. Apunta al Home y
// NO a un listado de módulo: la regla "/orders" admite once permisos distintos,
// así que cualquier listado concreto (antes /operations/orders) rebotaría al
// home a la mayoría de los usuarios que sí pueden ver esta pantalla.
const DEFAULT_BACK = BACK_TARGETS.home;

/**
 * "Volver" final. El origen `invoice` vuelve a la factura de `?factura=` (y a
 * su hoja de `?factura_sheet=`, validada contra la lista de hojas); nunca se
 * copia la query a un `href`, solo primitivos validados. Sin id válido cae a su
 * entrada fija de `BACK_TARGETS`. Si el usuario no puede abrir el detalle de
 * factura (un enlace compartido a quien no tiene facturación), cae al destino
 * por defecto, como sin origen: nunca a una ruta que el proxy rebotaría.
 *
 * El origen `opportunities` sigue la misma regla con `?oportunidad=`, y
 * devuelve al detalle el estado de SU listado (`?lista=`, validado con la
 * definición de ese listado) para que desde ahí se pueda seguir volviendo.
 */
function resolveBack(
  from: string | undefined,
  searchParams: OrderDetailSearchParams,
  canOpen: (pathname: string) => boolean,
): { href: string; label: string } {
  if (!isPedidoDetailOrigin(from)) return DEFAULT_BACK;
  if (from === "invoice") {
    const facturaId = parsePositiveId(searchParams[INVOICE_ORIGIN_ID_PARAM]);
    if (facturaId === null) {
      return canOpen(BACK_TARGETS.invoice.href) ? BACK_TARGETS.invoice : DEFAULT_BACK;
    }
    if (!canOpen(invoiceDetailPath(facturaId))) return DEFAULT_BACK;
    const rawSheet = searchParams[INVOICE_ORIGIN_SHEET_PARAM];
    const sheet = resolveInvoiceDetailSheet(Array.isArray(rawSheet) ? rawSheet[0] : rawSheet);
    return {
      href: buildInvoiceDetailHref(facturaId, {}, sheet),
      label: "Volver a la Factura",
    };
  }
  if (from === "opportunities") {
    const oportunidadId = parsePositiveId(searchParams[OPPORTUNITY_ORIGIN_ID_PARAM]);
    if (oportunidadId === null) {
      return canOpen(BACK_TARGETS.opportunities.href) ? BACK_TARGETS.opportunities : DEFAULT_BACK;
    }
    if (!canOpen(opportunityDetailPath(oportunidadId))) return DEFAULT_BACK;
    return {
      href: opportunityDetailHref(
        oportunidadId,
        readOpportunityListParam(searchParams[OPPORTUNITY_LIST_PARAM]),
      ),
      label: "Volver a la Oportunidad",
    };
  }
  // Cualquier destino fijo pasa por la misma regla que el proxy: sin acceso al
  // módulo de origen, "Volver" lleva al Home en vez de a una ruta que rebota.
  const target = BACK_TARGETS[from];
  return canOpen(target.href) ? target : DEFAULT_BACK;
}

// ── Componente principal ─────────────────────────────────────────────────────

interface PedidoDetailContentProps {
  pedidoId: string;
  from?: string;
  /** Valor crudo de `?sheet=`; desconocido o ausente → hoja "Pedido". */
  sheet?: string;
  /** Parámetros actuales de la URL, para cambiar de hoja sin perder `from`. */
  searchParams: OrderDetailSearchParams;
}

/**
 * Detalle de pedido en DOS hojas sobre la misma página:
 *
 * - "Pedido" (`OrderMainSheet`, por defecto): el pedido con el formato del
 *   formulario de cotización, en solo lectura.
 * - "Avances" (`OrderProgressSheet`): surtido y documentos relacionados.
 *
 * La hoja activa vive en la URL (`?sheet=`, ver `orderDetailSheets`): sobrevive
 * a la recarga y cambiarla conserva `from` y el resto de parámetros. Esta
 * página solo compone: "Volver", las acciones de la barra superior (iguales en
 * ambas hojas), el cambio de hoja, los estados de carga/error y el diálogo de
 * documento, cuyo estado vive AQUÍ —por encima de las hojas— y se cierra al
 * cambiar de hoja.
 */
export function PedidoDetailContent({
  pedidoId,
  from,
  sheet: rawSheet,
  searchParams,
}: PedidoDetailContentProps) {
  const numericId = Number(pedidoId);
  const { data, isLoading, isInitialError, isFetching, error, refetch } =
    usePedidoDetailPage(numericId);
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const sheet = resolveOrderDetailSheet(rawSheet);
  // Permiso del catálogo. OJO: el backend NO lo valida en las acciones de mesa
  // de control —exige superuser, `is_admin_empresa` o un rol activo cuya clave
  // de departamento sea exactamente `MESACONTROL`—, así que esto solo gobierna
  // la UI; un desajuste llega como el 400 `permiso` del backend. Ver
  // `pedidoEditAccess.server.ts`.
  const canEditMesaControl = hasPermission("E-MESACONTROL-PEDIDOS", session?.user);
  // Recompra aterriza en /sales/quotes/{id}/edit, así que exige EXACTAMENTE lo
  // que exige esa ruta (regla del proxy + guard de la página, ver
  // `canLandOnQuoteEdit`); si no, el usuario crearía la cotización y rebotaría
  // DESPUÉS, dejándola huérfana.
  const canRecomprar = canLandOnQuoteEdit(session?.user);

  // Documento abierto (`null` = cerrado). Un solo estado para todos los tipos
  // navegables; el diálogo se resuelve del registro según `openDoc.tipo`.
  const [openDoc, setOpenDoc] = useState<OpenOrderDocument | null>(null);
  // Línea de muestra cuyo diálogo de SKU está abierto (`null` = cerrado). Se
  // guarda el ID y no la línea: el diálogo la lee del detalle vigente, así que
  // refleja cada relectura (p. ej. la que sigue a vincular una talla).
  const [sampleSkuLineId, setSampleSkuLineId] = useState<number | null>(null);
  // Pedido cuyo diálogo de cancelación está abierto (`null` = cerrado).
  const [cancelTarget, setCancelTarget] = useState<PedidoCancelTarget | null>(null);
  // Ya cancelado, a la espera de que termine la navegación de salida: la página
  // deja de ofrecer acciones y hojas, que volverían a pedir el pedido (404).
  const [cancelled, setCancelled] = useState(false);
  // La vinculación (corrida en curso, avance, resultados) vive AQUÍ y no en el
  // diálogo: así el diálogo se puede cerrar —o la hoja cambiar— a media corrida
  // sin perderla, y la celda SKU de la tabla ve el mismo avance.
  const sampleSkuLinking = useSampleSkuLinking({
    pedidoId: numericId,
    cotizacionId: data?.cotizacion ?? null,
  });
  // Al cambiar de hoja (botón, atrás/adelante del navegador) el documento
  // abierto se cierra en el mismo render: cada diálogo se abre desde UNA hoja
  // (los documentos, desde Avances; el SKU de muestra, desde Pedido) y no debe
  // quedarse colgado sobre la otra.
  const [renderedSheet, setRenderedSheet] = useState<OrderDetailSheet>(sheet);
  if (renderedSheet !== sheet) {
    setRenderedSheet(sheet);
    setOpenDoc(null);
    setSampleSkuLineId(null);
  }
  const OpenDocDialog =
    openDoc && hasOrderDocumentDialog(openDoc.tipo) ? ORDER_DOCUMENT_DIALOGS[openDoc.tipo] : null;

  // `from` viene crudo de la URL: el guard lo compara contra la lista de
  // orígenes (no contra las llaves del objeto), así que `?from=constructor`
  // (o `toString`, `valueOf`) no resuelve a una función heredada de
  // `Object.prototype`. Faltante o desconocido → `DEFAULT_BACK`.
  const back = resolveBack(from, searchParams, (pathname) =>
    canAccessRoute(pathname, session?.user),
  );

  const BackLink = (
    <Link
      href={back.href}
      // Misma pastilla en ambos temas: un tono sobre la superficie de la tarjeta
      // (antes `bg-slate-50` se fundía con el fondo claro y solo se veía en
      // oscuro).
      className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10"
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span className="text-sm font-medium">{back.label}</span>
    </Link>
  );

  // Tras cancelar, el pedido ya no existe para el backend (su detalle responde
  // 404): se sale a "Volver". `replace` para que el botón Atrás del navegador no
  // regrese a él. Va en TODAS las ramas de abajo: si un 404 llega a media
  // cancelación y la página cambia de rama, el diálogo sigue montado y la
  // navegación no se pierde. Las consultas del pedido salen de la caché cuando
  // esta página se desmonta (`useCancelPedido`).
  const cancelDialog = (
    <PedidoCancelDialog
      pedido={cancelTarget}
      onClose={() => setCancelTarget(null)}
      onCancelled={() => {
        setCancelled(true);
        router.replace(back.href);
      }}
    />
  );

  if (Number.isNaN(numericId) || numericId <= 0) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Pedido no válido"
          message="El identificador del pedido no es válido."
        />
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader title="Pedido cancelado" message="Volviendo..." />
        {cancelDialog}
      </div>
    );
  }

  // 404: el pedido no existe, es de otra empresa o se desactivó. Reintentar no
  // cambiaría nada, así que no se ofrece (mismo criterio que el detalle de
  // factura). Aplica también si el 404 llega en un refetch.
  if (isNotFoundError(error)) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Pedido no encontrado"
          message="El pedido no existe o no pertenece a tu empresa."
        />
        {cancelDialog}
      </div>
    );
  }

  // Solo la carga INICIAL fallida cambia la página por el error. Un refetch
  // fallido con datos en caché (p. ej. la relectura tras guardar un editor de
  // la cabecera) conserva la página y avisa por toast (`usePedidoDetailPage`).
  if (isInitialError) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Error al cargar el pedido"
          message={extractErrorMessage(error, "No se pudo cargar la información.")}
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
        {cancelDialog}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader title="Cargando pedido" message="Obteniendo detalle del pedido..." />
        {cancelDialog}
      </div>
    );
  }

  const showAccounting = canSeeAccounting(data);
  // Edición en línea de Fecha confirmada y Clasificación: permiso de Mesa de
  // Control y pedido no terminado. Independiente de `canEditPedidoMesaControl`,
  // que gobierna el botón Editar (guardado destructivo) con su propia regla.
  const canEditHeader = canEditMesaControl && !isPedidoTerminal(data.estatus);
  // Vincular SKU de muestra: misma regla que la edición en línea de la
  // cabecera (`canEditHeader`), partida en sus dos motivos para poder decirle
  // al usuario cuál aplica. Solo gobierna las ACCIONES; los indicadores, el
  // aviso y el diálogo se ven siempre, en solo lectura.
  const sampleSkuLinkBlock: SampleSkuLinkBlock | null = isPedidoTerminal(data.estatus)
    ? "closed"
    : canEditMesaControl
      ? null
      : "permission";
  // La línea se resuelve del detalle vigente. Si una relectura la quita (o deja
  // de ser muestra), el diálogo se cierra en este mismo render en vez de quedar
  // con un id que podría reabrirlo solo más adelante.
  const sampleSkuLine =
    sampleSkuLineId === null
      ? null
      : (data.detalles.find((linea) => linea.id === sampleSkuLineId && isSampleLine(linea)) ??
        null);
  if (sampleSkuLineId !== null && sampleSkuLine === null) {
    setSampleSkuLineId(null);
  }
  // Cambio de hoja: enlace real que conserva `from` y el resto de la query.
  const sheetSwitch =
    sheet === "order"
      ? {
          href: buildOrderDetailSheetHref(pathname, searchParams, "progress"),
          label: "Ver Avances",
          icon: <TrendingUpIcon className="w-4 h-4" aria-hidden="true" />,
        }
      : {
          href: buildOrderDetailSheetHref(pathname, searchParams, "order"),
          label: "Ver Pedido",
          icon: <PedidosIcon className="w-4 h-4" aria-hidden="true" />,
        };

  return (
    <div className="w-full space-y-6">
      {/* ── Barra superior: "Volver" + cambio de hoja + acciones ───────────
          Tarjeta flotante con los mismos tokens que las secciones de la hoja
          (`SheetSection`: radio, borde y superficie), en versión
          semitransparente con desenfoque para que el contenido que pasa por
          debajo no se lea a través. `top-3`: al quedar fija deja un hueco, así
          que esquinas y borde siguen visibles. `z-10` la deja sobre el
          contenido y debajo de diálogos y popovers (van en portal). */}
      <div className="sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 dark:border-white/5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-sm dark:shadow-none px-6 md:px-8 py-3">
        {BackLink}
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={sheetSwitch.href} className="inline-flex items-center gap-2">
              {sheetSwitch.icon}
              {sheetSwitch.label}
            </Link>
          </Button>
          {/* Recompra: NO depende de `data.cotizacion` (el backend clona el
              pedido mismo, tenga o no cotización de origen). */}
          {canRecomprar && canRecomprarPedido(data.estatus) && (
            <OrderRecompraAction pedidoId={data.id} pedidoFolio={data.folio} />
          )}
          {/* Editar por Mesa de Control. Tres condiciones, todas necesarias:
              el PERMISO (`hasPermission` ya cortocircuita para "admin"), tener
              cotización de origen —sin ella el endpoint responde 400, porque su
              contrato es editar-y-espejar— y un `estatus` editable (un pedido
              CANCELADO no se toca). */}
          {canEditMesaControl && data.cotizacion && canEditPedidoMesaControl(data.estatus) && (
            <Button asChild variant="primary">
              <Link
                href={`/orders/${data.id}/edit-mesa-control`}
                className="inline-flex items-center gap-2"
              >
                <EditIcon className="w-4 h-4" aria-hidden="true" />
                Editar
              </Link>
            </Button>
          )}
          {/* Cancelar: mismo permiso que Editar. Un CANCELADO legado
              (`activo = true`, de antes de `/cancelar/`) no lo ofrece. */}
          {canEditMesaControl && data.estatus !== PEDIDO_ESTATUS.CANCELADO && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCancelTarget({ id: data.id, folio: data.folio })}
              className="inline-flex items-center gap-2"
            >
              <BanIcon className="w-4 h-4" aria-hidden="true" />
              Cancelar pedido
            </Button>
          )}
        </div>
      </div>

      {sheet === "order" ? (
        <OrderMainSheet
          pedido={data}
          showAccounting={showAccounting}
          canEditHeader={canEditHeader}
          sampleSkus={{
            onOpen: setSampleSkuLineId,
            block: sampleSkuLinkBlock,
            runningLineaIds: sampleSkuLinking.runningLineaIds,
            runProgress: sampleSkuLinking.runProgress,
            bulkRuns: sampleSkuLinking.bulkRuns,
            linkedSkus: sampleSkuLinking.linkedSkus,
            hasPendingSingle: sampleSkuLinking.pendingTallaIds.length > 0,
            onLinkAll: sampleSkuLinking.linkAll,
          }}
        />
      ) : (
        <OrderProgressSheet
          pedido={data}
          showAccounting={showAccounting}
          onOpenDoc={setOpenDoc}
        />
      )}

      {/* El diálogo de SKU de muestra ordena sus filas con el catálogo de
          tallas: se pide desde que carga el pedido (solo si tiene muestras)
          para que esté listo al abrirlo. */}
      {data.detalles.some(isSampleLine) && <SampleSkuSizeCatalogPrefetch />}

      {/* SKU de muestra por talla de una línea (se monta solo al abrir). */}
      {sampleSkuLine && (
        <SampleSkuLinkDialog
          linea={sampleSkuLine}
          block={sampleSkuLinkBlock}
          run={sampleSkuLinking.bulkRuns[sampleSkuLine.id]}
          runningLineaIds={sampleSkuLinking.runningLineaIds}
          runProgress={sampleSkuLinking.runProgress}
          pendingTallaIds={sampleSkuLinking.pendingTallaIds}
          onLinkOne={(tallaId) => sampleSkuLinking.linkOne(sampleSkuLine.id, tallaId)}
          onLinkAll={(tallaIds) =>
            sampleSkuLinking.linkAll([{ lineaId: sampleSkuLine.id, tallaIds }])
          }
          open={true}
          onOpenChange={(open) => {
            if (!open) setSampleSkuLineId(null);
          }}
        />
      )}

      {cancelDialog}

      {/* Detalle del documento (se monta solo al abrir; cada diálogo trae su
          propio detalle por id). El componente se resuelve del registro. */}
      {openDoc && OpenDocDialog && (
        <OpenDocDialog
          orderId={openDoc.id}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenDoc(null);
          }}
        />
      )}
    </div>
  );
}
