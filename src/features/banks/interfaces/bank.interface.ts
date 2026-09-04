/**
 * Contrato de `/finanzas/bancos/` (ModelViewSet con `BancoSerializer`, que usa
 * `fields = "__all__"` y no agrega campos calculados ni de solo lectura). Los
 * nombres de las llaves se conservan EN ESPAÑOL tal cual los devuelve el
 * backend — no traducir.
 *
 * La respuesta del listado es un ARREGLO PLANO: la app `finanzas` no declara
 * paginación (no hay `DEFAULT_PAGINATION_CLASS` en la configuración de DRF), así
 * que NO llega el envoltorio `count`/`next`/`results` y no hay nada que paginar
 * del lado del servidor.
 *
 * El listado acepta `?nombre=`, `?codigo=`, `?swift=` (icontains), `?activo=` y
 * `?ordering=`, con orden por defecto `["nombre", "codigo", "id"]`. Hoy no se
 * usan: `DataTable` filtra y busca en memoria sobre el arreglo completo, y el
 * catálogo es lo bastante corto para traerlo entero.
 */
export interface Banco {
  id: number;
  /**
   * FK a `nucleo.Empresa`. La resuelve el BACKEND en el alta a partir del
   * usuario autenticado (`perform_create` → `_resolve_empresa`), y su
   * `validate()` rechaza una empresa distinta a la del usuario. Por eso el
   * cliente la LEE pero nunca la envía (ver `BancoCreate`).
   */
  empresa: number;
  /**
   * `null=True, blank=True` en el modelo, igual que `codigo`: el backend acepta
   * un banco sin nombre, así que el tipo admite `null` aunque el formulario del
   * frontend lo exija (ver `BankFormSchema`).
   */
  nombre: string | null;
  codigo: string | null;
  swift: string | null;
  observaciones: string | null;
  activo: boolean;
  /**
   * Timestamps ISO. Declarados `null=True` en el modelo pese a tener default
   * (`timezone.now`) y `auto_now`, de ahí el `| null` honesto. No se muestran
   * en el listado.
   */
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Cuerpo de alta y edición.
 *
 * Omite `empresa` a propósito (la resuelve el backend, ver arriba) y `activo`,
 * que se administra por su propia acción de la fila y NO desde el formulario:
 * como la edición usa PATCH, lo que no se envía conserva su valor actual, así
 * que guardar el formulario nunca reactiva ni desactiva un banco por accidente.
 */
export interface BancoCreate {
  nombre: string;
  codigo: string;
  swift: string | null;
  observaciones: string | null;
}
