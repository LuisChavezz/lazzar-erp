import type { PermissionRequirement } from "@/src/utils/permissions";
import type { AccionBitacora, TipoDocumento } from "../interfaces/document-audit.interface";

/**
 * Códigos que abren la bitácora: cualquiera de los dos (superusuario y admin de
 * empresa pasan siempre). Los mismos que exige el backend en sus tres
 * endpoints (`CODIGOS_BITACORA`, `auditoria/api/views.py`) y que acepta la regla
 * `/system` de `routePermissions`.
 */
export const DOCUMENT_AUDIT_PERMISSION: PermissionRequirement = ["R-CORE", "R-CORE-REPORTES"];

/** Ruta de la pantalla "Bitácora de documentos". */
export const DOCUMENT_AUDIT_PATH = "/system/document-audit";

/** Los 17 `tipo_documento` que registra el backend (`DOCUMENTOS` en `auditoria/bitacora.py`). */
export const TIPOS_DOCUMENTO = [
  "pedido",
  "orden_compra",
  "recepcion",
  "orden_produccion",
  "orden_bordado",
  "orden_reflejante",
  "orden_corte_manga",
  "picking",
  "packing",
  "transferencia",
  "factura",
  "factura_proveedor",
  "cobro",
  "pago",
  "poliza",
  "movimiento_inventario",
  "ajuste_inventario",
] as const;

/** Las 5 acciones (`BitacoraDocumento.Accion`). */
export const ACCIONES_BITACORA = ["crear", "estatus", "baja", "restaurar", "eliminar"] as const;

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  pedido: "Pedido",
  orden_compra: "Orden de compra",
  recepcion: "Recepción",
  orden_produccion: "Orden de producción",
  orden_bordado: "Orden de bordado",
  orden_reflejante: "Orden de reflejante",
  orden_corte_manga: "Orden de corte de manga",
  picking: "Surtido (picking)",
  packing: "Embarque (packing)",
  transferencia: "Transferencia",
  factura: "Factura",
  factura_proveedor: "Factura de proveedor",
  cobro: "Cobro",
  pago: "Pago",
  poliza: "Póliza",
  movimiento_inventario: "Movimiento de inventario",
  ajuste_inventario: "Ajuste de inventario",
};

/**
 * Etiquetas de los filtros. El renglón de cada evento usa `accion_display` del
 * backend; estas son para el selector, que no tiene filas de dónde leerlas.
 */
export const ACCION_BITACORA_LABELS: Record<AccionBitacora, string> = {
  crear: "Creado",
  estatus: "Cambio de estatus",
  baja: "Dado de baja",
  restaurar: "Restaurado",
  eliminar: "Eliminado",
};

/**
 * Contra la lista y no contra las llaves de un objeto: un `tipo` como
 * `constructor` no resuelve a nada heredado de `Object.prototype`.
 */
export const isTipoDocumento = (value: string): value is TipoDocumento =>
  (TIPOS_DOCUMENTO as readonly string[]).includes(value);

export const isAccionBitacora = (value: string): value is AccionBitacora =>
  (ACCIONES_BITACORA as readonly string[]).includes(value);

/** Etiqueta del tipo; un tipo que el frontend aún no conoce se muestra tal cual. */
export const getTipoDocumentoLabel = (tipo: string): string =>
  isTipoDocumento(tipo) ? TIPO_DOCUMENTO_LABELS[tipo] : tipo;

/**
 * Tope de eventos de `linea-tiempo`. El backend devuelve los 500 MÁS ANTIGUOS y
 * descarta el resto sin avisar: con exactamente este número la vista advierte
 * que puede faltar lo más reciente.
 */
export const DOCUMENT_TIMELINE_MAX_EVENTS = 500;
