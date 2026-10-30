import type { Productivity } from "../interfaces/productivity.interface";
import type { ProductivityRow } from "../components/ProductivityColumns";
import { getCumplimiento } from "./compliance";

/**
 * Filas de la tabla: cada registro con los nombres de sus FK y el
 * cumplimiento ya resueltos. Cada FK que no está en su catálogo (o cuyo
 * catálogo no ha llegado) se rotula `Empleado #N` / `Departamento #N` /
 * `Unidad #N`, una sola vez: la celda, la opción del filtro de encabezado, la
 * búsqueda y el orden leen ese mismo texto.
 */
export const buildProductivityRows = (
  records: readonly Productivity[],
  employeeNameById: ReadonlyMap<number, string>,
  departmentNameById: ReadonlyMap<number, string>,
  unitNameById: ReadonlyMap<number, string>
): ProductivityRow[] =>
  records.map((record) => ({
    ...record,
    empleado_nombre: employeeNameById.get(record.empleado) ?? `Empleado #${record.empleado}`,
    departamento_nombre:
      departmentNameById.get(record.departamento) ?? `Departamento #${record.departamento}`,
    unidad_nombre: unitNameById.get(record.meta_unidad) ?? `Unidad #${record.meta_unidad}`,
    cumplimiento: getCumplimiento(record.meta, record.resultado),
  }));
