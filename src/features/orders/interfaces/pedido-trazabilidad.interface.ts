/**
 * Contrato de `GET /ventas/pedidos/{id}/trazabilidad/`: en qué paso va el
 * pedido, cuánto lleva y si va a tiempo. Lo CALCULA el backend en cada lectura
 * a partir de ventas, WMS, producción y finanzas (no se persiste: no hay
 * historial ni línea de tiempo). La UI pinta estos valores tal cual: ningún
 * porcentaje, total ni semáforo se recalcula en el cliente.
 *
 * Unidad común: piezas. Los conteos llegan como entero cuando son exactos y
 * como flotante con 2 decimales si no; los porcentajes, como flotante con 1
 * decimal (acotados a 100).
 *
 * Todos los enums son strings planos del servicio y se tipan como la unión
 * COMPLETA, aunque hoy no todos los valores se alcancen.
 */

/** Estado de un paso o de un proceso de maquila. */
export type TrazabilidadEstado = "no_aplica" | "pendiente" | "en_proceso" | "completo" | "detenido";

/**
 * Semáforo del pedido. `gris` = no evaluable (cancelado, sin clasificación,
 * clasificación X o sin fecha compromiso); `terminado` = todo embarcado.
 */
export type TrazabilidadSemaforo = "gris" | "terminado" | "rojo" | "amarillo" | "verde";

export type TrazabilidadPasoClave =
  | "confirmado"
  | "programado"
  | "surtido"
  | "maquila"
  | "empacado"
  | "embarcado";

export type TrazabilidadProcesoClave = "bordado" | "reflejante" | "corte_manga" | "op";

export type TrazabilidadOrdenTipo = "BORDADO" | "REFLEJANTE" | "CORTE_MANGA" | "OP";

/**
 * Campos comunes a pasos y procesos. `pct` es `null` SOLO con `estado:
 * "no_aplica"`. `hecho`/`total` son `null` en `confirmado`, `maquila` y `op`;
 * en programado/surtido/empacado/embarcado `hecho` NO está acotado a `total`.
 */
interface TrazabilidadAvance {
  label: string;
  estado: TrazabilidadEstado;
  pct: number | null;
  hecho: number | null;
  total: number | null;
}

/**
 * Orden de trabajo VIGENTE del proceso: el backend excluye las inactivas y las
 * canceladas (a diferencia de `documentos[]` del detalle, que sí las lista).
 */
export interface TrazabilidadOrden {
  tipo: TrazabilidadOrdenTipo;
  id: number;
  folio: string | null;
  /** Etiqueta del estatus de la orden, ya en español. */
  estatus_label: string;
  pct: number;
  /** `null` en OP: su avance es por hitos de ruta crítica, no por piezas. */
  hecho: number | null;
  cubierto: number | null;
  detenida: boolean;
}

export interface TrazabilidadProceso extends TrazabilidadAvance {
  clave: TrazabilidadProcesoClave;
  /** Piezas contratadas para el proceso que ninguna orden cubre todavía. */
  sin_orden: number;
  ordenes: TrazabilidadOrden[];
}

export interface TrazabilidadPasoSimple extends TrazabilidadAvance {
  clave: Exclude<TrazabilidadPasoClave, "maquila">;
}

export interface TrazabilidadPasoMaquila extends TrazabilidadAvance {
  clave: "maquila";
  procesos: TrazabilidadProceso[];
}

/** Discriminado por `clave`: solo `maquila` trae `procesos`. */
export type TrazabilidadPaso = TrazabilidadPasoSimple | TrazabilidadPasoMaquila;

/**
 * Identidad del pedido según el endpoint. La página ya muestra folio, cliente
 * y clasificación desde el detalle, y `estatus_label` usa otro vocabulario
 * ("AUTORIZADA") que el badge local: nada de esto se pinta.
 */
export interface TrazabilidadPedido {
  id: number;
  folio: string | null;
  cliente: string | null;
  estatus_label: string;
  clasificacion: string | null;
  /**
   * Fecha-calendario `"YYYY-MM-DD"`, igual a `fecha_entrega_max` del detalle.
   * `null` sin clasificación, con clasificación X o sin fecha base.
   */
  fecha_compromiso: string | null;
  /** `fecha_compromiso - hoy` en días: NEGATIVO cuando ya venció. */
  dias_restantes: number | null;
  total_piezas: number;
}

export interface TrazabilidadResumen {
  paso_actual: TrazabilidadPasoClave;
  /** Promedio de surtido, maquila, empacado y embarcado aplicables. */
  avance: number;
  semaforo: TrazabilidadSemaforo;
  /** Texto libre ya formateado en español; se muestra tal cual. */
  motivos: string[];
  /**
   * Piezas de facturas EMITIDAS / piezas del pedido. No es la misma base que el
   * "Avance facturado" del seguimiento de factura (que cuenta Borradores), por
   * eso hoy no se muestra.
   */
  facturado_pct: number;
  /**
   * `null` tanto si el usuario no ve contabilidad como si el pedido no tiene
   * cuentas por cobrar: la respuesta no distingue los dos casos.
   */
  cobrado_pct: number | null;
}

export interface PedidoTrazabilidad {
  pedido: TrazabilidadPedido;
  resumen: TrazabilidadResumen;
  pasos: TrazabilidadPaso[];
}
