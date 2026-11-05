import type { QuoteDetailSource } from "@/src/features/quotes/hooks/useQuote";
import {
  pedidoDetailHref,
  pedidoDetailPath,
  type PedidoDetailOrigin,
} from "@/src/features/orders/constants/pedidoDetailOrigins";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { canAccessRoute } from "@/src/utils/routeAccess";
import {
  TIPO_COTIZACION_AUTORIZADA,
  TIPO_COTIZACION_EN_REVISION,
  TIPO_COTIZACION_RECHAZADA,
  type Notificacion,
} from "../interfaces/notification.interface";

/**
 * Destino al que lleva una notificación al hacer clic.
 *
 * Una cotización se abre con `quote-dialog` y no con una ruta:
 * `/sales/quotes/[id]` NO EXISTE (en disco solo está `/sales/quotes/[id]/edit`),
 * y no todos los destinatarios podrían entrar a la edición —el rol
 * MESA-DE-CONTROL, que recibe `cotizacion_en_revision`, no tiene
 * `R-CRM-COTIZACIONES` y `proxy.ts` lo rebotaría—; además una cotización
 * rechazada se consulta, no se edita, desde la campana. El repo ya resolvió
 * esto igual en `search/components/GlobalSearchPalette.tsx`: el diálogo
 * self-fetching `QuoteDetailByIdDialog`. `source` es por `tipo` (y, dentro de
 * un `tipo`, por rol), porque depende de quién recibe la notificación (ver el
 * mapa de abajo).
 *
 * `route` lleva un `href` con query; su `pathname` es el que se evalúa contra
 * la regla del proxy (ver `resolveNotificationTarget`).
 */
export type NotificationTarget =
  | { kind: "route"; href: string; pathname: string }
  | { kind: "quote-dialog"; quoteId: number; source: QuoteDetailSource };

/**
 * Lee un id (entero positivo) de un `data` sin forma garantizada. Cualquier
 * otra cosa —clave ausente, `null`, texto, 0, negativo, decimal— es `null`, y
 * con ella el destino entero: nunca se arma una URL ni se abre un diálogo con
 * un id que no puede existir.
 */
const readPositiveId = (data: unknown, key: string): number | null => {
  if (typeof data !== "object" || data === null) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
};

/** Origen del detalle 360° cuando se llega desde la campana. */
const PEDIDO_DETAIL_FROM: PedidoDetailOrigin = "notifications";

const pedidoDetailTarget = (pedidoId: number): NotificationTarget => ({
  kind: "route",
  href: pedidoDetailHref(pedidoId, PEDIDO_DETAIL_FROM),
  pathname: pedidoDetailPath(pedidoId),
});

type TargetResolver = (
  data: unknown,
  user?: PermissionContext | null,
) => NotificationTarget | null;

/**
 * Mapa `tipo` → destino. Vive SOLO en el frontend: el backend no manda ruta y
 * no se va a cambiar para que lo haga.
 *
 * Un `tipo` ausente del mapa —o presente pero con un `data` que no trae lo que
 * necesita— resuelve `null`: la notificación se pinta normal pero no es
 * clicable. Es la garantía de que un `tipo` nuevo del backend nunca rompa la
 * UI ni navegue a ninguna parte.
 */
const NOTIFICATION_TARGETS: Record<string, TargetResolver> = {
  /*
    El backend la emite en un solo punto —el paso a estatus 2 de una
    cotización— con `crear_notificacion_por_rol(codigo_rol="MESA-DE-CONTROL",
    clave_departamento=CLAVE_DEPARTAMENTO_MESA_CONTROL)`: una fila por cada
    usuario ACTIVO de ese departamento en la empresa. No excluye a quien la
    envió, así que un miembro de mesa de control que es el vendedor también la
    recibe. Y sobrevive al cambio de estatus: nada la borra al autorizar.

    Ningún recurso cubre a todos sus destinatarios (ver `ventas.scope`):
    `/ventas/mesa-control/{id}/` sirve empresa y estatus [2, 5] a admins y al
    departamento; `/ventas/cotizaciones/{id}/` sirve la empresa entera a un
    admin y, a cualquier otro, solo lo que él vendió. Por eso se lee con
    respaldo ante un 404, y el ROL elige solo el orden —el que acierta a la
    primera en el caso común—:

    - `role === "admin"` (`is_admin_empresa` o superuser, `getSessionRole`):
      primero cotizaciones, que para él contiene lo de mesa-control.
    - Cualquier otro, o sin sesión cargada todavía (`user` ausente): primero
      mesa-control; si la cotización ya salió de [2, 5], cotizaciones la sirve
      a su vendedor y a un admin cuya sesión aún no se leía.

    Un `tipo` futuro debe declarar su propio `source`, no heredar este.
  */
  [TIPO_COTIZACION_EN_REVISION]: (data, user) => {
    const quoteId = readPositiveId(data, "cotizacion_id");
    if (quoteId === null) return null;
    return {
      kind: "quote-dialog",
      quoteId,
      source:
        user?.role === "admin" ? "cotizaciones-o-mesa-control" : "mesa-control-o-cotizaciones",
    };
  },
  /*
    Destinatario: el VENDEDOR de la cotización (`crear_notificacion_usuario`
    al autorizar). Lo útil es el pedido que nació de ella, no la cotización ya
    cerrada. `/ventas/pedidos/{id}/` acota por empresa, no por vendedor, así
    que el id basta; `pedido_folio` no hace falta para navegar.
  */
  [TIPO_COTIZACION_AUTORIZADA]: (data) => {
    const pedidoId = readPositiveId(data, "pedido_id");
    return pedidoId === null ? null : pedidoDetailTarget(pedidoId);
  },
  /*
    Destinatario: el VENDEDOR. `"cotizaciones"` es el recurso que le responde a
    él a cualquier estatus (filtra por `vendedor=user`); mesa-control solo
    cubre 2 y 5 y aquí la cotización acaba de quedar en 4. El diálogo muestra
    el `motivo_rechazo` completo, que la fila recorta a dos líneas.
  */
  [TIPO_COTIZACION_RECHAZADA]: (data) => {
    const quoteId = readPositiveId(data, "cotizacion_id");
    return quoteId === null
      ? null
      : { kind: "quote-dialog", quoteId, source: "cotizaciones" };
  },
};

/**
 * Destino de la notificación para `user`, o `null` si no es clicable.
 *
 * Una RUTA que el proxy rebotaría al Home (sin el permiso de su regla en
 * `routePermissions`) también resuelve `null`: la fila se pinta pero no se
 * abre, mismo criterio que `canOpenSearchApertura` del buscador global. Un
 * diálogo no tiene regla de ruta: se abre como siempre.
 */
export const resolveNotificationTarget = (
  notificacion: Notificacion,
  user?: PermissionContext | null,
): NotificationTarget | null => {
  const target =
    NOTIFICATION_TARGETS[notificacion.tipo]?.(notificacion.data, user) ?? null;
  if (target?.kind === "route" && !canAccessRoute(target.pathname, user)) {
    return null;
  }
  return target;
};

/** Variantes visuales que ya soporta `NotificationIcon`. */
export type NotificationIconVariant = "error" | "success" | "info";

/**
 * Mapa `tipo` → variante del icono. El `tipo` del backend describe un evento de
 * negocio, no una severidad, así que la traducción es del cliente. Cualquier
 * `tipo` desconocido cae en `info`.
 */
const NOTIFICATION_ICON_VARIANTS: Record<string, NotificationIconVariant> = {
  [TIPO_COTIZACION_EN_REVISION]: "info",
  [TIPO_COTIZACION_AUTORIZADA]: "success",
  [TIPO_COTIZACION_RECHAZADA]: "error",
};

export const resolveNotificationIconVariant = (
  tipo: string,
): NotificationIconVariant => NOTIFICATION_ICON_VARIANTS[tipo] ?? "info";
