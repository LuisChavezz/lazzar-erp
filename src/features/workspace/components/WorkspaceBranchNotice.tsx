"use client";

import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { useValidWorkspaceBranchId } from "../hooks/useValidWorkspaceBranchId";
import {
  getSinSucursalMessage,
  getSinSucursalTitle,
  type WorkspaceBranchDocument,
} from "../utils/workspaceBranchMessages";

/**
 * Aviso persistente de un alta que no se puede guardar porque el workspace no
 * tiene una sucursal válida. Se pinta desde que se abre el formulario, no solo
 * al pulsar Guardar; el bloqueo del guardado lo hace el propio formulario con
 * el mismo `useValidWorkspaceBranchId` (misma consulta en caché).
 *
 * Mientras la lista carga no avisa nada: `branchId` es `null` sin que falte la
 * sucursal.
 *
 * `verbo` es la acción bloqueada que nombran el título y el mensaje; sin él,
 * "guardar" (los textos de siempre).
 *
 * `visible` (opcional) es para un llamador que YA decidió si falta la sucursal
 * con una regla propia (la edición de cotización solo avisa si el registro
 * tampoco trae una): entonces se pinta según `visible` y la consulta solo
 * elige el texto (lista fallida o sin sucursal). Sin `visible`, el aviso
 * decide como siempre a partir del workspace.
 */
export function WorkspaceBranchNotice({
  documento,
  verbo,
  visible,
}: {
  documento: WorkspaceBranchDocument;
  verbo?: string;
  visible?: boolean;
}) {
  const { branchId, isLoading, isError } = useValidWorkspaceBranchId();
  const isVisible = visible ?? (branchId === null && !isLoading);
  if (!isVisible) return null;
  return (
    <SectionErrorNotice
      title={getSinSucursalTitle(verbo)}
      message={getSinSucursalMessage(isError, documento, verbo)}
    />
  );
}
