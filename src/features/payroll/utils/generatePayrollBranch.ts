import {
  getSinSucursalMessage,
  WORKSPACE_BRANCH_LOADING_MESSAGE,
  type WorkspaceBranchDocument,
} from "@/src/features/workspace/utils/workspaceBranchMessages";

/** Cómo nombran la generación los avisos de "sin sucursal". */
export const GENERATE_PAYROLL_SUCURSAL_DOCUMENT: WorkspaceBranchDocument = {
  asignarA: "a la quincena",
  guardar: "la quincena",
};

/** Acción bloqueada que nombran el título y el mensaje del aviso. */
export const GENERATE_PAYROLL_BLOCKED_VERB = "generar";

/**
 * ¿Se puede generar, y para qué sucursal? La generación toma SIEMPRE la
 * sucursal del workspace (`useValidWorkspaceBranchId`), sin elegirla:
 *
 * - `ready`: hay una sucursal válida; se genera para ella.
 * - `loading`: la lista de sucursales aún carga; no se sabe todavía si falta,
 *   así que no se avisa nada pero tampoco se genera.
 * - `missing`: no hay sucursal válida (o la lista no cargó); el aviso
 *   persistente lo explica y el botón queda bloqueado.
 *
 * `message` es lo que se muestra si aun así se intenta enviar.
 */
export type GenerateBranchGate =
  | { status: "ready"; branchId: number }
  | { status: "loading"; message: string }
  | { status: "missing"; message: string };

export const getGenerateBranchGate = ({
  branchId,
  isLoading,
  isError,
}: {
  branchId: number | null;
  isLoading: boolean;
  isError: boolean;
}): GenerateBranchGate => {
  if (branchId !== null) return { status: "ready", branchId };
  if (isLoading) {
    return {
      status: "loading",
      message: WORKSPACE_BRANCH_LOADING_MESSAGE.replace("guardar", GENERATE_PAYROLL_BLOCKED_VERB),
    };
  }
  return {
    status: "missing",
    message: getSinSucursalMessage(
      isError,
      GENERATE_PAYROLL_SUCURSAL_DOCUMENT,
      GENERATE_PAYROLL_BLOCKED_VERB
    ),
  };
};
