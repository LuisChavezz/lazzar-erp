/** Un estado del embudo: cuántas oportunidades hay y cuánto suman. */
export interface OpportunityEmbudoEstado {
  /**
   * Valor crudo del backend. Hoy son los cinco de `ESTADO_OPORTUNIDAD_VALUES`,
   * pero se tipa como texto: un estado que el catálogo no conozca también se
   * muestra (cuenta en `total`).
   */
  estado: string;
  cantidad: number;
  /** Suma de `monto_estimado`, decimal en texto ("109975.49"). Sin moneda. */
  monto: string;
}

/**
 * Respuesta de `GET /ventas/oportunidades/embudo/`: la distribución de las
 * oportunidades por `estado`.
 *
 * - `estados` trae SIEMPRE los cinco (con `cantidad: 0` y `monto: "0.00"` el
 *   que no tiene nada), en el orden del backend.
 * - `total` es la suma de los cinco, `Perdida` incluida.
 * - Los montos suman oportunidades sin moneda: son una referencia, no un
 *   importe en pesos.
 */
export interface OpportunityEmbudo {
  estados: OpportunityEmbudoEstado[];
  total: { cantidad: number; monto: string };
}
