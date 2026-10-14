import type { TipoCompra } from "../interfaces/purchase-order.interface";

/**
 * Valores de `PurchaseOrder.tipo_compra` confirmados contra el backend
 * (`OrdenCompra.TipoCompra`). Decide la serie del folio al confirmar la orden;
 * por eso, una vez con folio, ya no puede cambiarse.
 *
 * El objeto con llaves tipadas obliga a TypeScript a exigir las dos entradas
 * (`satisfies`). Las etiquetas son las del backend (`tipo_compra_label`); en
 * pantalla se prefiere ese campo cuando la orden ya está cargada, y este mapa
 * alimenta el select del formulario y el filtro del listado.
 */
const TIPO_COMPRA_LABELS = {
  MP: "Materia prima",
  PT: "Producto terminado",
} satisfies Record<TipoCompra, string>;

/** Default del backend cuando no se manda `tipo_compra`. */
export const DEFAULT_TIPO_COMPRA: TipoCompra = "MP";

/** Opciones en el orden en que se ofrecen (el default primero). */
export const TIPO_COMPRA_OPTIONS: { value: TipoCompra; label: string }[] = (
  Object.keys(TIPO_COMPRA_LABELS) as TipoCompra[]
).map((value) => ({ value, label: TIPO_COMPRA_LABELS[value] }));

/** Tupla para `z.enum`: misma fuente que las opciones. */
export const TIPO_COMPRA_VALUES = ["MP", "PT"] as const satisfies readonly TipoCompra[];

/**
 * Etiqueta de un tipo de compra: la del backend si llega, si no la local, y el
 * código crudo para un valor que este mapa no conozca.
 */
export const tipoCompraLabel = (tipo: string, backendLabel?: string | null): string =>
  backendLabel?.trim() || (TIPO_COMPRA_LABELS as Record<string, string>)[tipo] || tipo;
