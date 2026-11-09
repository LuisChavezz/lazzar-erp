import type { WorkspaceBranchDocument } from "@/src/features/workspace/utils/workspaceBranchMessages";

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
 * ¿La EDICIÓN se queda sin sucursal que enviar? Solo si el registro no trae
 * una Y el workspace tampoco tiene una válida, con su lista ya resuelta
 * (cargada o fallida; mientras carga no se sabe). Es exactamente el caso en
 * que `resolveQuoteSucursal` devuelve `null` y el guardado se bloquea, así que
 * el aviso persistente se pinta solo entonces (EC-753).
 *
 * Un registro CON sucursal nunca cuenta, aunque sea distinta de la del
 * workspace o el workspace no tenga ninguna: el backend valida la sucursal
 * contra la empresa del documento, no contra las sucursales del usuario, y el
 * guardado procede con la del registro.
 */
export const isQuoteSucursalMissing = (
  recordSucursal: number | null | undefined,
  workspace: { branchId: number | null; isLoading: boolean },
): boolean =>
  !recordSucursal && !workspace.isLoading && workspace.branchId === null;

/** La cotización en los textos del aviso compartido de sucursal. */
export const QUOTE_SUCURSAL_DOCUMENT: WorkspaceBranchDocument = {
  asignarA: "a la cotización",
  guardar: "la cotización",
};
