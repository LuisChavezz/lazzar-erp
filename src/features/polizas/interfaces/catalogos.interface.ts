/**
 * Contrato del catálogo de CENTROS DE COSTO que alimenta los selectores de los
 * movimientos de una póliza: `/finanzas/centros-costo/`
 * (`CentroCostoSerializer`, con `fields = "__all__"`). Nombres de llaves EN
 * ESPAÑOL tal cual los devuelve el backend — no traducir.
 *
 * ─── POR QUÉ VIVE AQUÍ Y NO EN UN MÓDULO PROPIO ──────────────────────────────
 *
 * Este catálogo merece su propia pantalla de CRUD (EC-140), que hoy NO existe:
 * no hay ningún `features/centros-costo/` en el proyecto ni otro hook que lo
 * lea. Aquí solo se declara lo que el selector de la póliza necesita.
 *
 * CANDIDATO A EXTRACCIÓN: cuando EC-140 construya ese módulo, este tipo y su
 * hook (`useCentrosCosto`) deben MUDARSE ahí y `polizas` importarlos — el mismo
 * camino que ya recorrieron las CUENTAS CONTABLES en EC-139, que ahora viven en
 * `features/chart-of-accounts/` y esta póliza consume desde allá.
 *
 * Como en el resto de finanzas: arreglo PLANO (sin paginación).
 */

/**
 * Centro de costo.
 *
 * NO existe `area`, `presupuesto` ni `gasto_real`: los inventaba la maqueta
 * faker de contabilidad, retirada en EC-139.
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
 * Parámetros de `GET /finanzas/centros-costo/`. El `get_queryset` acepta
 * `codigo`, `nombre`, `activo` y `ordering`.
 */
export interface CentroCostoQueryParams {
  activo?: boolean;
}
