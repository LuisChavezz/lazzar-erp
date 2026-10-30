import type { Payroll } from "../interfaces/payroll.interface";
import { formatPayrollPeriod, type PayrollRow } from "../components/PayrollColumns";

/**
 * Filas de la tabla: cada nómina con los nombres de sus FK y el periodo ya
 * resueltos. Un FK que no está en su catálogo (o cuyo catálogo no ha llegado)
 * se rotula `Empleado #N` / `Sucursal #N`, una sola vez: la celda, la opción
 * del filtro de encabezado, la búsqueda y el orden leen ese mismo texto.
 */
export const buildPayrollRows = (
  payrolls: readonly Payroll[],
  employeeNameById: ReadonlyMap<number, string>,
  branchNameById: ReadonlyMap<number, string>
): PayrollRow[] =>
  payrolls.map((payroll) => ({
    ...payroll,
    empleado_nombre: employeeNameById.get(payroll.empleado) ?? `Empleado #${payroll.empleado}`,
    sucursal_nombre: branchNameById.get(payroll.sucursal) ?? `Sucursal #${payroll.sucursal}`,
    periodo_label: formatPayrollPeriod(payroll),
  }));

/**
 * ¿El diálogo de pagar o cancelar de `targetId` está en vuelo? Lo está
 * mientras corre su guarda de red (`isChecking`: la de cancelar vive en la
 * lista; la de pagar, en su diálogo, que la reporta) o su escritura
 * (`busyIds`). En vuelo, la vía rápida de la lista no lo cierra: si la nómina
 * cambió, ya avisa la guarda, y serían dos avisos.
 */
export const isPayrollRowDialogBusy = (
  targetId: number | null,
  isChecking: boolean,
  busyIds: readonly number[]
): boolean => isChecking || (targetId !== null && busyIds.includes(targetId));
