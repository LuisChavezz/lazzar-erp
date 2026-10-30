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
