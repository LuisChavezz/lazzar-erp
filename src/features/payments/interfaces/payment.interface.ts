import type { DocumentCancellationFields } from "@/src/features/document-cancellation/interfaces/document-cancellation.interface";

/**
 * Contrato de `/finanzas/pagos/` (`PagoSerializer`, `fields = "__all__"` más
 * `proveedor_nombre` y `cuenta_bancaria_alias` de solo lectura, y las líneas
 * anidadas `pago_detalles`). Nombres de llaves EN ESPAÑOL tal cual los devuelve
 * el backend — no traducir.
 *
 * Como en el resto de finanzas: respuesta en ARREGLO PLANO (sin envoltorio de
 * paginación), decimales como STRING ("1160.00") y fechas como "YYYY-MM-DD".
 *
 * `pago_detalles` es de escritura SOLO EN EL ALTA
 * (`nested_write_on_create_only = ("pago_detalles",)` en el serializer): un PATCH
 * posterior no puede modificar las líneas.
 */

/** Método de pago, tal cual el enum del backend. */
export type MetodoPago = "Efectivo" | "Transferencia" | "Tarjeta" | "Cheque";

/**
 * Estatus del pago. Se modela COMPLETO porque las lecturas pueden traer
 * cualquiera de los tres, pero el alta desde esta UI siempre manda `Aplicado`:
 * `Borrador` no se expone (ver `CreatePagoPayload`).
 */
export type PagoEstatus = "Borrador" | "Aplicado" | "Cancelado";

/** Renglón de `pago_detalles`: la aplicación del pago contra UNA cuenta por pagar. */
export interface PagoDetalle {
  id: number;
  /** FK al `Pago` padre. Solo lectura en el serializer — nunca se envía. */
  pago: number;
  /** FK a `finanzas.CuentaPorPagar`. */
  cxp: number;
  /** Decimal en string. */
  importe_aplicado: string;
  observaciones: string | null;
  created_at: string | null;
  /**
   * Folio de la factura de proveedor de la CxP (EC-904). SOLO en listado y
   * retrieve (no en las respuestas de alta o cancelar), por eso opcional; `null`
   * si la factura no tiene folio. Lo lee el PDF.
   */
  factura_proveedor_folio?: string | null;
}

export interface Pago extends DocumentCancellationFields {
  id: number;
  /** FK a `nucleo.Empresa`. La resuelve el backend; el cliente la LEE, nunca la envía. */
  empresa: number;
  /** FK a `terceros.Proveedor`. */
  proveedor: number;
  /** FK a `finanzas.CuentaBancaria`. */
  cuenta_bancaria: number;
  /** Calculado (`source="proveedor.nombre"`), solo lectura. */
  proveedor_nombre: string | null;
  /** Calculado (`source="cuenta_bancaria.alias"`), solo lectura. */
  cuenta_bancaria_alias: string | null;
  /**
   * Sucursal del pago (EC-874): la de las facturas de proveedor de sus líneas,
   * fijada al CREARLO (los pagos solo reciben líneas en el alta y no se
   * recalcula después). `null` solo en un pago sin líneas, como los previos a
   * la sucursal que no pudieron asignarse. Nunca viaja en el cuerpo de alta:
   * el backend la deriva y una distinta responde 400.
   */
  sucursal: number | null;
  /** `source="sucursal.nombre"`; `null` sin sucursal. */
  sucursal_nombre: string | null;
  /** `source="sucursal.codigo"`; `null` sin sucursal. */
  sucursal_codigo: string | null;
  /**
   * Fecha "YYYY-MM-DD". El modelo la declara
   * `DateField(default=timezone.localdate)` SIN `null=True`, así que en lectura
   * nunca es nula y en escritura admite omitirse pero NO `null` (ver
   * `CreatePagoPayload`).
   */
  fecha_pago: string;
  metodo_pago: MetodoPago;
  referencia: string | null;
  referencia_operacion: string | null;
  /** Decimal en string. Debe cuadrar con la suma de `importe_aplicado`. */
  total_pagado: string;
  estatus: PagoEstatus;
  observaciones: string | null;
  /**
   * Bandera del modelo (`default=True`). Viaja por el `fields = "__all__"`; el
   * ciclo de vida del documento lo lleva `estatus` (la cancelación es la acción
   * `/cancelar/`), no este campo.
   */
  activo: boolean;
  created_at: string | null;
  updated_at: string | null;
  /** Líneas anidadas. Puede venir vacío. */
  pago_detalles: PagoDetalle[];
  /**
   * Moneda del pago (EC-904): la de su cuenta bancaria, porque el pago no
   * guarda moneda propia. `moneda` es el id y `moneda_nombre` el CÓDIGO ISO.
   * Solo listado y retrieve, por eso opcionales. Sin tipo de cambio: el lado de
   * proveedores no lo registra.
   */
  moneda?: number;
  moneda_nombre?: string | null;
}

/**
 * Renglón del cuerpo de alta. NO lleva `pago` (solo lectura en el serializer:
 * el padre se resuelve al anidar) ni `id`/`created_at`.
 */
export interface CreatePagoDetallePayload {
  cxp: number;
  /** Decimal en string, con 2 posiciones. */
  importe_aplicado: string;
  observaciones: string | null;
}

/**
 * Cuerpo de `POST /finanzas/pagos/`.
 *
 * Tipo SEPARADO del de lectura a propósito: es la costura entre los valores del
 * formulario y lo que viaja al API (la fase 2 añade el `buildPagoPayload` que
 * traduce centinelas y strings de captura a este tipo, igual que hace
 * `buildTransferPayload` en traspasos).
 *
 * Omite `empresa` (la resuelve el backend a partir del usuario autenticado),
 * `created_at`/`updated_at`, `activo` y los campos calculados.
 *
 * `estatus` viaja SIEMPRE como `"Aplicado"`: esta UI no expone `Borrador`. Se
 * envía explícito en vez de confiar en el default del modelo para que el
 * documento creado no dependa de un default que podría cambiar en el backend.
 *
 * `fecha_pago` es opcional y, cuando se envía, es una fecha real: el campo NO es
 * nullable en el modelo, así que mandar `null` da 400 — si el usuario no captura
 * fecha, la llave se OMITE y el backend aplica `timezone.localdate`.
 */
export interface CreatePagoPayload {
  proveedor: number;
  cuenta_bancaria: number;
  fecha_pago?: string;
  metodo_pago: MetodoPago;
  referencia: string | null;
  referencia_operacion: string | null;
  total_pagado: string;
  estatus: Extract<PagoEstatus, "Aplicado">;
  observaciones: string | null;
  pago_detalles: CreatePagoDetallePayload[];
}
