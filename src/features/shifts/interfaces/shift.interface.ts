export interface Shift {
  id: number;
  empresa: number;
  nombre: string;
  /** Formato del backend: `"HH:MM:SS"`. El formulario lo recorta a `"HH:MM"`. */
  hora_entrada: string;
  /** Formato del backend: `"HH:MM:SS"`. Siempre POSTERIOR a `hora_entrada`. */
  hora_salida: string;
  /**
   * Texto libre en el backend. El frontend emite los códigos de día en orden
   * canónico (`"L,M,X,J,V"`), pero puede recibir cualquier cadena heredada.
   */
  dias_laborales: string | null;
  tolerancia_retardo_minutos: number;
  /** Decimal(4,2) como string, igual que `salario_base` en puestos. */
  horas_base_diarias: string | null;
  descripcion: string | null;
  activo: boolean;
}

/**
 * Datos que captura el formulario.
 *
 * No incluye `empresa`: en alta la inyecta `useCreateShift` desde el workspace
 * activo y en edición se conserva la del registro. `activo` tampoco viaja — lo
 * administra el backend y al omitirlo conserva su valor actual.
 */
export interface ShiftCreate {
  nombre: string;
  hora_entrada: string;
  hora_salida: string;
  dias_laborales: string;
  tolerancia_retardo_minutos: number;
  horas_base_diarias: string | null;
  descripcion: string | null;
}

/** Cuerpo real que se envía al backend, ya con la empresa resuelta. */
export interface ShiftPayload extends ShiftCreate {
  empresa: number;
}
