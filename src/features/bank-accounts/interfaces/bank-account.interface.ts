/**
 * Contrato de `/finanzas/cuentas-bancarias/` (`CuentaBancariaSerializer`, que
 * usa `fields = "__all__"` más dos campos calculados de solo lectura:
 * `banco_nombre` y `moneda_codigo`). Los nombres de las llaves se conservan EN
 * ESPAÑOL tal cual los devuelve el backend — no traducir.
 *
 * Igual que `Banco` (EC-135): la respuesta del listado es un ARREGLO PLANO —la
 * app `finanzas` no declara paginación—, los decimales llegan como STRING
 * ("1160.00") y las fechas como string "YYYY-MM-DD". Todo campo de texto del
 * modelo es `null=True, blank=True`, de ahí el `| null` por defecto.
 *
 * CAMPOS DELIBERADAMENTE NO DECLARADOS: `api_provider`, `token`,
 * `refresh_token` y `ultima_sincronizacion`. Viajan en la respuesta por el
 * `fields = "__all__"` del serializer, pero pertenecen a un Open Banking que no
 * tiene código detrás y hoy llegan vacíos. No declararlos evita que se
 * consuman, se muestren o se filtren por accidente — en particular los dos
 * tokens, que no deben tocar la UI.
 *
 * Parámetros que acepta el listado: `banco`, `moneda`, `alias`, `numero_cuenta`
 * (alias `numero`), `activo` y `ordering`, con orden por defecto
 * `["banco__nombre", "alias", "id"]`. Hoy no se usan: `DataTable` busca, filtra
 * y pagina en memoria sobre el arreglo completo.
 */
export interface CuentaBancaria {
  id: number;
  /**
   * FK a `nucleo.Empresa`. La resuelve el BACKEND; el cliente la LEE pero nunca
   * la envía (ver `CuentaBancariaCreate`).
   */
  empresa: number;
  /** FK a `finanzas.Banco` — el catálogo de EC-135. */
  banco: number;
  /** FK a `nucleo.Moneda`. */
  moneda: number;
  /** Calculado (`source="banco.nombre"`), solo lectura. `Banco.nombre` es nullable. */
  banco_nombre: string | null;
  /** Calculado (`source="moneda.codigo_iso"`), solo lectura. */
  moneda_codigo: string | null;
  alias: string | null;
  titular: string | null;
  /**
   * Sucursal DEL BANCO, texto libre. NO es un FK a `nucleo.Sucursal`: el modelo
   * la declara `CharField(max_length=150)`, así que no se resuelve contra
   * ningún catálogo ni debe capturarse con un selector.
   */
  sucursal_bancaria: string | null;
  numero_cuenta: string | null;
  clabe: string | null;
  numero_cliente: string | null;
  convenio: string | null;
  /** Fecha "YYYY-MM-DD". */
  fecha_apertura: string | null;
  /**
   * Decimal como string. SOLO LECTURA en la práctica: lo mantienen
   * `PagoService` y `CobroService` del backend al aplicar documentos, así que
   * el formulario no lo captura (ver `BankAccountFormSchema`) — editarlo a mano
   * lo desincronizaría del historial de movimientos.
   */
  saldo_actual: string;
  observaciones: string | null;
  activo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Cuerpo de alta y edición.
 *
 * Omite `empresa` (la resuelve el backend y la ignora si se envía),
 * `saldo_actual` (lo mantienen los servicios de pagos y cobros) y `activo`, que
 * se administra desde la acción de la fila. Como la edición usa PATCH, lo que
 * no se envía conserva su valor actual, de modo que guardar el formulario nunca
 * altera el saldo ni el estatus.
 */
export interface CuentaBancariaCreate {
  banco: number;
  moneda: number;
  alias: string;
  titular: string | null;
  sucursal_bancaria: string | null;
  // `| null` como el resto de los opcionales: el formulario lo exige no vacío,
  // pero el vacío se representa con `null`, nunca con `""` (ver
  // `useBankAccountForm`).
  numero_cuenta: string | null;
  clabe: string | null;
  numero_cliente: string | null;
  convenio: string | null;
  fecha_apertura: string | null;
  observaciones: string | null;
}

/** Sentido del movimiento en el resumen de la cuenta. */
export type TipoMovimientoCuenta = "Cargo" | "Abono";

/** Estatus crudo del movimiento, tal cual lo emite el backend. */
export type EstatusMovimientoCuenta = "Pendiente" | "Conciliado" | "Cancelado";

/**
 * Renglón de `ultimos_movimientos` en
 * `GET /finanzas/cuentas-bancarias/{id}/resumen/`. Es un dict plano armado a
 * mano por la acción, no un serializer: `importe` y `saldo` son decimales en
 * string y `referencia`, `cobro_id` y `pago_id` pueden venir en `null`.
 */
export interface MovimientoCuentaBancaria {
  id: number;
  /** Fecha "YYYY-MM-DD". */
  fecha: string;
  concepto: string | null;
  referencia: string | null;
  tipo_movimiento: TipoMovimientoCuenta;
  importe: string;
  saldo: string;
  estatus: EstatusMovimientoCuenta;
  origen: string | null;
  cobro_id: number | null;
  pago_id: number | null;
}

/**
 * Respuesta de `GET /finanzas/cuentas-bancarias/{id}/resumen/`.
 *
 * La acción devuelve además `id`, `alias`, `numero_cuenta`, `banco` y `moneda`.
 * No se declaran a propósito: los cuatro primeros ya los tiene el renglón que
 * el listado cargó y le pasa al diálogo, y de `banco`/`moneda` no consta si
 * viajan como nombre resuelto o como id crudo. El diálogo usa `banco_nombre` y
 * `moneda_codigo` de la `CuentaBancaria`, cuyo tipo sí está confirmado, en vez
 * de apostar por una forma sin verificar.
 *
 * DEFECTO CONOCIDO Y ACEPTADO DEL BACKEND: `total_cargos_mes` solo suma los
 * movimientos en estatus `Pendiente`, mientras `total_abonos_mes` los suma
 * todos, cancelados incluidos. Como cerrar una conciliación mensual mueve los
 * movimientos de `Pendiente` a `Conciliado` en bloque, `total_cargos_mes` cae a
 * "0.00" en cuanto hay una conciliación cerrada del mes. La corrección se
 * investigó y se revirtió a propósito. NO se compensa aquí: los totales se
 * muestran tal cual, etiquetados como cifras del mes, y cada movimiento expone
 * su `estatus` para que el usuario pueda ver por qué no cuadran.
 */
export interface ResumenCuentaBancaria {
  /**
   * Decimal en string. Ver el defecto conocido descrito arriba.
   *
   * `saldo_actual` TAMBIÉN viaja en esta respuesta y a propósito NO se declara:
   * el saldo se lee del renglón del listado para que el diálogo y la fila no
   * puedan discrepar (ver `BankAccountSummaryDialog`).
   */
  total_cargos_mes: string;
  total_abonos_mes: string;
  ultimos_movimientos: MovimientoCuentaBancaria[];
}
