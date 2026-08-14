/**
 * Departamento del catálogo base (`nucleo.Departamento`).
 *
 * Es un catálogo de solo lectura para el frontend: el backend permite escritura
 * únicamente a superusuarios y filtra el listado por la empresa del usuario
 * autenticado. Aquí se consume como origen de opciones para el FK
 * `Area.departamento`.
 *
 * Nota: la llave primaria es `id_departamento` (no `id`).
 */
export interface Department {
  id_departamento: number;
  empresa: number;
  sucursal: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}
