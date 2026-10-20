import type { MetodoPago } from "@/src/features/payments/interfaces/payment.interface";

/**
 * Contrato de `/finanzas/cobros/` (`CobroSerializer`, `fields = "__all__"`).
 * Los nombres de las llaves se conservan EN ESPAÑOL tal cual los devuelve el
 * backend — no traducir.
 *
 * El listado es un ARREGLO PLANO (la app `finanzas` no declara paginación) y
 * usa el MISMO serializer que el retrieve, líneas anidadas incluidas: por eso el
 * detalle se arma con el renglón ya cargado, sin fetch propio. El backend solo
 * devuelve cobros con `activo=True` de la empresa del usuario, e INCLUYE los
 * `Cancelado`. Los decimales llegan como string ("1160.00").
 *
 * El cobro NO tiene moneda, folio ni sucursal propios: la moneda es la de su
 * cuenta bancaria (ver `resolveCobroMoneda`) y el identificador visible es el
 * `id`.
 */

/** Estatus del modelo (`Cobro.Estatus`). Mismo enum que el del pago a proveedor. */
export type CobroEstatus = "Borrador" | "Aplicado" | "Cancelado";

/** Método de pago: el backend comparte el enum `MetodoPago` entre pagos y cobros. */
export type CobroMetodoPago = MetodoPago;

/**
 * `referencia` es un ENUM del modelo (`OpcionesReferencia`), no texto libre: el
 * texto libre de la operación vive en `referencia_operacion`.
 */
export type CobroReferencia = "SPEI" | "Cheque" | "Autorizacion TPV";

/** Línea del cobro (`CobroDetalleSerializer`): aplica un importe a UNA CxC. */
export interface CobroDetalle {
  id: number;
  /** FK al cobro padre, solo lectura. */
  cobro: number;
  /**
   * FK a `CuentaPorCobrar`. Solo el id: folio de factura, moneda y saldo se
   * resuelven contra el listado de CxC (ver `buildCxcIndex`).
   */
  cxc: number;
  /** Decimal como string, 2 decimales. */
  importe_aplicado: string;
  observaciones: string | null;
  created_at: string;
}

export interface Cobro {
  id: number;
  /** FK a la empresa; la resuelve el backend. */
  empresa: number;
  /** FK a `terceros.Cliente`. */
  cliente: number;
  /** `source="cliente.nombre"`; nunca null (FK y campo NOT NULL). */
  cliente_nombre: string;
  /** FK a `finanzas.CuentaBancaria`. */
  cuenta_bancaria: number;
  /**
   * `source="cuenta_bancaria.alias"`. PUEDE ser null: `CuentaBancaria.alias` es
   * `null=True`, aunque el OpenAPI no lo marque como nullable.
   */
  cuenta_bancaria_alias: string | null;
  /** Fecha-calendario "YYYY-MM-DD". */
  fecha_cobro: string;
  metodo_pago: CobroMetodoPago;
  referencia: CobroReferencia;
  /** Texto libre de la operación (folio SPEI, número de cheque…). */
  referencia_operacion: string | null;
  /** Decimal como string, 2 decimales. */
  total_cobrado: string;
  estatus: CobroEstatus;
  observaciones: string | null;
  /** El listado solo trae `true`; se declara porque viaja en la respuesta. */
  activo: boolean;
  /** UUID del complemento de pago (REP) timbrado; null si no se ha timbrado. */
  rep_uuid: string | null;
  rep_facturama_id: string | null;
  /** Datetime del timbrado del REP. */
  rep_fecha_timbrado: string | null;
  /** `true` mientras un timbrado del REP quedó sin confirmar en Facturama. */
  rep_pendiente: boolean;
  created_at: string;
  updated_at: string;
  cobro_detalles: CobroDetalle[];
}

/**
 * Parámetros de `GET /finanzas/dashboard/` que usa este módulo. Sin fechas el
 * backend toma el mes en curso hasta hoy; sin `moneda_id` SUMA todas las
 * monedas, por eso los indicadores siempre la mandan.
 */
export interface FinanceDashboardParams {
  moneda_id: number;
}

/**
 * Solo las partes de la respuesta del dashboard que consume este módulo. La
 * respuesta trae además `cuentas_por_cobrar`, `cuentas_por_pagar`,
 * `pagos_periodo`, `bancos` y `alertas_mora`, que no se declaran aquí.
 */
export interface FinanceDashboard {
  periodo: {
    fecha_inicio: string;
    fecha_fin: string;
  };
  /** Solo cuenta cobros `Aplicado` con `fecha_cobro` dentro del período. */
  cobros_periodo: {
    cantidad: number;
    /** Decimal como string. */
    monto_total: string;
    /** Monto por día, "YYYY-MM-DD" → decimal como string. */
    por_dia: Record<string, string>;
  };
}
