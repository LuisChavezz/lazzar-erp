/**
 * Contrato de `/finanzas/centros-costo/` (`CentroCostoSerializer`, con
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
 * ─── EL MODELO ES PLANO ──────────────────────────────────────────────────────
 *
 * No hay padre ni jerarquía (a diferencia de `CuentaContable`, que sí declara
 * `cuenta_padre` y `nivel`), no hay `tipo`, no hay relación con `sucursal` y no
 * hay fechas: el modelo NO expone `created_at` ni `updated_at`, así que no hay
 * ninguna columna ni campo de fecha que mostrar.
 *
 * ─── `area`, `presupuesto` Y `gasto_real` NO EXISTEN ─────────────────────────
 *
 * Los inventaba la maqueta faker de contabilidad, retirada en EC-139. Nada de
 * eso es contrato: este serializer expone exactamente los seis campos de abajo.
 */

export interface CostCenter {
  id: number;
  /**
   * FK a `nucleo.Empresa`. La resuelve el BACKEND a partir del usuario
   * autenticado. El cliente la LEE pero NUNCA la envía (ver `CostCenterCreate`).
   */
  empresa: number;
  /**
   * Código del centro de costo. `max_length=30`, puede llegar como `""` en
   * registros antiguos.
   *
   * ÚNICO POR EMPRESA SOLO ENTRE LOS ACTIVOS: el backend valida la unicidad
   * contra las filas con `activo=true`, así que el código de uno dado de baja
   * queda libre para reutilizarse. Un duplicado devuelve 400 en la llave
   * `codigo` (ver `setCostCenterFieldErrors`), y eso incluye al PATCH que
   * REACTIVA una fila cuyo código ya lo tomó otra activa (ver
   * `useToggleCostCenterActivo`).
   */
  codigo: string;
  /** `max_length=200`, default "". */
  nombre: string;
  /** Texto libre, nullable en el modelo. */
  descripcion: string | null;
  /**
   * Baja LÓGICA. El `DELETE` del endpoint tampoco borra la fila: pone este campo
   * en `false` y el registro sigue llegando en el GET por defecto. Esta pantalla
   * no usa ese verbo: administra el ciclo de vida con un único PATCH en las dos
   * direcciones (ver `setCostCenterActivo`).
   */
  activo: boolean;
}

/**
 * Cuerpo de alta y de edición (el PATCH manda exactamente estas llaves).
 *
 * OMITE a propósito:
 *  - `empresa`: la resuelve el backend; mandarla es un 400.
 *  - `activo`: se administra con la acción de fila "Dar de baja"/"Reactivar", no
 *    desde el formulario. Al no viajar en el PATCH, guardar el formulario nunca
 *    reactiva por accidente un centro dado de baja. En el alta, el backend lo
 *    deja en `true`.
 */
export interface CostCenterCreate {
  codigo: string;
  nombre: string;
  /** `null` cuando el campo queda vacío: el modelo lo declara nullable. */
  descripcion: string | null;
}

/**
 * Parámetros de `GET /finanzas/centros-costo/`. El `get_queryset` acepta
 * `codigo` y `nombre` (contains, sin distinguir mayúsculas), `activo` y
 * `ordering` (solo `codigo` o `id`).
 *
 * ─── CUIDADO CON `activo` ────────────────────────────────────────────────────
 *
 * El backend interpreta `?activo=` con CUALQUIER valor no verdadero —incluido el
 * vacío— como "solo los inactivos". Para pedir TODO el catálogo hay que OMITIR
 * la llave, no mandarla vacía: Axios descarta las llaves `undefined`, así que
 * basta con no pasar el parámetro (ver `getCostCenters`).
 *
 * La pantalla del catálogo no los usa: trae la lista completa y `DataTable`
 * filtra en memoria, igual que bancos y el plan de cuentas. Se declaran porque
 * el selector de pólizas sí pide `activo` al servidor y este módulo es el dueño
 * del recurso.
 */
export interface CostCenterQueryParams {
  codigo?: string;
  nombre?: string;
  activo?: boolean;
  ordering?: "codigo" | "id" | "-codigo" | "-id";
}
