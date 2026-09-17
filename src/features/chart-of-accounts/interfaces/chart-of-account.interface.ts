/**
 * Contrato de `/finanzas/cuentas-contables/` (`CuentaContableSerializer`, con
 * `fields = "__all__"` y sin campos calculados). Los nombres de las llaves se
 * conservan EN ESPAÑOL tal cual los devuelve el backend — no traducir.
 *
 * Igual que el resto de finanzas: la respuesta del listado es un ARREGLO PLANO
 * —la app `finanzas` no declara paginación—, así que no llega el envoltorio
 * `count`/`next`/`results` y no hay nada que paginar del lado del servidor.
 * `DataTable` busca, filtra y pagina en memoria sobre el catálogo completo.
 *
 * Listado y detalle devuelven la MISMA forma (un solo `serializer_class`, sin
 * `get_serializer_class`), por eso el diálogo de detalle se arma con la fila que
 * el listado ya tiene y no hace una consulta propia.
 *
 * ─── NO HAY FECHAS ───────────────────────────────────────────────────────────
 *
 * A diferencia de `Banco`, este modelo NO expone `created_at` ni `updated_at`:
 * no hay ninguna columna ni campo de fecha que mostrar.
 *
 * ─── `naturaleza` NO EXISTE ──────────────────────────────────────────────────
 *
 * La maqueta faker de contabilidad —retirada en EC-139, cuando este módulo la
 * sustituyó— inventaba `naturaleza` (deudora/acreedora), `saldo` y un `tipo` en
 * minúsculas. Nada de eso era contrato: la naturaleza contable real del modelo
 * es `tipo`, y el saldo de una cuenta no se expone por ningún endpoint.
 */

import type { CuentaContableTipo } from "../constants/chartOfAccountTipo";

export type { CuentaContableTipo };

export interface CuentaContable {
  id: number;
  /**
   * FK a `nucleo.Empresa`. La resuelve el BACKEND a partir del usuario
   * autenticado, y rechaza una empresa distinta. El cliente la LEE pero NUNCA la
   * envía (ver `CuentaContableCreate`).
   */
  empresa: number;
  /**
   * Código contable (p. ej. "1100"). `max_length=30`, puede llegar como `""` en
   * registros antiguos. ÚNICO por empresa cuando no está vacío: un duplicado
   * devuelve 400 en la llave `codigo` (ver `useCreateChartOfAccount`).
   */
  codigo: string;
  /** `max_length=200`. */
  nombre: string;
  tipo: CuentaContableTipo;
  /**
   * Nivel dentro de la jerarquía del catálogo. Default 1. Es un DATO libre: el
   * backend no lo deriva de `cuenta_padre` ni valida coherencia entre ambos.
   */
  nivel: number;
  /**
   * FK a la cuenta padre (`self`), nullable, `PROTECT` en el backend. Esta
   * pantalla lo MUESTRA en el detalle pero no lo captura: ver
   * `CuentaContableCreate`.
   */
  cuenta_padre: number | null;
  /**
   * `true` si la cuenta admite asientos directos. Las de agrupación —las que
   * solo suman a sus hijas— van en `false` y los selectores de póliza no las
   * ofrecen.
   */
  acepta_movimientos: boolean;
  activo: boolean;
}

/**
 * Cuerpo de alta y de edición (el PATCH manda exactamente estas llaves).
 *
 * OMITE a propósito:
 *  - `empresa`: la resuelve el backend; mandarla es un 400.
 *  - `cuenta_padre`: fuera del alcance de esta fase. Como la edición usa PATCH,
 *    NO mandarlo es justo lo que CONSERVA el valor que la cuenta ya tenga —
 *    incluirlo como `null` lo borraría.
 *  - `activo`: se administra con la acción de fila "Activar"/"Desactivar", no
 *    desde el formulario. Al no viajar en el PATCH, guardar el formulario nunca
 *    cambia el estatus por accidente. En el alta, el backend lo deja en `true`.
 */
export interface CuentaContableCreate {
  codigo: string;
  nombre: string;
  tipo: CuentaContableTipo;
  nivel: number;
  acepta_movimientos: boolean;
}

/**
 * Parámetros de `GET /finanzas/cuentas-contables/`. El `get_queryset` acepta
 * `codigo`, `nombre` (contains, sin distinguir mayúsculas), `tipo`, `nivel`,
 * `acepta_movimientos`, `activo` y `ordering` (solo `codigo` o `id`), con orden
 * por defecto `codigo, id`.
 *
 * Esta pantalla no los usa: trae el catálogo completo y `DataTable` filtra en
 * memoria, igual que bancos y cuentas bancarias. Se declaran porque el hook de
 * pólizas sí pide `acepta_movimientos`/`activo` al servidor y este módulo es el
 * dueño del recurso.
 */
export interface CuentaContableQueryParams {
  codigo?: string;
  nombre?: string;
  tipo?: CuentaContableTipo;
  nivel?: number;
  acepta_movimientos?: boolean;
  activo?: boolean;
  ordering?: "codigo" | "id" | "-codigo" | "-id";
}
