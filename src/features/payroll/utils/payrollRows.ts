import {
  getStaleRowDialogNotice,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";
import type { Payroll } from "../interfaces/payroll.interface";
import { formatPayrollPeriod, type PayrollRow } from "../components/PayrollColumns";
import { ESTADO_PENDIENTE } from "../constants/payrollChoices";
import { PAYROLL_GONE_MESSAGE, payrollEstadoChangedMessage } from "../hooks/payrollErrorMessages";

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
 * ¿El diálogo de pagar o cancelar ya no aplica? Los dos esperan una nómina
 * `pendiente`: se cierran con aviso si desapareció o cambió de estado. Con la
 * guarda o la escritura propia en vuelo (`isBusy`) no aplica. La espera a que
 * el listado se asiente (un cambio de quincena) la hace el llamador, antes de
 * consultar esta regla.
 */
export const getPayrollStaleNotice = (
  targetId: number | null,
  target: { estado: string } | null,
  isBusy: boolean
): StaleRowDialogNotice | null =>
  getStaleRowDialogNotice<string>({
    resource: "payroll",
    targetId,
    target,
    expectedEstado: ESTADO_PENDIENTE,
    isBusy,
    messages: { gone: PAYROLL_GONE_MESSAGE, estadoChanged: payrollEstadoChangedMessage },
  });
