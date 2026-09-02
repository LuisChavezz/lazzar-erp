export interface Area {
  id: number;
  departamento: number;
  nombre: string;
  codigo: string | null;
  responsable: number | null;
  descripcion: string | null;
  activo: boolean;
}

/**
 * Payload de alta/edición.
 *
 * `responsable` y `activo` se omiten a propósito: el primero es un FK a
 * `hr.Empleado` que el formulario de áreas todavía no captura (queda
 * pendiente), y el segundo lo administra el backend. Como la edición usa
 * PATCH, al no enviarse ambos conservan su valor actual.
 */
export interface AreaCreate {
  departamento: number;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
}
