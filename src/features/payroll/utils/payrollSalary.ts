import type { Contract } from "@/src/features/contracts/interfaces/contract.interface";
import type { Position } from "@/src/features/positions/interfaces/position.interface";
import type { Employee } from "@/src/features/employees/interfaces/employee.interface";
import { moneyToCents } from "@/src/utils/moneyCents";

export type SalarySource = "contrato" | "puesto" | null;

export interface ResolvedSalary {
  /** Salario MENSUAL en centavos, o `null` si no hay ninguno distinto de cero. */
  cents: number | null;
  source: SalarySource;
}

/**
 * Contrato vigente, con la MISMA regla que `generar_periodo/` en el backend
 * (`CONTRATO_VIGENTE`): `activo` y `estado === "activo"`; las fechas no
 * cuentan. Hay a lo sumo uno por empleado.
 */
const isContratoVigente = (contract: Contract, empleadoId: number) =>
  contract.empleado === empleadoId && contract.activo && contract.estado === "activo";

/** Centavos de un salario solo si es un decimal válido distinto de cero. */
const nonZeroCents = (value: string | null | undefined): number | null => {
  const cents = moneyToCents(value);
  return cents !== null && cents !== 0 ? cents : null;
};

/**
 * Salario mensual del empleado con la regla de `generar_periodo/`: el
 * `salario` del contrato vigente si es distinto de cero; si no, el
 * `salario_base` de su puesto si es distinto de cero; si no, ninguno.
 */
export const resolveEmployeeSalary = (
  employee: Pick<Employee, "id" | "puesto">,
  contracts: readonly Contract[],
  positions: readonly Position[]
): ResolvedSalary => {
  const contrato = contracts.find((contract) => isContratoVigente(contract, employee.id));
  const contratoCents = nonZeroCents(contrato?.salario);
  if (contratoCents !== null) {
    return { cents: contratoCents, source: "contrato" };
  }
  const puesto = positions.find((position) => position.id === employee.puesto);
  const puestoCents = nonZeroCents(puesto?.salario_base);
  if (puestoCents !== null) {
    return { cents: puestoCents, source: "puesto" };
  }
  return { cents: null, source: null };
};

/**
 * Quincena del salario mensual: salario × 15 / 30, en centavos, redondeado
 * al centavo PAR en el medio centavo (ROUND_HALF_EVEN). Es lo que produce el
 * backend: `(salario / Decimal("30.0")) * Decimal("15")` y luego
 * `.quantize(Decimal("0.01"))`, ambos con el contexto por defecto de Python
 * (HALF_EVEN). Con salario impar en centavos el resultado exacto termina en
 * medio centavo: 100.01 → 50.00, 100.03 → 50.02.
 */
export const halfMonthCents = (monthlyCents: number): number => {
  const half = Math.floor(monthlyCents / 2);
  if (monthlyCents % 2 === 0) {
    return half;
  }
  return half % 2 === 0 ? half : half + 1;
};
