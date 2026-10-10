"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { MainDialog } from "@/src/components/MainDialog";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { ExclamationTriangleIcon } from "@/src/components/Icons";
import { drfActionErrorMessage } from "@/src/utils/drfWriteErrors";
import {
  formatQuincena,
  getQuincenaRange,
  type Quincena,
  type QuincenaRange,
} from "@/src/utils/quincena";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { getEmployees } from "@/src/features/employees/services/actions";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import type { Employee } from "@/src/features/employees/interfaces/employee.interface";
import { getPayrolls } from "../services/actions";
import type { Payroll } from "../interfaces/payroll.interface";
import { ESTADO_CANCELADA } from "../constants/payrollChoices";
import { useGeneratePayrollPeriod } from "../hooks/useGeneratePayrollPeriod";
import { QuincenaPicker } from "./QuincenaPicker";

const OPTION_CLASS = "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white";

/**
 * Empleados que harían fallar `generar_periodo/` (nombres, ordenados). Espejo
 * EXACTO del chequeo del backend (`_empleados_con_nomina_vigente`): solo
 * cuentan los empleados ACTIVOS cuya PROPIA sucursal es la elegida y que ya
 * tienen una nómina pendiente o pagada de ese periodo EXACTO. Una nómina
 * vigente de un inactivo, o de un empleado de otra sucursal, no bloquea.
 */
const findGenerationBlockers = (
  payrolls: readonly Payroll[],
  employees: readonly Employee[],
  sucursalId: number,
  range: QuincenaRange
): string[] => {
  const candidates = new Map(
    employees
      .filter((employee) => employee.activo && employee.sucursal === sucursalId)
      .map((employee) => [employee.id, getEmployeeFullName(employee)])
  );
  const blockers = new Set<string>();
  for (const payroll of payrolls) {
    const name = candidates.get(payroll.empleado);
    if (
      name !== undefined &&
      payroll.periodo_inicio === range.periodo_inicio &&
      payroll.periodo_fin === range.periodo_fin &&
      // `NOMINA_VIGENTE` del backend es "no cancelada" (`hr/models.py`).
      payroll.estado !== ESTADO_CANCELADA
    ) {
      blockers.add(name);
    }
  }
  return [...blockers].sort((a, b) => a.localeCompare(b, "es-MX"));
};

const CHECK_FAILED_MESSAGE =
  "No se pudo verificar si la quincena ya tiene nóminas en esa sucursal, así que no se generó nada. Revisa tu conexión e intenta de nuevo.";

interface GeneratePayrollDialogProps {
  /** La quincena elegida en el listado. */
  defaultQuincena: Quincena;
  onClose: () => void;
  /** Tras generar: el listado se mueve a la quincena generada. */
  onGenerated: (quincena: Quincena) => void;
}

/**
 * "Generar quincena" (`generar_periodo/`): una nómina por empleado ACTIVO de
 * la sucursal, con su renglón de salario base.
 *
 * Antes del POST se consultan EN EL SERVIDOR las nóminas de la quincena y los
 * empleados, y se aplica la misma regla que el backend (ver
 * `findGenerationBlockers`): si algún empleado activo de la sucursal ya tiene
 * nómina vigente del periodo exacto no se envía (el backend rechazaría todo
 * con 409), y si la consulta falla tampoco (falla cerrado). El 409 se sigue
 * mostrando tal cual por si otra persona generó entre medio.
 */
export function GeneratePayrollDialog({
  defaultQuincena,
  onClose,
  onGenerated,
}: GeneratePayrollDialogProps) {
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const selectedBranch = useWorkspaceStore((state) => state.selectedBranch);
  const { branches, isLoading: isLoadingBranches, isInitialError: isErrorBranches } =
    useCompanyBranches(selectedCompany.id);

  const [quincena, setQuincena] = useState<Quincena>(defaultQuincena);
  // La del workspace por defecto, si el usuario la tiene entre sus sucursales.
  const [sucursal, setSucursal] = useState<number>(0);
  const sucursalValue =
    sucursal || (branches.some((branch) => branch.id === selectedBranch?.id) ? (selectedBranch?.id ?? 0) : 0);
  const [message, setMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const submittingRef = useRef(false);

  const { mutateAsync: generate, isPending: isGenerating } = useGeneratePayrollPeriod();
  const isBusy = isChecking || isGenerating;

  const sucursalNombre =
    branches.find((branch) => branch.id === sucursalValue)?.nombre ?? `Sucursal #${sucursalValue}`;

  const handleOpenChange = (next: boolean) => {
    if (!next && !isBusy) onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!sucursalValue) {
      setMessage("Selecciona la sucursal.");
      return;
    }

    submittingRef.current = true;
    setMessage(null);
    const range = getQuincenaRange(quincena);
    try {
      setIsChecking(true);
      let blockers: string[];
      try {
        // Ambas lecturas FRESCAS del servidor (nunca la caché): la regla
        // depende de quién está activo y en qué sucursal AHORA.
        const [existing, employees] = await Promise.all([
          // Sin `sucursal`: la de la nómina puede no ser la del empleado y lo
          // que cuenta es la del empleado.
          getPayrolls({
            periodo_inicio__gte: range.periodo_inicio,
            periodo_fin__lte: range.periodo_fin,
          }),
          getEmployees(),
        ]);
        blockers = findGenerationBlockers(existing, employees, sucursalValue, range);
      } catch (error) {
        console.error(error);
        setMessage(CHECK_FAILED_MESSAGE);
        return;
      } finally {
        setIsChecking(false);
      }

      if (blockers.length > 0) {
        setMessage(
          `No se puede generar la quincena del ${formatQuincena(quincena)} para ${sucursalNombre}: ${
            blockers.length === 1
              ? `${blockers[0]} ya tiene una nómina pendiente o pagada de ese periodo`
              : `${blockers.length} empleados activos ya tienen una nómina pendiente o pagada de ese periodo (${blockers.join(", ")})`
          }. La generación es todo o nada para los empleados activos de la sucursal: cancela esas nóminas si están pendientes, o captura las que falten con "Nueva Nómina".`
        );
        return;
      }

      const { creadas } = await generate({ ...range, sucursal_id: sucursalValue });
      if (creadas === 0) {
        toast.success(
          `No se generó ninguna nómina: ${sucursalNombre} no tiene empleados activos.`
        );
      } else {
        toast.success(
          creadas === 1
            ? `Se generó 1 nómina de ${sucursalNombre}`
            : `Se generaron ${creadas} nóminas de ${sucursalNombre}`
        );
      }
      onGenerated(quincena);
      onClose();
    } catch (error) {
      // 409 (algún empleado ya tiene nómina vigente de ese periodo) o 400: el
      // `detail` del backend, tal cual.
      console.error(error);
      setMessage(
        drfActionErrorMessage(
          error,
          "No se pudo generar la quincena. Intenta de nuevo.",
          "No se encontró el recurso para generar la quincena."
        )
      );
    } finally {
      submittingRef.current = false;
    }
  };

  const sucursalPlaceholder = isLoadingBranches
    ? "Cargando sucursales..."
    : isErrorBranches
      ? "No se pudieron cargar las sucursales"
      : branches.length === 0
        ? "No tienes sucursales asignadas"
        : "Seleccionar...";

  return (
    <MainDialog
      open
      onOpenChange={handleOpenChange}
      maxWidth="560px"
      showCloseButton={false}
      title="Generar Quincena"
      description="Crea una nómina pendiente por cada empleado activo de la sucursal, con su salario base de la quincena. Se hace una sola vez por quincena y sucursal."
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-1">
        <QuincenaPicker
          name="generar-quincena"
          value={quincena}
          disabled={isBusy}
          onChange={(next) => {
            setQuincena(next);
            setMessage(null);
          }}
        />
        <p className="-mt-2 ml-1 text-xs text-slate-500 dark:text-slate-400">
          Periodo: {formatQuincena(quincena)}
        </p>

        <FormSelect
          label="Sucursal"
          name="sucursal_id"
          value={String(sucursalValue)}
          disabled={isBusy || isLoadingBranches || isErrorBranches}
          onChange={(event) => {
            setSucursal(Number(event.target.value));
            setMessage(null);
          }}
        >
          <option value="0" disabled>
            {sucursalPlaceholder}
          </option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id} className={OPTION_CLASS}>
              {branch.nombre}
            </option>
          ))}
        </FormSelect>

        {message && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300"
          >
            <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton label="Volver" onClick={() => handleOpenChange(false)} disabled={isBusy} />
          <FormSubmitButton
            isPending={isBusy}
            loadingLabel={isChecking ? "Verificando…" : "Generando…"}
          >
            Generar quincena
          </FormSubmitButton>
        </div>
      </form>
    </MainDialog>
  );
}
