import type { QueryKey } from "@tanstack/react-query";
import { QUOTES_QUERY_KEY } from "@/src/features/quotes/constants/quotesQueryKeys";
import { operationsQuotesQueryKey } from "@/src/features/operations/hooks/useOperationsQuotes";
import { VACATIONS_KEY } from "@/src/features/vacations/hooks/useVacations";
import { ABSENCES_KEY } from "@/src/features/absences/hooks/useAbsences";

/**
 * Consultas que cambian cuando llega una notificación, por `tipo` emitido en el
 * backend (nucleo-erp). Son PREFIJOS: cada uno cubre lista, tablero, KPIs y
 * detalle de su recurso.
 *
 * - `cotizacion_en_revision` (a Mesa de Control), `cotizacion_autorizada`,
 *   `cotizacion_rechazada`, `cotizacion_cambios_aceptados`,
 *   `cotizacion_cambios_rechazados` y `cotizacion_editada_mesa` (al vendedor),
 *   todos de `ventas/api/views.py`: las cotizaciones del vendedor
 *   (`["quotes"]`), su detalle (`["quote"]`) y la bandeja de Mesa de Control
 *   (`["operations-quotes"]`).
 * - `pre_orden_<evento>` y `pre_orden_rechazada`
 *   (`produccion/services/pre_orden_service.py`): las pre-órdenes (lista,
 *   detalle, historial y el badge del sidebar cuelgan de `["pre-orders"]`) y
 *   los pedidos especiales, que traen su `pre_orden` (el mismo conjunto que
 *   refresca `usePreOrderActions`).
 * - `oc_autorizada` (`compras/api/views.py`, a Almacén): las órdenes de compra
 *   (`["purchase-orders"]`: lista, KPIs y detalle) y las órdenes por recibir
 *   del asistente de recepciones (`["receipt-onboarding-data"]`). El listado de
 *   recepciones (`["receipts"]`) no cambia: autorizar no crea recepciones.
 * - `vacaciones_*` y `permiso_ausencia_*` (`hr/api/views.py`): los listados de
 *   vacaciones (`["vacations"]`) y de permisos/ausencias (`["absences"]`), de
 *   los que `?solicitud=` abre el detalle.
 *
 * Un `tipo` que no esté aquí solo refresca la lista de notificaciones.
 */
export const NOTIFICATION_RELATED_QUERY_KEYS: readonly QueryKey[] = [
  QUOTES_QUERY_KEY,
  ["quote"],
  operationsQuotesQueryKey,
  ["pre-orders"],
  ["special-orders"],
  ["special-order-detail"],
  ["purchase-orders"],
  ["receipt-onboarding-data"],
  VACATIONS_KEY,
  ABSENCES_KEY,
];
