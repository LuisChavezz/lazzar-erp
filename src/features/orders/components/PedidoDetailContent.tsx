"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, EditIcon, PedidosIcon, TrendingUpIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { hasAnyPermission, hasPermission } from "@/src/utils/permissions";
import { routePermissions } from "@/src/constants/routePermissions";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { usePedidoDetail } from "../hooks/usePedidoDetail";
import {
  canEditPedidoMesaControl,
  canRecomprarPedido,
  isPedidoTerminal,
} from "../constants/pedidoStatus";
import {
  isPedidoDetailOrigin,
  type PedidoDetailOrigin,
} from "../constants/pedidoDetailOrigins";
import {
  buildOrderDetailSheetHref,
  resolveOrderDetailSheet,
  type OrderDetailSearchParams,
  type OrderDetailSheet,
} from "../constants/orderDetailSheets";
import { canSeeAccounting } from "../utils/orderAccounting";
import { OrderMainSheet } from "./OrderMainSheet";
import { OrderProgressSheet } from "./OrderProgressSheet";
import { OrderRecompraAction } from "./OrderRecompraAction";
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
  // (`PurchaseOrderPageContent`, por su `pedido_vinculado`) vuelve al listado
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
 * Regla del proxy que cubre /sales/quotes/{id}/edit, resuelta con la MISMA
 * búsqueda que `src/proxy.ts` (primera coincidencia de `prefix` exacto o
 * `prefix/`). El id es un ejemplo: la regla no depende de él. Si cambia el
 * mapa en `routePermissions`, esto lo sigue sin tocar este archivo.
 */
const QUOTE_EDIT_SAMPLE_PATH = "/sales/quotes/0/edit";
const QUOTE_EDIT_ROUTE_RULE = routePermissions.find(
  ({ prefix }) =>
    QUOTE_EDIT_SAMPLE_PATH === prefix || QUOTE_EDIT_SAMPLE_PATH.startsWith(`${prefix}/`),
);

function canAccessQuoteEditRoute(
  user: Parameters<typeof hasPermission>[1],
): boolean {
  if (!QUOTE_EDIT_ROUTE_RULE) return true;
  const { permission } = QUOTE_EDIT_ROUTE_RULE;
  return hasAnyPermission(Array.isArray(permission) ? permission : [permission], user);
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
  const { data, isLoading, isError, error } = usePedidoDetail(numericId);
  const { data: session } = useSession();
  const pathname = usePathname();
  const sheet = resolveOrderDetailSheet(rawSheet);
  // Permiso del catálogo. OJO: el backend NO lo valida en el endpoint de
  // edición —exige el ROL `MESA-DE-CONTROL`—, así que esto gobierna la UI y la
  // frontera real es el rol. Ver `pedidoEditAccess.server.ts`.
  const canEditMesaControl = hasPermission("E-MESACONTROL-PEDIDOS", session?.user);
  // Recompra aterriza en /sales/quotes/{id}/edit, así que exige EXACTAMENTE lo
  // que exige esa ruta; si no, el usuario crearía la cotización y rebotaría
  // DESPUÉS, dejándola huérfana:
  //   - la regla del proxy para esa ruta (hoy "/sales/quotes" →
  //     R-CRM-COTIZACIONES), derivada de `routePermissions` en vez de repetir
  //     el código;
  //   - E-CRM-COTIZACIONES, el guard de la página (`quoteEditAccess.server`).
  // No se pide `C-CRM-COTIZACIONES`: ningún rol lo tiene (tampoco "Ventas").
  const canRecomprar =
    canAccessQuoteEditRoute(session?.user) &&
    hasPermission("E-CRM-COTIZACIONES", session?.user);

  // Documento abierto (`null` = cerrado). Un solo estado para todos los tipos
  // navegables; el diálogo se resuelve del registro según `openDoc.tipo`.
  const [openDoc, setOpenDoc] = useState<OpenOrderDocument | null>(null);
  // Al cambiar de hoja (botón, atrás/adelante del navegador) el documento
  // abierto se cierra en el mismo render: los diálogos se abren desde la hoja
  // de Avances y no deben quedarse colgados sobre la otra.
  const [renderedSheet, setRenderedSheet] = useState<OrderDetailSheet>(sheet);
  if (renderedSheet !== sheet) {
    setRenderedSheet(sheet);
    setOpenDoc(null);
  }
  const OpenDocDialog =
    openDoc && hasOrderDocumentDialog(openDoc.tipo) ? ORDER_DOCUMENT_DIALOGS[openDoc.tipo] : null;

  // `from` viene crudo de la URL: el guard lo compara contra la lista de
  // orígenes (no contra las llaves del objeto), así que `?from=constructor`
  // (o `toString`, `valueOf`) no resuelve a una función heredada de
  // `Object.prototype`. Faltante o desconocido → `DEFAULT_BACK`.
  const back = isPedidoDetailOrigin(from) ? BACK_TARGETS[from] : DEFAULT_BACK;

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

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <Loader title="Cargando pedido" message="Obteniendo detalle del pedido..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full space-y-6">
        <div>{BackLink}</div>
        <ErrorState
          title="Error al cargar el pedido"
          message={(error as Error)?.message}
        />
      </div>
    );
  }

  const showAccounting = canSeeAccounting(data);
  // Edición en línea de Fecha confirmada y Clasificación: permiso de Mesa de
  // Control y pedido no terminado. Independiente de `canEditPedidoMesaControl`,
  // que gobierna el botón Editar (guardado destructivo) con su propia regla.
  const canEditHeader = canEditMesaControl && !isPedidoTerminal(data.estatus);
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
        </div>
      </div>

      {sheet === "order" ? (
        <OrderMainSheet
          pedido={data}
          showAccounting={showAccounting}
          canEditHeader={canEditHeader}
        />
      ) : (
        <OrderProgressSheet pedido={data} onOpenDoc={setOpenDoc} />
      )}

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
