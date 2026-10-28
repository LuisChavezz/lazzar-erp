/**
 * Sucursal de una cotización (EC-622). No es un campo del formulario: sale del
 * contexto. Al crear, la del workspace; al editar, la que ya trae el registro y,
 * solo si no tiene, la del workspace. Nunca una sucursal fija: si no hay ninguna
 * válida, el guardado se bloquea. Enviar `null` lo acepta el alta, pero
 * autorizar esa cotización después falla en el backend (el `Pedido` exige
 * sucursal).
 */
export const resolveQuoteSucursal = (
  recordSucursal: number | null | undefined,
  workspaceBranchId: number | null,
): number | null => recordSucursal || workspaceBranchId || null;

/**
 * Por qué se bloqueó el guardado. Si la lista de sucursales no cargó, el
 * usuario puede sí tener una sucursal válida: pedirle que la elija lo
 * confundiría.
 */
export const getQuoteSinSucursalMessage = (isBranchesError: boolean): string =>
  isBranchesError
    ? "No se pudieron cargar tus sucursales para asignarla a la cotización. Recarga la página e inténtalo de nuevo."
    : "Tu espacio de trabajo no tiene una sucursal válida. Selecciona una sucursal en el encabezado para guardar la cotización.";
