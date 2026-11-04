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
 * La moneda del cobro es SIEMPRE la de su cuenta bancaria: `moneda` la fija el
 * servidor (solo lectura) y el código ISO llega con el cobro en
 * `cuenta_bancaria_moneda_codigo` (ver `resolveCobroMoneda`). El identificador visible es `folio`, o
 * `#id` mientras no tenga (ver `cobroLabel`).
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
  /**
   * `source="cuenta_bancaria.moneda.codigo_iso"` (EC-746): la moneda de la
   * cuenta, que es la del cobro. Llega con el cobro para que quien lee Cobros
   * con `R-CONTABILIDAD-CXC` no necesite `cuentas-bancarias/`. `null` si la
   * cuenta no trae moneda o código.
   */
  cuenta_bancaria_moneda_codigo: string | null;
  /** `source="cuenta_bancaria.activo"` (EC-746): ¿la cuenta sigue activa? */
  cuenta_bancaria_activo: boolean;
  /** Fecha-calendario "YYYY-MM-DD". */
  fecha_cobro: string;
  metodo_pago: CobroMetodoPago;
  referencia: CobroReferencia;
  /** Texto libre de la operación (folio SPEI, número de cheque…). */
  referencia_operacion: string | null;
  /** Decimal como string, 2 decimales. */
  total_cobrado: string;
  /**
   * FK a `nucleo.Moneda`, solo lectura: la de la cuenta bancaria. Nullable en
   * el modelo (los cobros previos a EC-537 se rellenaron con la de su cuenta).
   */
  moneda: number | null;
  /**
   * MXN por unidad de la moneda del cobro, decimal de 6 como string. En MXN el
   * servidor lo fija en "1.000000"; en otra moneda es obligatorio y > 0.
   */
  tipo_cambio: string;
  /**
   * Folio de la serie `COBROS` (p. ej. "COB-00016"), solo lectura. El backend lo
   * asigna al aplicar el cobro y cancelarlo no lo cambia. `null` en `Borrador`,
   * en un borrador cancelado sin aplicar, en cobros registrados antes de que
   * existiera el folio y cuando la sucursal no tiene serie `COBROS` activa. Esta
   * es la lista de referencia de los casos sin folio.
   */
  folio: string | null;
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
  /** `true` mientras la cancelación del REP espera la aceptación del receptor. */
  rep_cancelacion_solicitada: boolean;
  /** UUID del REP ya cancelado ante el SAT (trazabilidad); null si no hay. */
  rep_cancelado_uuid: string | null;
  /** Datetime de la cancelación del REP ante el SAT. */
  rep_fecha_cancelacion: string | null;
  created_at: string;
  updated_at: string;
  cobro_detalles: CobroDetalle[];
}

/** Formatos del REP que se descargan desde el detalle del cobro. */
export type CobroRepFileFormat = "pdf" | "xml";

/**
 * Respuesta del passthrough `facturama/cfdi/{formato}/issued/{id}/`: el objeto
 * de Facturama tal cual. Solo se declara lo que se lee; el valor exacto de
 * `ContentType` no está confirmado y no se usa (el MIME sale del formato).
 */
export interface FacturamaCfdiFile {
  /** Archivo en base64 puro. */
  Content: string;
  ContentType?: string;
}

/**
 * Totales de UNA moneda en `GET /finanzas/cobros/resumen/`, agrupados por
 * CÓDIGO: `Moneda.codigo_iso` no es único (hay monedas globales y privadas de
 * cada empresa), así que una entrada puede sumar varias filas de `Moneda`.
 * Se identifica y se compara por `moneda_codigo`, nunca por `moneda_id`.
 */
export interface CobrosResumenMoneda {
  /** Id de la `Moneda` si UNA sola respalda la entrada; `null` si son varias con el mismo código. */
  moneda_id: number | null;
  /** Código ISO tal cual está guardado: la llave de la entrada. */
  moneda_codigo: string;
  /** Cobros `Aplicado` del período en esa moneda (la de su cuenta bancaria). */
  cantidad: number;
  /** Suma de `total_cobrado`, decimal con 2 posiciones como string. */
  monto_total: string;
}

/**
 * `GET /finanzas/cobros/resumen/` (EC-746): los indicadores de Cobros, de la
 * propia sección (se leen con `R-CONTABILIDAD-CXC`, sin abrir el dashboard).
 * Por código, los números son la SUMA de `cobros_periodo` del dashboard sobre
 * cada `moneda_id` con ese código.
 */
export interface CobrosResumen {
  /** El período que resolvió el backend: del día 1 del mes en curso a hoy. */
  periodo: {
    fecha_inicio: string;
    fecha_fin: string;
  };
  /**
   * Una entrada por cada CÓDIGO de moneda de las cuentas bancarias de la
   * empresa (activas o no), aunque no tenga cobros, ordenadas por código. Vacío si la
   * empresa no tiene cuentas con moneda.
   */
  por_moneda: CobrosResumenMoneda[];
}

/** Línea del cuerpo de alta: sin `id`, `cobro` ni `created_at` (los pone el backend). */
export interface CreateCobroDetallePayload {
  cxc: number;
  /** Decimal con 2 posiciones, como string. */
  importe_aplicado: string;
  observaciones: string | null;
}

/**
 * Cuerpo de `POST /finanzas/cobros/` y de `PATCH /finanzas/cobros/{id}/` (en el
 * PATCH de un borrador `cobro_detalles` REEMPLAZA todas las líneas). No lleva
 * `empresa`, `activo`, `moneda`, `folio` ni `rep_*`: son de solo lectura y el
 * backend los ignora en silencio. `fecha_cobro` es opcional porque el campo no
 * es nullable y el backend aplica su default (hoy) cuando la llave se omite.
 * `tipo_cambio` solo viaja fuera de MXN (en MXN el backend lo fija en 1).
 */
export interface CreateCobroPayload {
  cliente: number;
  cuenta_bancaria: number;
  fecha_cobro?: string;
  metodo_pago: CobroMetodoPago;
  referencia: CobroReferencia;
  referencia_operacion: string | null;
  /** Decimal con 2 posiciones, derivado de las líneas. */
  total_cobrado: string;
  /** Decimal con hasta 6 posiciones; solo fuera de MXN. */
  tipo_cambio?: string;
  estatus: CobroEstatus;
  observaciones: string | null;
  cobro_detalles: CreateCobroDetallePayload[];
}
