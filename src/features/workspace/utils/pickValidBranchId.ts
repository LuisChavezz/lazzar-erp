import type { Branch } from "@/src/features/branches/interfaces/branch.interface";

/**
 * La sucursal elegida, solo si está en la lista de sucursales del usuario; si
 * no (sin elegir, obsoleta, de otra empresa), `null`. Se compara por `id`:
 * `mis-sucursales` devuelve la PK como `id` y NO trae `id_sucursal` aunque la
 * interfaz `Branch` lo declare.
 */
export const pickValidBranchId = (
  selectedId: number | null | undefined,
  branches: readonly Pick<Branch, "id">[],
): number | null =>
  selectedId && branches.some((branch) => branch.id === selectedId) ? selectedId : null;
