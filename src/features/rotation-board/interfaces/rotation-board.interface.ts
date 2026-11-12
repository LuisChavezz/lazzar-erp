/**
 * Contrato de `GET /planeacion/tablero-rotacion/` (nucleo-erp PRs #1083 y
 * #1084), confirmado contra el código y contra respuestas reales.
 *
 * - Las CANTIDADES llegan como número JSON con decimales (`5758.0`);
 *   `resurtido_sugerido`, `pedidos`, `clientes`, `variantes` y
 *   `fabricable_con_existencia` llegan enteros.
 * - Con `agrupar=producto`, `variante_id`/`sku`/`color`/`talla` y los campos
 *   de fabricación llegan `null` (salvo `bom_con_alertas`, `false`) y aparece
 *   `variantes_con_bom`.
 * - Importes (#1109): `importe_por_moneda` por fila y en `resumen`, `{}` sin
 *   venta y `null` sin permiso de importes (ver `utils/rotationBoardAmounts`;
 *   `getRotationBoardPage` normaliza una clave ausente a `null`).
 *   `importe_vendido` de la fila NO se tipa a propósito: vale `0` sin ventas y
 *   `null` con varias monedas, y no se ordena por él.
 */

import type { ImportePorMoneda } from "../utils/rotationBoardAmounts";

export const ROTATION_ESTADOS = ["RESURTIR", "SOBREINVENTARIO", "LENTO", "SIN_VENTA", "OK"] as const;
export type RotationEstado = (typeof ROTATION_ESTADOS)[number];

export const ROTATION_CLASES = ["A", "B", "C"] as const;
export type RotationClase = (typeof ROTATION_CLASES)[number];

export const ROTATION_FABRICACION = ["SIN_BOM", "ALCANZA", "NO_ALCANZA"] as const;
export type RotationFabricacion = (typeof ROTATION_FABRICACION)[number];

export const ROTATION_AGRUPAR = ["variante", "producto"] as const;
export type RotationAgrupar = (typeof ROTATION_AGRUPAR)[number];

/** Insumo que menos alcanza en el BOM de la variante. */
export interface RotationLimitante {
  componente_id: number;
  componente_nombre: string;
}

export interface RotationBoardRow {
  producto_id: number;
  producto_nombre: string;
  categoria_id: number | null;
  categoria_nombre: string | null;
  /** `null` con `agrupar=producto`. */
  variante_id: number | null;
  sku: string | null;
  color: string | null;
  talla: string | null;
  /** Cuántas variantes suma la fila (1 por variante). */
  variantes: number;
  /** Solo con `agrupar=producto`. */
  variantes_con_bom?: number;
  vendido_periodo: number;
  vendido_periodo_anterior: number;
  /** `null` si en el periodo anterior no se vendió. */
  tendencia_pct: number | null;
  venta_semanal: number;
  /** Piezas por semana, de la más antigua a la actual (largo = `semanas`). */
  serie_semanal: number[];
  pedidos: number;
  clientes: number;
  /** "YYYY-MM-DD" (hora de México). */
  ultima_venta: string | null;
  dias_sin_venta: number | null;
  existencia: number;
  en_proceso: number;
  disponible: number;
  cobertura_semanas: number | null;
  resurtido_sugerido: number;
  /** Importe vendido en el periodo por moneda; `{}` sin venta, `null` sin permiso. */
  importe_por_moneda: ImportePorMoneda | null;
  tiene_bom: boolean;
  fabricable_con_existencia: number | null;
  limitante: RotationLimitante | null;
  bom_con_alertas: boolean;
  puede_fabricar_resurtido: boolean | null;
  clase_abc: RotationClase;
  participacion_pct: number;
  estado: RotationEstado;
  candidato_descontinuar: boolean;
}

export interface RotationBoardParametros {
  semanas: number;
  semanas_objetivo: number;
  dias_sin_venta: number;
  agrupar: RotationAgrupar;
  /** "YYYY-MM-DD" (hora de México). */
  desde: string;
  hasta: string;
}

/**
 * Resumen del conjunto. Lo cambian la búsqueda, los parámetros de cálculo y
 * la `sucursal` (acota venta, existencia, en proceso y capacidad), pero NO
 * `clase`, `estado`, `solo_candidatos`, `fabricacion`, el orden ni la página:
 * por eso las tarjetas se mantienen al filtrar desde ellas.
 */
export interface RotationBoardResumen {
  articulos: number;
  vendido_periodo: number;
  vendido_periodo_anterior: number;
  tendencia_pct: number | null;
  existencia: number;
  en_proceso: number;
  resurtido_sugerido: number;
  /** Importe vendido del conjunto por moneda; `{}` sin venta, `null` sin permiso. */
  importe_por_moneda: ImportePorMoneda | null;
  por_clase: Record<RotationClase, number>;
  por_estado: Record<RotationEstado, number>;
  candidatos_descontinuar: number;
  con_bom: number;
  resurtir_sin_bom: number;
  resurtir_sin_material: number;
}

/** Sobre de la respuesta: sin `next`/`previous` (pagina en Python). */
export interface RotationBoardResponse {
  parametros: RotationBoardParametros;
  resumen: RotationBoardResumen;
  count: number;
  page: number;
  page_size: number;
  results: RotationBoardRow[];
}
