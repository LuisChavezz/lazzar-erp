import type { EstadoProductividad } from "../constants/productivityChoices";

/**
 * Registro de productividad de un empleado (`/hr/productividad/`).
 *
 * Listado y detalle comparten esta forma. Los FK llegan como ID crudo, sin
 * `*_nombre`: los nombres se resuelven en cliente contra los catálogos de
 * empleados, departamentos y unidades de medida. El backend no calcula nada
 * (el cumplimiento es solo de vista, ver `utils/compliance.ts`).
 */
export interface Productivity {
  id: number;
  /** FK a `nucleo.Empresa`. Para no superusuarios DEBE ser la del usuario (400 si no). */
  empresa: number;
  /** PK de `nucleo.Departamento` (`id_departamento`). No se valida contra el del empleado. */
  departamento: number;
  /** FK a `hr.Empleado`; el backend acepta inactivos. */
  empleado: number;
  estado: EstadoProductividad;
  /** Usuario que lo capturó. Solo lectura: nunca se envía. */
  creado_por: number | null;
  /** DateField `"YYYY-MM-DD"`. */
  fecha: string;
  /** Decimal(10,2) como string (`"100.00"`). */
  meta: string | null;
  /** PK del catálogo global `/nucleo/unidades-medida/`. */
  meta_unidad: number;
  /** Decimal(10,2) como string (`"95.50"`). */
  resultado: string | null;
  descripcion: string | null;
}

/**
 * Cuerpo de alta y de edición (PATCH). Nunca lleva `id`, `creado_por` ni
 * `observaciones` (este último aparece en la documentación del backend pero
 * el campo no existe). `empresa` y `departamento` se derivan del empleado
 * (ver `useProductivityForm`).
 */
export interface ProductivityWrite {
  empresa: number;
  departamento: number;
  empleado: number;
  fecha: string;
  meta_unidad: number;
  meta: string | null;
  resultado: string | null;
  descripcion: string | null;
}

/** Alta: `estado` viaja SIEMPRE como `borrador`. */
export interface ProductivityCreate extends ProductivityWrite {
  estado: "borrador";
}

/** Variables de la mutación de edición: el cuerpo más el `id` de la ruta. */
export interface ProductivityUpdateVariables extends ProductivityWrite {
  id: number;
}

/** Variables de confirmar / devolver a borrador: `PATCH {estado}`. */
export interface ProductivityEstadoVariables {
  id: number;
  estado: EstadoProductividad;
}
