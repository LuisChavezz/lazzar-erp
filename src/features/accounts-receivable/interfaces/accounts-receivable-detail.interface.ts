// Modelo del DETALLE de una cuenta por cobrar, alineado con el contrato de
// `GET /finanzas/cuentas-por-cobrar/{id}/`. Los nombres en español de las llaves
// se conservan tal cual del API — no traducir. Al igual que en el listado, los
// importes llegan como strings decimales ("1160.00") y las fechas como strings
// ISO; se parsean solo para formatearlos (ver `safeParseAmount`).
//
// El detalle NO es el mismo payload del listado: además de los 17 campos base
// agrega `total_pagado` (calculado por el backend), la factura anidada COMPLETA
// con sus conceptos y las pólizas contables asociadas con sus movimientos.

import type { InvoiceDetail } from "@/src/features/invoicing/interfaces/invoice.interface";
import type { CuentaPorCobrar } from "./accounts-receivable.interface";

/**
 * Factura anidada dentro del detalle de CxC. Sus conceptos reutilizan
 * `InvoiceDetail`, el contrato ya establecido para un renglón de factura en el
 * módulo de facturación (`GET /finanzas/facturas/`): es el mismo serializer del
 * backend, así que duplicar la interfaz aquí solo la dejaría divergir.
 */
export interface CuentaPorCobrarFactura {
  id: number;
  folio: string;
  cliente_nombre: string;
  /**
   * Correo destino de la factura, resuelto server-side. Es `null` explícito
   * cuando no hay ninguna fuente de correo disponible (mismo criterio que
   * `Invoice.correo_facturas`).
   */
  correo_facturas: string | null;
  /** Conceptos de la factura. Puede venir vacío. */
  factura_detalles: InvoiceDetail[];
}

/**
 * Movimiento (renglón) de una póliza contable: el asiento contra una cuenta
 * contable, con su importe en `cargo` o en `abono` (uno de los dos va en cero).
 */
export interface CuentaPorCobrarPolizaDetalle {
  id: number;
  cuenta_contable_id: number;
  /** Código de la cuenta contable (p. ej. "105-01"). */
  cuenta_contable_codigo: string;
  /** Nombre de la cuenta contable (p. ej. "Clientes"). */
  cuenta_contable_nombre: string;
  centro_costo_id: number;
  centro_costo_nombre: string;
  /** Importe al debe (string decimal). */
  cargo: string;
  /** Importe al haber (string decimal). */
  abono: string;
  referencia: string;
  observaciones: string;
  /** Orden de presentación del renglón dentro de la póliza (1-based). */
  orden: number;
}

/** Póliza contable asociada a la cuenta por cobrar, con sus movimientos. */
export interface CuentaPorCobrarPoliza {
  id: number;
  folio: string;
  /** Tipo de póliza (p. ej. "Ingreso"). */
  tipo: string;
  /** Fecha ISO `YYYY-MM-DD`. */
  fecha: string;
  concepto: string;
  estatus: string;
  /** Suma de los cargos de la póliza (string decimal), calculada por el backend. */
  total_cargos: string;
  /** Suma de los abonos de la póliza (string decimal), calculada por el backend. */
  total_abonos: string;
  /** Movimientos de la póliza. Puede venir vacío. */
  detalles: CuentaPorCobrarPolizaDetalle[];
}

/**
 * Respuesta de `GET /finanzas/cuentas-por-cobrar/{id}/`: los 17 campos base del
 * listado más los 3 exclusivos del detalle.
 *
 * Extiende `CuentaPorCobrar` (en vez de redeclarar los campos base) para que el
 * detalle sea asignable donde se espera una cuenta —en particular a
 * `isCuentaVencida(cuenta, todayUTC)`—, de modo que la vista de detalle derive
 * "vencida" con la MISMA definición única que el listado, los KPIs y la
 * antigüedad, sin poder contradecirlos.
 */
export interface CuentaPorCobrarDetail extends CuentaPorCobrar {
  /**
   * Total cobrado (`total − saldo`), calculado por el BACKEND. Se muestra tal
   * cual: recalcularlo en el cliente duplicaría una regla del servidor que
   * podría divergir sin aviso.
   */
  total_pagado: string;
  factura: CuentaPorCobrarFactura;
  /** Pólizas contables asociadas. Puede venir vacío. */
  polizas: CuentaPorCobrarPoliza[];
}

/**
 * Forma CRUDA de `GET /finanzas/cuentas-por-cobrar/{id}/` tal como la entrega
 * el backend, antes de normalizar. A diferencia de `CuentaPorCobrarDetail`
 * —que hereda `observaciones: string` de `CuentaPorCobrar` para poder pasarse
 * tal cual a `isCuentaVencida(cuenta, todayUTC)`—, aquí `observaciones` SÍ
 * admite `null`: el backend lo confirma para el detalle (a diferencia del
 * listado, que nunca lo hace).
 *
 * Ensanchar `observaciones` directamente en `CuentaPorCobrarDetail` a
 * `string | null` NO es viable: además de romper el `extends` de
 * `CuentaPorCobrar` (TS2430), el objeto resultante deja de ser asignable al
 * parámetro `CuentaPorCobrar` de `isCuentaVencida` (TS2345) —el argumento ya
 * no cumple el tipo esperado, sin importar si se declara con `extends` o con
 * `Omit<...> & {...}`—. Por eso la normalización de `null` a `""` ocurre en
 * la frontera (`useCuentaPorCobrarDetail`, vía `select`): `actions.ts` tipa el
 * GET honestamente con ESTE tipo crudo (sigue devolviendo `response.data` tal
 * cual, sin transformarlo — solo cambia la anotación de tipo), y el hook
 * expone ya normalizado un `CuentaPorCobrarDetail` cuyo `observaciones: string`
 * es cierto en tiempo de ejecución, no solo en el tipo.
 */
export type CuentaPorCobrarDetailResponse = Omit<
  CuentaPorCobrarDetail,
  "observaciones"
> & {
  observaciones: string | null;
};
