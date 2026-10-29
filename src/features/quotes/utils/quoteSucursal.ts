import {
  getSinSucursalMessage,
  WORKSPACE_BRANCH_LOADING_MESSAGE,
  type WorkspaceBranchDocument,
} from "@/src/features/workspace/utils/workspaceBranchMessages";

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

/** Guardado bloqueado porque la lista de sucursales todavía se está cargando. */
export const QUOTE_SUCURSAL_LOADING_MESSAGE = WORKSPACE_BRANCH_LOADING_MESSAGE;

/** La cotización en los textos del aviso compartido de sucursal. */
export const QUOTE_SUCURSAL_DOCUMENT: WorkspaceBranchDocument = {
  asignarA: "a la cotización",
  guardar: "la cotización",
};

/** Por qué se bloqueó el guardado (ver `getSinSucursalMessage`). */
export const getQuoteSinSucursalMessage = (isBranchesError: boolean): string =>
  getSinSucursalMessage(isBranchesError, QUOTE_SUCURSAL_DOCUMENT);
