"use client";

import { FormSelect } from "@/src/components/FormSelect";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";
import { rotationBranchOptions } from "../utils/rotationBoardBranches";

interface RotationBranchFilterProps {
  /** Sucursal del filtro; `null` = todas las del usuario. */
  value: number | null;
  onChange: (value: number | null) => void;
}

/**
 * Filtro de sucursal del tablero. Las opciones son las sucursales del usuario
 * en la empresa de la sesión (`mis-sucursales`), el mismo conjunto que acepta
 * el backend; la etiqueta de la opción vacía ("Todas mis sucursales") ya dice
 * el alcance, así que no hay nota aparte.
 */
export function RotationBranchFilter({ value, onChange }: RotationBranchFilterProps) {
  const companyId = useSessionCompanyId();
  const { branches, isLoading, isInitialError } = useCompanyBranches(companyId);
  // Sin empresa de sesión todavía la consulta ni empieza: también es "cargando".
  const isPending = !isInitialError && (companyId === null || isLoading);

  return (
    <div className="w-52">
      <FormSelect
        id="rotation-sucursal"
        name="sucursal"
        label="Sucursal"
        value={value === null ? "" : String(value)}
        onChange={(event) => {
          const id = Number(event.target.value);
          onChange(Number.isInteger(id) && id > 0 ? id : null);
        }}
        className="py-1.5! text-xs! rounded-md!"
        disabled={isPending}
        options={rotationBranchOptions(branches, value, isPending)}
        error={isInitialError ? { message: "No se pudieron cargar las sucursales." } : undefined}
      />
    </div>
  );
}
