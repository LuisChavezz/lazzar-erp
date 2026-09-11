/**
 * Contrato de `/finanzas/polizas/` (`PolizaSerializer`, `fields = "__all__"` más
 * tres campos calculados —`total_cargos`, `total_abonos`, `cuadre_correcto`— y
 * las líneas anidadas `poliza_detalles`). Nombres de llaves EN ESPAÑOL tal cual
 * los devuelve el backend — no traducir.
 *
 * Como en el resto de finanzas: respuesta en ARREGLO PLANO (la app no declara
 * paginación), decimales como STRING ("1160.00") y fechas como "YYYY-MM-DD".
 *
 * `poliza_detalles` es de escritura SOLO EN EL ALTA
 * (`nested_write_on_create_only = ("poliza_detalles",)` en el serializer): un
 * PATCH posterior ignora las líneas por completo. No hay endpoint para editar,
 * agregar ni quitar un movimiento después de crear la póliza.
 *
 * ─── LA PÓLIZA NO TIENE MONEDA ───────────────────────────────────────────────
 *
 * Ni `Poliza` ni `PolizaDetalle` declaran FK a `nucleo.Moneda`, y no hay ningún
 * campo desde el cual derivarla (a diferencia de la nota de crédito, que al menos
 * puede leerla de su factura). Por eso TODOS los importes de este módulo se
 * pintan como decimal de 2 posiciones SIN símbolo: poner "$" afirmaría una
 * moneda que el documento no declara. Misma resolución que el
 * `IMPORTE_SIN_MONEDA` de `CreditNoteDetailDialog`, aquí aplicada en todas las
 * vistas porque no existe ninguna consulta que pudiera resolverla.
 */

/**
 * Tipos de póliza, tal cual el enum del backend (`Poliza.PolizaTipo`).
 *
 * Se declara como TUPLA `as const` —y el tipo se deriva de ella— para que
 * `z.enum(POLIZA_TIPOS)` en el esquema y el `<select>` del formulario salgan de
 * la misma lista: una tercera copia escrita a mano podría desincronizarse.
 */
export const POLIZA_TIPOS = ["Diario", "Ingreso", "Egreso", "Ajuste"] as const;

export type PolizaTipo = (typeof POLIZA_TIPOS)[number];

/**
 * Estatus de la póliza, tal cual el enum del backend (`Poliza.PolizaStatus`).
 *
 * NO existe un `tipo: "cierre"` ni un estatus adicional: la maqueta faker de
 * `src/features/accounting/` inventa ambos (y usa minúsculas), y no es un
 * contrato — ver el encabezado de este módulo.
 */
export type PolizaEstatus = "Borrador" | "Contabilizada" | "Cancelada";

/**
 * Movimiento (asiento) de la póliza: una cuenta contable y su importe, en el
 * lado del cargo O en el del abono.
 *
 * `cuenta_contable` y `centro_costo` son NULLABLE en el modelo
 * (`on_delete=SET_NULL`): pueden llegar nulos en filas cuyo catálogo se borró.
 * El formulario, en cambio, EXIGE `cuenta_contable` — un asiento sin cuenta no
 * es un asiento (ver `poliza.schema.ts`).
 */
export interface PolizaDetalle {
  id: number;
  /** FK a la `Poliza` padre. Solo lectura en el serializer — nunca se envía. */
  poliza: number | null;
  /** FK a `finanzas.CuentaContable`. */
  cuenta_contable: number | null;
  /** FK a `finanzas.CentroCosto`, a NIVEL DE LÍNEA (además del de la cabecera). */
  centro_costo: number | null;
  /** Decimal en string. Uno de los dos lados va en "0.00". */
  cargo: string;
  /** Decimal en string. Uno de los dos lados va en "0.00". */
  abono: string;
  referencia: string | null;
  observaciones: string | null;
  /**
   * Orden del asiento dentro de la póliza. En contabilidad no es cosmético (el
   * cargo antecede a su abono), por eso las vistas de lectura ordenan por él —
   * ver `AccountsReceivablePolizasSection`.
   */
  orden: number | null;
  /**
   * Documentos que ORIGINAN el asiento cuando la póliza la genera el backend
   * (p. ej. la póliza automática del alta de una CxC pendiente, que liga
   * `factura`). Se declaran para no perderlos en la lectura, pero la captura
   * MANUAL no los ofrece: esta pantalla registra pólizas de diario capturadas a
   * mano, no reconstruye la ligadura documental que el backend arma solo. Nunca
   * viajan en el alta (ver `CreatePolizaDetallePayload`).
   */
  factura: number | null;
  factura_proveedor: number | null;
  pago: number | null;
  cobro: number | null;
  movimiento_bancario: number | null;
}

export interface Poliza {
  id: number;
  /**
   * FK a `nucleo.Empresa`. La resuelve el SERVIDOR
   * (`EmpresaResueltaEnServidorMixin` + `_resolve_empresa`): el campo es de solo
   * lectura para todo usuario que no sea superusuario, así que NUNCA se envía.
   */
  empresa: number;
  /** FK a `nucleo.Sucursal`. REQUERIDO en el alta (la columna es NOT NULL). */
  sucursal: number;
  /** FK a `finanzas.CentroCosto` a NIVEL DE CABECERA. Nullable. */
  centro_costo: number | null;
  /**
   * Folio del documento. Lo captura el cliente: `PolizaViewSet.perform_create`
   * NO lo autogenera (el `POL-000001` consecutivo solo lo produce el alta de CxC
   * pendiente, que crea su póliza por dentro). Nullable en el modelo, pero el
   * formulario lo exige — ver la nota de `PolizaFormSchema`.
   */
  folio: string | null;
  /**
   * Consecutivo por (empresa, sucursal). Solo lo asigna el backend cuando ÉL
   * genera la póliza; una póliza capturada desde esta pantalla lo deja `null`.
   * Nunca se envía.
   */
  folio_consecutivo: number | null;
  tipo: PolizaTipo;
  /**
   * Fecha contable "YYYY-MM-DD". `DateField(auto_now_add=True, null=True)`: la
   * fija el backend al crear y es de SOLO LECTURA — nunca se envía. Es nullable
   * en el modelo, así que puede llegar nula.
   */
  fecha: string | null;
  concepto: string | null;
  estatus: PolizaEstatus;
  /**
   * FK al usuario que creó la póliza. `perform_create` cae en `request.user`
   * cuando no llega, así que no se envía.
   */
  usuario_creacion: number | null;
  activo: boolean;
  /**
   * Suma de `cargo` de los movimientos, calculada por el backend
   * (`SerializerMethodField`). Decimal en string. Solo lectura.
   */
  total_cargos: string;
  /** Suma de `abono` de los movimientos. Calculada, decimal en string. */
  total_abonos: string;
  /**
   * `abs(total_cargos − total_abonos) <= 0.01` según el backend
   * (`PolizaSerializer.get_cuadre_correcto`). Calculado, solo lectura.
   *
   * Es la MISMA regla —incluida la tolerancia de un centavo— que
   * `PolizaService.validar_suma_cero` aplica al contabilizar, así que este campo
   * predice exactamente si la acción `contabilizar` va a pasar o a responder
   * 400. Por eso el listado lo usa para habilitar la acción en vez de sumar las
   * líneas por su cuenta.
   */
  cuadre_correcto: boolean;
  /** Movimientos anidados. Puede venir vacío (el backend no exige ninguno). */
  poliza_detalles: PolizaDetalle[];
}

/**
 * Renglón del cuerpo de alta. NO lleva `poliza` (solo lectura en el serializer:
 * el padre se resuelve al anidar) ni `id`, ni los cinco FKs documentales
 * (`factura`, `factura_proveedor`, `pago`, `cobro`, `movimiento_bancario`), que
 * son para las pólizas que el backend genera solo — ver `PolizaDetalle`.
 */
export interface CreatePolizaDetallePayload {
  cuenta_contable: number;
  centro_costo: number | null;
  /** Decimal en string con 2 posiciones. */
  cargo: string;
  /** Decimal en string con 2 posiciones. */
  abono: string;
  referencia: string | null;
  observaciones: string | null;
  /** Posición del asiento (1-indexada), para conservar el orden capturado. */
  orden: number;
}

/**
 * Cuerpo de `POST /finanzas/polizas/`.
 *
 * Tipo SEPARADO del de lectura a propósito: es la costura entre los valores del
 * formulario y lo que viaja al API (`buildPolizaPayload`), igual que
 * `CreateNotaCreditoPayload`/`buildNotaCreditoPayload` en notas de crédito.
 *
 * Omite `empresa` (la resuelve el servidor), `fecha` (`auto_now_add`),
 * `folio_consecutivo` y `usuario_creacion` (los llena el backend), `activo` (su
 * default es correcto) y los tres campos calculados.
 *
 * ─── `estatus` SIEMPRE ES `"Borrador"` ───────────────────────────────────────
 *
 * No es una opción del formulario: es un tipo literal. `perform_update` NO tiene
 * máquina de estados, así que un `estatus` escrito por el cliente —en el POST o
 * en un PATCH— contabilizaría la póliza SALTÁNDOSE la validación de cuadre de
 * `PolizaService.validar_suma_cero`. Contabilizar pasa SIEMPRE por
 * `POST /{id}/contabilizar/` y cancelar por `POST /{id}/cancelar/`; ninguna otra
 * ruta escribe este campo. Se manda explícito (en vez de omitirlo y confiar en
 * el default del modelo) para que el literal quede a la vista en el payload.
 */
export interface CreatePolizaPayload {
  sucursal: number;
  centro_costo: number | null;
  folio: string;
  tipo: PolizaTipo;
  concepto: string | null;
  estatus: "Borrador";
  poliza_detalles: CreatePolizaDetallePayload[];
}
