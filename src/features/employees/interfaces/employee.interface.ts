export interface Employee {
  id: number;
  empresa: number;
  sucursal: number;
  departamento: number;
  puesto: number;
  numero_empleado: string;
  nombre: string;
  apellido_paterno: string;
  /** `blank=True` SIN `null=True`: viaja como cadena vacía, nunca como null. */
  apellido_materno: string;
  fecha_nacimiento: string | null;
  curp: string | null;
  rfc: string | null;
  email: string | null;
  /** `blank=True` SIN `null=True`: viaja como cadena vacía, nunca como null. */
  telefono: string;
  fecha_ingreso: string;
  fecha_baja: string | null;
  activo: boolean;
}

/**
 * Datos que captura el formulario.
 *
 * No incluye `empresa`: en alta la inyecta `useCreateEmployee` desde el
 * workspace activo y en edición se conserva la del registro. `activo` tampoco
 * viaja — lo administra el backend y al omitirlo conserva su valor actual.
 * `fecha_baja` solo aparece en edición (un alta nace activa).
 */
export interface EmployeeCreate {
  sucursal: number;
  departamento: number;
  puesto: number;
  numero_empleado: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string | null;
  curp: string | null;
  rfc: string | null;
  email: string | null;
  telefono: string;
  fecha_ingreso: string;
  fecha_baja?: string | null;
}

/** Cuerpo real que se envía al backend, ya con la empresa resuelta. */
export interface EmployeePayload extends EmployeeCreate {
  empresa: number;
}
