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
 */
export function WorkspaceBranchNotice({
  documento,
  verbo,
}: {
  documento: WorkspaceBranchDocument;
  verbo?: string;
}) {
  const { branchId, isLoading, isError } = useValidWorkspaceBranchId();
  if (branchId !== null || isLoading) return null;
  return (
    <SectionErrorNotice
      title={getSinSucursalTitle(verbo)}
      message={getSinSucursalMessage(isError, documento, verbo)}
    />
  );
}
