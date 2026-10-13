import type { CarteraMoneda } from "@/src/features/customers/interfaces/customer.interface";
import type { Opportunity } from "./opportunity.interface";
import type { OpportunitySeguimiento } from "./seguimiento.interface";

/**
 * Cotización ligada a una oportunidad, con el pedido que nació de ella (si lo
 * hay). `created_at` y `autorizada_at` llegan en UTC (`Z`); el resto de fechas
 * de la oportunidad, con el offset local.
 */
export interface OpportunityCotizacion {
  id: number;
  /** Estatus numérico de la cotización (1 Borrador … 5 Cambios solicitados). */
  estatus: number;
  estatus_display: string | null;
  created_at: string | null;
  autorizada_at: string | null;
  pedido_id: number | null;
  pedido_folio: string | null;
}

/**
 * Respuesta de `GET /ventas/oportunidades/{id}/onboarding/`: todo lo de la
 * pantalla de una oportunidad en una sola llamada.
 *
 * - `oportunidad` tiene la MISMA forma que la fila del listado.
 * - `cartera` usa las mismas llaves que `resumen_comercial.cartera` del
 *   cliente. Llega `[]` si la oportunidad no tiene cliente, si el cliente no
 *   debe nada O si el usuario no puede ver a ese cliente: el backend no los
 *   distingue.
 * - `seguimientos` trae como mucho los 50 más recientes
 *   (`SEGUIMIENTOS_ONBOARDING_LIMIT`), del más nuevo al más viejo.
 * - `pendientes` cuenta los seguimientos sin completar. OJO: el backend los
 *   cuenta también en una oportunidad `Perdida`, donde no deberían contar; la
 *   pantalla no muestra la cifra en ese estado.
 * - `proximo_recordatorio` es la fecha más próxima entre los pendientes
 *   (incluye las ya vencidas), o `null`.
 */
export interface OpportunityOnboarding {
  oportunidad: Opportunity;
  seguimientos: OpportunitySeguimiento[];
  pendientes: number;
  proximo_recordatorio: string | null;
  cotizaciones: OpportunityCotizacion[];
  cartera: CarteraMoneda[];
}

/** Respuesta de `POST /ventas/oportunidades/{id}/cotizar/` (201). */
export interface OpportunityCotizarResponse {
  cotizacion_id: number;
}

/** Lo que "Cotizar" necesita de la oportunidad. */
export interface OpportunityCotizarVariables {
  id: number;
  /** Para refrescar el resumen del cliente, que cuenta sus cotizaciones. */
  cliente: number | null;
}
