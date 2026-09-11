/**
 * Contratos de los dos CATÁLOGOS que alimentan los selectores de los movimientos
 * de una póliza: `/finanzas/cuentas-contables/` (`CuentaContableSerializer`) y
 * `/finanzas/centros-costo/` (`CentroCostoSerializer`), ambos con
 * `fields = "__all__"`. Nombres de llaves EN ESPAÑOL tal cual los devuelve el
 * backend — no traducir.
 *
 * ─── POR QUÉ VIVEN AQUÍ Y NO EN UN MÓDULO PROPIO ─────────────────────────────
 *
 * Estos dos catálogos merecen su propia pantalla de CRUD (EC-139 y EC-140), que
 * hoy NO existe: no hay ningún `features/cuentas-contables/` ni
 * `features/centros-costo/` en el proyecto, ni ningún hook que los lea. Aquí
 * solo se declara y se lee lo que los selectores de la póliza necesitan.
 *
 * CANDIDATOS A EXTRACCIÓN: cuando EC-139/EC-140 construyan esos módulos, estos
 * tipos y sus hooks (`useCuentasContables`, `useCentrosCosto`) deben MUDARSE ahí
 * y `polizas` importarlos, exactamente como `payments` hace con `banks` y como
 * su `cuenta-por-pagar.interface.ts` documenta para EC-133. Hasta entonces
 * duplicar el catálogo en un módulo vacío sería peor que tenerlo aquí.
 *
 * Como en el resto de finanzas: arreglo PLANO (sin paginación).
 */

/** Naturaleza contable de la cuenta, tal cual el enum del backend. */
export type CuentaContableTipo =
  | "Activo"
  | "Pasivo"
  | "Capital"
  | "Ingreso"
  | "Gasto"
  | "Costo";

/**
 * Cuenta del catálogo contable.
 *
 * NO existe `naturaleza` (deudora/acreedora) ni `saldo`: los inventa la maqueta
 * faker de `src/features/accounting/`. El modelo real solo tiene lo de abajo, y
 * el saldo de una cuenta no se expone por ningún endpoint.
 */
export interface CuentaContable {
  id: number;
  /** FK a `nucleo.Empresa`, resuelta por el servidor. Solo lectura de hecho. */
  empresa: number;
  /** Código contable (p. ej. "1100"). `max_length=30`, default "". */
  codigo: string;
  /** `max_length=200`, default "". */
  nombre: string;
  tipo: CuentaContableTipo;
  /** Nivel dentro de la jerarquía del catálogo. Default 1. */
  nivel: number;
  /** FK a la cuenta padre (`self`), nullable. */
  cuenta_padre: number | null;
  /**
   * `true` si la cuenta admite asientos directos. Las cuentas de agrupación (las
   * que solo suman a sus hijas) van en `false` y NO deben ofrecerse en el
   * selector de un movimiento — ver `useCuentasContables`.
   */
  acepta_movimientos: boolean;
  activo: boolean;
}

/**
 * Centro de costo.
 *
 * NO existe `area`, `presupuesto` ni `gasto_real`: los inventa la maqueta faker
 * de `src/features/accounting/`.
 */
export interface CentroCosto {
  id: number;
  /** FK a `nucleo.Empresa`, resuelta por el servidor. Solo lectura de hecho. */
  empresa: number;
  /** `max_length=30`, default "". */
  codigo: string;
  /** `max_length=200`, default "". */
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

/**
 * Parámetros de `GET /finanzas/cuentas-contables/`. El `get_queryset` acepta
 * `codigo`, `nombre`, `tipo`, `nivel`, `acepta_movimientos`, `activo` y
 * `ordering`; aquí solo se declaran los que este módulo usa.
 */
export interface CuentaContableQueryParams {
  acepta_movimientos?: boolean;
  activo?: boolean;
}

/**
 * Parámetros de `GET /finanzas/centros-costo/`. El `get_queryset` acepta
 * `codigo`, `nombre`, `activo` y `ordering`.
 */
export interface CentroCostoQueryParams {
  activo?: boolean;
}
