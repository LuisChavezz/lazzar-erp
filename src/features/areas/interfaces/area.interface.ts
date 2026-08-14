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
 * `hr.Empleado`, que aún no existe en el frontend, y el segundo lo administra
 * el backend. Al no enviarse en el PUT, ambos conservan su valor actual.
 */
export interface AreaCreate {
  departamento: number;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
}
