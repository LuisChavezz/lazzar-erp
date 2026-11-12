"use client";

import type { Column } from "@tanstack/react-table";
import { FilterHeader } from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION, type ColumnFilterOption } from "@/src/utils/columnFilterOptions";
import {
  ROTATION_CLASE_CONFIG,
  ROTATION_ESTADO_CONFIG,
  ROTATION_FABRICACION_CONFIG,
} from "../constants/rotationBoardStatus";
import {
  ROTATION_CLASES,
  ROTATION_ESTADOS,
  ROTATION_FABRICACION,
  type RotationBoardRow,
} from "../interfaces/rotation-board.interface";

/**
 * Encabezados con filtro del tablero (modo servidor). Las opciones son los
 * enums FIJOS del backend, nunca las filas: la tabla solo tiene la página
 * actual. El menú es la leyenda (punto de color por valor).
 */

type RotationColumn = Column<RotationBoardRow, unknown>;

const optionsFrom = <T extends string>(
  values: readonly T[],
  config: Record<T, { label?: string; dot: string }>,
): ColumnFilterOption[] => [
  ALL_FILTER_OPTION,
  ...values.map((value) => ({
    value,
    label: config[value].label ?? value,
    dotClassName: config[value].dot,
  })),
];

const ESTADO_OPTIONS = optionsFrom(ROTATION_ESTADOS, ROTATION_ESTADO_CONFIG);
const CLASE_OPTIONS = optionsFrom(ROTATION_CLASES, ROTATION_CLASE_CONFIG);
const FABRICACION_OPTIONS = optionsFrom(ROTATION_FABRICACION, ROTATION_FABRICACION_CONFIG);

export function RotationEstadoHeader({ column }: { column: RotationColumn }) {
  return <FilterHeader title="Estado" column={column} options={ESTADO_OPTIONS} label="estado" />;
}

export function RotationClaseHeader({ column }: { column: RotationColumn }) {
  return <FilterHeader title="Clase" column={column} options={CLASE_OPTIONS} label="clase ABC" />;
}

export function RotationFabricacionHeader({ column }: { column: RotationColumn }) {
  return (
    <FilterHeader
      title="Material"
      column={column}
      options={FABRICACION_OPTIONS}
      label="material para el resurtido"
      menuAlign="end"
    />
  );
}
