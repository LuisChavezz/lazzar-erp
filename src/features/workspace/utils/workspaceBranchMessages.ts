/**
 * Textos del alta bloqueada por no tener una sucursal válida en el workspace
 * (`useValidWorkspaceBranchId`). Los comparten todos los formularios cuya
 * sucursal sale del workspace (cotización, empleado, generación de nómina).
 */

/** Guardado bloqueado porque la lista de sucursales todavía se está cargando. */
export const WORKSPACE_BRANCH_LOADING_MESSAGE =
  "Aún se están cargando tus sucursales. Intenta guardar de nuevo en un momento.";

/** El documento, en las dos formas que piden las frases del aviso. */
export interface WorkspaceBranchDocument {
  /** A qué se asigna la sucursal, con preposición: "a la cotización", "al empleado". */
  asignarA: string;
  /** Qué se guarda, con artículo: "la cotización", "el empleado". */
  guardar: string;
}

/**
 * Por qué se bloqueó el guardado. Si la lista de sucursales no cargó, el
 * usuario puede sí tener una sucursal válida: pedirle que la elija lo
 * confundiría.
 */
export const getSinSucursalMessage = (
  isBranchesError: boolean,
  documento: WorkspaceBranchDocument,
): string =>
  isBranchesError
    ? `No se pudieron cargar tus sucursales para asignarla ${documento.asignarA}. Recarga la página e inténtalo de nuevo.`
    : `Tu espacio de trabajo no tiene una sucursal válida. Selecciona una sucursal en el encabezado para guardar ${documento.guardar}.`;
