"use client";

import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { useValidWorkspaceBranchId } from "../hooks/useValidWorkspaceBranchId";
import { getSinSucursalMessage, type WorkspaceBranchDocument } from "../utils/workspaceBranchMessages";

/**
 * Aviso persistente de un alta que no se puede guardar porque el workspace no
 * tiene una sucursal válida. Se pinta desde que se abre el formulario, no solo
 * al pulsar Guardar; el bloqueo del guardado lo hace el propio formulario con
 * el mismo `useValidWorkspaceBranchId` (misma consulta en caché).
 *
 * Mientras la lista carga no avisa nada: `branchId` es `null` sin que falte la
 * sucursal.
 */
export function WorkspaceBranchNotice({ documento }: { documento: WorkspaceBranchDocument }) {
  const { branchId, isLoading, isError } = useValidWorkspaceBranchId();
  if (branchId !== null || isLoading) return null;
  return (
    <SectionErrorNotice
      title="No se puede guardar sin sucursal"
      message={getSinSucursalMessage(isError, documento)}
    />
  );
}
