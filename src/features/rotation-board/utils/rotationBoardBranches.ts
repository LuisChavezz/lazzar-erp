/** Opción vacía del filtro de sucursal: el alcance por defecto del usuario. */
export const ALL_MY_BRANCHES_LABEL = "Todas mis sucursales";

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
 * catálogo (todavía cargando, inactiva o fuera de alcance) se fija justo
 * debajo de "Todas" con su id, para que el control nunca muestre otra cosa que
 * lo que se está consultando.
 */
export const rotationBranchOptions = (
  branches: readonly { id: number; nombre: string }[],
  selected: number | null,
): RotationBranchOption[] => {
  const options = branches.map((branch) => ({ value: String(branch.id), label: branch.nombre }));
  const pinned =
    selected !== null && !branches.some((branch) => branch.id === selected)
      ? [{ value: String(selected), label: `Sucursal #${selected}` }]
      : [];
  return [{ value: "", label: ALL_MY_BRANCHES_LABEL }, ...pinned, ...options];
};
