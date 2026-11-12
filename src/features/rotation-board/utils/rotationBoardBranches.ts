/** Opción vacía del filtro de sucursal: el alcance por defecto del usuario. */
export const ALL_MY_BRANCHES_LABEL = "Todas mis sucursales";

/** Lo que muestra una sucursal de la URL mientras el catálogo aún no llega. */
export const LOADING_BRANCHES_LABEL = "Cargando sucursales...";

export interface RotationBranchOption {
  value: string;
  label: string;
}

/**
 * Opciones del filtro de sucursal: "Todas mis sucursales" (valor vacío) y las
 * de `/nucleo/mis-sucursales/` (solo activas y del alcance del usuario), en el
 * orden en que llegan.
 *
 * La sucursal elegida queda SIEMPRE a la vista: si la de la URL no está en el
 * catálogo se fija justo debajo de "Todas", para que el control nunca muestre
 * otra cosa que lo que se está consultando. Mientras el catálogo carga
 * (`isPending`) se fija con un texto neutro; ya cargado (o si falló), con su id
 * ("Sucursal #id"), que es lo que se ve con una inactiva o fuera de alcance.
 */
export const rotationBranchOptions = (
  branches: readonly { id: number; nombre: string }[],
  selected: number | null,
  isPending = false,
): RotationBranchOption[] => {
  const options = branches.map((branch) => ({ value: String(branch.id), label: branch.nombre }));
  const pinned =
    selected !== null && !branches.some((branch) => branch.id === selected)
      ? [
          {
            value: String(selected),
            label: isPending ? LOADING_BRANCHES_LABEL : `Sucursal #${selected}`,
          },
        ]
      : [];
  return [{ value: "", label: ALL_MY_BRANCHES_LABEL }, ...pinned, ...options];
};
