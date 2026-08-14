export interface Position {
  id: number;
  empresa: number;
  nombre: string;
  descripcion: string | null;
  salario_base: string | null;
  area: number | null;
  activo: boolean;
}

/**
 * Datos que captura el formulario.
 *
 * No incluye `empresa`: en alta la inyecta `useCreatePosition` desde el
 * workspace activo y en edición se conserva la del registro. `activo` tampoco
 * viaja — lo administra el backend y al omitirlo conserva su valor actual.
 */
export interface PositionCreate {
  nombre: string;
  descripcion: string | null;
  salario_base: string | null;
  area: number | null;
}

/** Cuerpo real que se envía al backend, ya con la empresa resuelta. */
export interface PositionPayload extends PositionCreate {
  empresa: number;
}
