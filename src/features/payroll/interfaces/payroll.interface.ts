import type { EstadoNomina, TipoDetalleNomina } from "../constants/payrollChoices";

/**
 * Renglón de la nómina (`detalles[]`). Los montos llegan como decimal string.
 * `cantidad` y `unidad` son informativos: `cantidad` NO multiplica `monto`.
 */
export interface PayrollLine {
  id: number;
  codigo: string | null;
  concepto: string;
  tipo: TipoDetalleNomina;
  cantidad: number;
  unidad: string | null;
  /** Decimal(10,2) como string, ≥ 0. */
  monto: string;
  nomina: number;
}

/**
 * Nómina de un empleado por periodo (`/hr/nominas/`). Listado y detalle
 * comparten la forma, con `detalles` anidados. Los FK llegan como ID crudo.
 */
export interface Payroll {
  id: number;
  empresa: number;
  /** No se valida contra la sucursal del empleado: el cliente la deriva de él. */
  sucursal: number;
  empleado: number;
  /** "YYYY-MM-DD". */
  periodo_inicio: string;
  periodo_fin: string;
  fecha_pago: string | null;
  estado: EstadoNomina;
  /** Salario MENSUAL de referencia (informativo, no calcula nada). */
  salario_base: string | null;
  /** Informativos; valores por defecto del servidor. Nunca se envían. */
  dias_pagados: number;
  horas_extra_pagadas: string;
  observaciones: string | null;
  /** Solo lectura: el servidor los recalcula en cada guardado. */
  total_percepciones: string | null;
  total_deducciones: string | null;
  neto: string | null;
  creado_por: number | null;
  /** Datetime ISO. */
  fecha_generacion: string;
  detalles: PayrollLine[];
}

/** Renglón tal como se envía: sin `id` ni `nomina`. */
export interface PayrollLineWrite {
  codigo: string | null;
  concepto: string;
  tipo: TipoDetalleNomina;
  cantidad: number;
  unidad: string | null;
  monto: string;
}

/**
 * Alta individual. `empresa` y `sucursal` salen del empleado elegido. Nunca
 * viajan `estado` (el servidor la crea `pendiente`), `fecha_pago`,
 * `dias_pagados`, `horas_extra_pagadas` ni los campos de solo lectura.
 */
export interface PayrollCreate {
  empresa: number;
  sucursal: number;
  empleado: number;
  periodo_inicio: string;
  periodo_fin: string;
  salario_base: string | null;
  observaciones: string | null;
  detalles: PayrollLineWrite[];
}

/**
 * Edición (PATCH) de una nómina `pendiente`: solo lo editable. Empleado y
 * quincena son de solo lectura. `detalles` reemplaza TODOS los renglones.
 */
export interface PayrollUpdate {
  salario_base: string | null;
  observaciones: string | null;
  detalles: PayrollLineWrite[];
}

export interface PayrollUpdateVariables extends PayrollUpdate {
  id: number;
}

/** "Marcar como pagada": `estado` y `fecha_pago` en un solo PATCH. */
export interface PayrollPayVariables {
  id: number;
  fecha_pago: string;
}

/** Filtros de servidor del listado. */
export interface PayrollListParams {
  periodo_inicio__gte?: string;
  periodo_fin__lte?: string;
  sucursal?: number;
}

/** Cuerpo de `generar_periodo/`. Fechas SIEMPRE como string (un número da 500). */
export interface PayrollGenerateBody {
  periodo_inicio: string;
  periodo_fin: string;
  sucursal_id: number;
}

export interface PayrollGenerateResponse {
  creadas: number;
  ids: number[];
}
