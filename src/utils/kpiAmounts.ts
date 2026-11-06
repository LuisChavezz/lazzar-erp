/**
 * Visibilidad de importes en los indicadores y resúmenes que el backend filtra
 * por permiso (`puede_ver_importes`): KPIs de OC, recepciones y proveedores
 * (regla de compras) y de pedidos y resumen comercial del cliente (regla de
 * importes de pedidos, EC-784). Cada respuesta trae su bandera y cada módulo
 * pone su propio "porqué"; aquí solo vive lo común.
 */

/**
 * ¿Se muestran los importes? Falla cerrado: solo un `true` explícito los
 * muestra. Un `false` o una bandera ausente los ocultan, aunque la respuesta
 * traiga montos.
 */
export const canSeeKpiAmounts = (puedeVerImportes: boolean | undefined): boolean =>
  puedeVerImportes === true;

/** Lo que ocupa el lugar de un importe que el usuario no puede ver. */
export const HIDDEN_KPI_AMOUNT_TEXT = "No visible";
