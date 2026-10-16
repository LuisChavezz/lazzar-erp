/**
 * Clave de la unidad de medida de un indicador de recepciones ("PZA", "MTS");
 * los productos sin unidad capturada (`unidad: null`) van aparte. Una sola
 * etiqueta para las tarjetas y sus drill-downs.
 */
export const unitLabel = (unidad: string | null): string => unidad ?? "Sin unidad";
