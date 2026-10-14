/**
 * Valores de `PurchaseOrder.tipo_compra` confirmados contra el backend
 * (`OrdenCompra.TipoCompra`). Decide la serie del folio al confirmar la orden;
 * por eso, una vez con folio, ya no puede cambiarse.
 *
 * Fuente ÚNICA: el tipo `TipoCompra`, la tupla para `z.enum` y las opciones
 * del formulario y del filtro del listado salen de este mapa, así que agregar
 * un valor es editar solo aquí. Las etiquetas son las del backend
 * (`tipo_compra_label`); en pantalla se prefiere ese campo cuando la orden ya
 * está cargada.
 */
const TIPO_COMPRA_LABELS = {
  MP: "Materia prima",
  PT: "Producto terminado",
} as const;

export type TipoCompra = keyof typeof TIPO_COMPRA_LABELS;

/** Tupla para `z.enum`, en el orden del mapa (el default primero). */
export const TIPO_COMPRA_VALUES = Object.keys(TIPO_COMPRA_LABELS) as [
  TipoCompra,
  ...TipoCompra[],
];

/** Default del backend cuando no se manda `tipo_compra`. */
export const DEFAULT_TIPO_COMPRA: TipoCompra = "MP";

/** Opciones `{ value, label }` del select del formulario y del filtro del listado. */
export const TIPO_COMPRA_OPTIONS: { value: TipoCompra; label: string }[] =
  TIPO_COMPRA_VALUES.map((value) => ({ value, label: TIPO_COMPRA_LABELS[value] }));

/**
 * Etiqueta de un tipo de compra: la del backend si llega, si no la local, y el
 * código crudo para un valor que este mapa no conozca.
 */
export const tipoCompraLabel = (tipo: string, backendLabel?: string | null): string =>
  backendLabel?.trim() || (TIPO_COMPRA_LABELS as Record<string, string>)[tipo] || tipo;
