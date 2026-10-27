import type { CarteraMoneda } from "@/src/features/customers/interfaces/customer.interface";
import type { Opportunity } from "./opportunity.interface";

/**
 * Cotización de la pantalla de una oportunidad, con el pedido que nació de ella
 * (si lo hay). `created_at` y `autorizada_at` llegan en UTC (`Z`); el resto de
 * fechas de la oportunidad, con el offset local.
 *
 * Es la MISMA fila en `onboarding.cotizaciones` y en `ligadas`/`disponibles`
 * de `…/cotizaciones/`: el backend arma las tres con una sola función
 * (`filas_cotizaciones`).
 */
export interface OpportunityCotizacion {
  id: number;
  /** Estatus numérico de la cotización (1 Borrador … 5 Cambios solicitados). */
  estatus: number;
  estatus_display: string | null;
  /**
   * Total con impuestos, texto con 2 decimales ("11600.00"); nunca `null`. La
   * fila NO trae la moneda de la cotización, así que se muestra sin símbolo.
   */
  gran_total: string;
  created_at: string | null;
  autorizada_at: string | null;
  pedido_id: number | null;
  pedido_folio: string | null;
}

/**
 * Respuesta de `GET /ventas/oportunidades/{id}/onboarding/`: lo que la
 * pantalla de una oportunidad usa de ella.
 *
 * - `oportunidad` tiene la MISMA forma que la fila del listado.
 * - `cartera` usa las mismas llaves que `resumen_comercial.cartera` del
 *   cliente. Llega `[]` si la oportunidad no tiene cliente, si el cliente no
 *   debe nada O si el usuario no puede ver a ese cliente: el backend no los
 *   distingue.
 * - La respuesta trae además `seguimientos` (solo los 50 más recientes),
 *   `pendientes` y `proximo_recordatorio`. NO se tipan a propósito, para que
 *   nada dependa de ellos: el historial tiene su propia consulta
 *   (`useOpportunitySeguimientos`), que los trae todos, y el resumen se calcula
 *   de esa lista.
 */
export interface OpportunityOnboarding {
  oportunidad: Opportunity;
  cotizaciones: OpportunityCotizacion[];
  cartera: CarteraMoneda[];
}

/** Respuesta de `POST /ventas/oportunidades/{id}/cotizar/` (201). */
export interface OpportunityCotizarResponse {
  cotizacion_id: number;
}

/**
 * Respuesta de `GET /ventas/oportunidades/{id}/cotizaciones/` y de su `POST`
 * (que responde lo mismo, ya con lo ligado).
 *
 * - `ligadas`: las de la oportunidad que el usuario puede ver.
 * - `disponibles`: del mismo cliente y empresa, sin oportunidad y visibles para
 *   el usuario; las 100 más recientes, sin paginar. NO se filtran por estatus.
 *   `[]` si la oportunidad no tiene cliente.
 */
export interface OpportunityCotizacionesLinks {
  ligadas: OpportunityCotizacion[];
  disponibles: OpportunityCotizacion[];
}

/** Lo que "Cotizar" necesita de la oportunidad. */
export interface OpportunityCotizarVariables {
  id: number;
  /** Para refrescar el resumen del cliente, que cuenta sus cotizaciones. */
  cliente: number | null;
}
