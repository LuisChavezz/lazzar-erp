/**
 * La categoría tiene alguna talla que se pueda usar: alguno de sus ids de
 * `tallas` está en el catálogo de tallas ACTIVAS (`GET /catalogo/talla/`, que
 * es lo que trae `useSizes`).
 *
 * Desde nucleo-erp #927 una categoría sin tallas no acepta ninguna: ni muestras
 * en la cotización ni alta en catálogo de pedidos especiales. Una categoría
 * cuyas tallas están todas desactivadas trae `tallas` no vacío, pero tampoco
 * ofrece ninguna: `GET /catalogo/talla/?categoria_producto=<id>` responde `[]`.
 * Por eso se cruza con el catálogo activo en vez de mirar solo `tallas.length`.
 */
export const categoryHasSizes = (
  category: { tallas: readonly number[] },
  activeSizeIds: ReadonlySet<number>,
): boolean => category.tallas.some((id) => activeSizeIds.has(id));
