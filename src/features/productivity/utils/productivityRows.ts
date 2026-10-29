import {
  getStaleRowDialogNotice,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";
import type { Productivity } from "../interfaces/productivity.interface";
import type { ProductivityRow } from "../components/ProductivityColumns";
import type { EstadoProductividad } from "../constants/productivityChoices";
import {
  PRODUCTIVITY_GONE_MESSAGE,
  productivityEstadoChangedMessage,
} from "../hooks/productivityErrorMessages";
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

/**
 * ¿El diálogo de fila (confirmar, devolver a borrador, eliminar) ya no
 * aplica? Se cierra con aviso si el registro desapareció o ya no está en
 * `expectedEstado`: el estado con que se abrió el cambio, o `borrador` para
 * eliminar. Con la guarda o la escritura propia en vuelo (`isBusy`) no aplica.
 */
export const getProductivityStaleNotice = (
  targetId: number | null,
  target: { estado: string } | null,
  expectedEstado: EstadoProductividad,
  isBusy: boolean
): StaleRowDialogNotice | null =>
  getStaleRowDialogNotice<string>({
    resource: "productivity",
    targetId,
    target,
    expectedEstado,
    isBusy,
    messages: {
      gone: PRODUCTIVITY_GONE_MESSAGE,
      estadoChanged: productivityEstadoChangedMessage,
    },
  });
