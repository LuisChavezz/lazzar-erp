/**
 * Contrato de `GET /inventarios/movimientos/auxiliar/` (Auxiliar de
 * movimientos: kardex de una variante). Fuente: `inventarios/api/auxiliar.py`
 * y la acción `auxiliar` de `MovimientoOperacionViewSet` (nucleo-erp PR #798).
 *
 * Cantidades: strings decimales con 4 decimales ("10.0000"). Costos: strings
 * con 2 decimales y SIN moneda. `fecha`: datetime ISO (UTC).
 */

/** Tipo de movimiento (`MovimientoInventario.tipo_movimiento`). */
export type MovementLedgerTm = "ENTRADA" | "SALIDA" | "AJUSTE" | "TRANSFERENCIA";

/** Cómo afectó el renglón al almacén (signo de la cantidad aplicada). */
export type MovementLedgerEfecto = "ENTRADA" | "SALIDA" | "SIN_CAMBIO";

/** Documento que originó el movimiento (`_documento` en el backend). */
export type MovementLedgerDocumento =
  | "RECEPCION"
  | "TRANSFERENCIA"
  | "ORDEN_PRODUCCION"
  | "AJUSTE"
  | "PEDIDO"
  | "MOVIMIENTO_MANUAL";

/**
 * Variante resuelta, y también cada renglón de `opciones` (el backend arma
 * ambas con la misma función `opcion()`).
 */
export interface MovementLedgerVariant {
  producto_variante_id: number;
  sku: string;
  sku_produccion: string | null;
  /** Nombre de la variante o, si no tiene, el del producto. */
  descripcion: string | null;
  color: string | null;
  talla: string | null;
  activo: boolean;
}

export interface MovementLedgerSummary {
  /** Saldo antes de `fecha_inicio` + `existencia_sin_movimiento`. */
  saldo_inicial: string;
  total_entradas: string;
  total_salidas: string;
  saldo_final: string;
  /** Existencia real hoy (del almacén filtrado, o de todos). */
  existencia_actual: string;
  /** Stock cargado sin movimiento (carga inicial); ya incluido en `saldo_inicial`. */
  existencia_sin_movimiento: string;
  costo_promedio: string;
  total_registros: number;
}

/** Renglón del kardex: una afectación de un almacén por un detalle de movimiento. */
export interface MovementLedgerRow {
  movimiento_inventario_id: number;
  /** Se repite en los dos renglones de una transferencia (salida y entrada). */
  movimiento_detalle_id: number;
  fecha: string | null;
  documento: MovementLedgerDocumento;
  folio_referencia: string | null;
  tm: MovementLedgerTm;
  costo_unitario: string;
  entradas: string;
  salidas: string;
  efecto: MovementLedgerEfecto;
  /** Saldo del almacén del renglón después del movimiento. */
  saldo_almacen: string;
  /** Saldo corrido del reporte (del almacén filtrado, o de todos). */
  saldo: string;
  /** `null` cuando el detalle no trae ubicación de la que derivar el almacén. */
  almacen_id: number | null;
  almacen_codigo: string | null;
  almacen_nombre: string | null;
  usuario: string;
  costo_promedio: string;
  observaciones: string | null;
}

/** La búsqueda resolvió una variante: kardex completo, del más antiguo al más reciente. */
export interface MovementLedgerResolved {
  variante: MovementLedgerVariant;
  opciones: [];
  resumen: MovementLedgerSummary;
  results: MovementLedgerRow[];
}

/**
 * La búsqueda no resolvió una sola variante: 0 coincidencias (vacío) o de 2 a
 * `MOVEMENT_LEDGER_MAX_OPTIONS`. Esta forma NO trae `resumen` ni `results`.
 */
export interface MovementLedgerOptions {
  variante: null;
  opciones: MovementLedgerVariant[];
}

export type MovementLedgerResponse = MovementLedgerResolved | MovementLedgerOptions;

/** Tope de `opciones` en el backend (`LIMITE_OPCIONES`); con este largo puede haber más. */
export const MOVEMENT_LEDGER_MAX_OPTIONS = 20;

/** Se manda `q` o `producto_variante` (si van los dos, el backend ignora `q`). */
export type MovementLedgerTarget =
  | { q: string; producto_variante?: undefined }
  | { producto_variante: number; q?: undefined };

export type MovementLedgerParams = MovementLedgerTarget & {
  almacen?: number;
  /** `YYYY-MM-DD`; va siempre junto con `fecha_final`. */
  fecha_inicio?: string;
  fecha_final?: string;
};

export const isResolvedMovementLedger = (
  response: MovementLedgerResponse,
): response is MovementLedgerResolved => response.variante !== null;
