import type { QuoteDetailSource } from "@/src/features/quotes/hooks/useQuote";
import {
  TIPO_COTIZACION_EN_REVISION,
  type Notificacion,
} from "../interfaces/notification.interface";

/**
 * Destino al que lleva una notificación al hacer clic.
 *
 * `quote-dialog` y no una ruta: `/sales/quotes/[id]` NO EXISTE (en disco solo
 * está `/sales/quotes/[id]/edit`), y el destinatario de
 * `cotizacion_en_revision` es rol MESA-DE-CONTROL, que no tiene
 * `R-CRM-COTIZACIONES` y sería rebotado por `proxy.ts` si se le mandara al
 * formulario de edición. El repo ya resolvió esto igual en
 * `search/components/GlobalSearchPalette.tsx`: la cotización se abre con el
 * diálogo self-fetching `QuoteDetailByIdDialog`.
 *
 * `route` queda declarado para el primer `tipo` que sí tenga ruta propia.
 */
export type NotificationTarget =
  | { kind: "route"; href: string }
  | { kind: "quote-dialog"; quoteId: number; source: QuoteDetailSource };

/** Lee una clave numérica de un `data` sin forma garantizada. */
const readNumber = (data: unknown, key: string): number | null => {
  if (typeof data !== "object" || data === null) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

type TargetResolver = (data: unknown) => NotificationTarget | null;

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
    `source: "mesa-control"` no es una preferencia global de las notificaciones:
    es propio de ESTE `tipo`. El backend lo emite en un solo punto —el paso a
    estatus 2 de una cotización— con `crear_notificacion_por_rol(codigo_rol=
    "MESA-DE-CONTROL", clave_departamento=CLAVE_DEPARTAMENTO_MESA_CONTROL)`, que
    crea una fila por cada usuario de ese departamento en la empresa y por nadie
    más. El vendedor que la envió NO la recibe. Como el destinatario no es el
    vendedor, `/ventas/cotizaciones/{id}/` le responde 404 por el filtro
    `vendedor=user`; `/ventas/mesa-control/{id}/` acota por empresa y estatus
    [2, 5], y la cotización acaba de quedar en 2. Un `tipo` futuro que sí pueda
    llegarle a un vendedor debe declarar `"cotizaciones"` aquí, no heredar esto.

    Es un ORDEN, no una restricción: la notificación sobrevive al cambio de
    estatus —nada la borra al autorizar—, así que al abrir una vieja la
    cotización ya está en 3 y mesa-control responde 404. Ahí entra el respaldo
    de `getQuoteDetailById`, que reintenta en `/ventas/cotizaciones/{id}/`: un
    destinatario `is_admin_empresa` o superuser (nada los excluye del rol
    MESA-DE-CONTROL) la ve por esa ruta a cualquier estatus.
  */
  [TIPO_COTIZACION_EN_REVISION]: (data) => {
    const quoteId = readNumber(data, "cotizacion_id");
    return quoteId === null
      ? null
      : { kind: "quote-dialog", quoteId, source: "mesa-control" };
  },
};

export const resolveNotificationTarget = (
  notificacion: Notificacion,
): NotificationTarget | null =>
  NOTIFICATION_TARGETS[notificacion.tipo]?.(notificacion.data) ?? null;

/** Variantes visuales que ya soporta `NotificationIcon`. */
export type NotificationIconVariant = "error" | "success" | "info";

/**
 * Mapa `tipo` → variante del icono. El `tipo` del backend describe un evento de
 * negocio, no una severidad, así que la traducción es del cliente. Cualquier
 * `tipo` desconocido cae en `info`.
 */
const NOTIFICATION_ICON_VARIANTS: Record<string, NotificationIconVariant> = {
  [TIPO_COTIZACION_EN_REVISION]: "info",
};

export const resolveNotificationIconVariant = (
  tipo: string,
): NotificationIconVariant => NOTIFICATION_ICON_VARIANTS[tipo] ?? "info";
