"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { fieldNameFromIssuePath } from "@/src/utils/fieldNameFromIssuePath";
import { stripTrailingDecimalPoint } from "@/src/utils/decimal";
import { buildEmployeeOptions } from "@/src/utils/employeeOptions";
import { centsToMoney, moneyToCents } from "@/src/utils/moneyCents";
import {
  getQuincenaRange,
  parseQuincenaKey,
  quincenaFromRange,
  toQuincenaKey,
  type Quincena,
} from "@/src/utils/quincena";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { useContracts } from "@/src/features/contracts/hooks/useContracts";
import { usePositions } from "@/src/features/positions/hooks/usePositions";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import {
  PayrollFormSchema,
  sumPayrollLines,
  type PayrollFormValues,
  type PayrollLineFormValues,
} from "../schemas/payroll.schema";
import {
  DEFAULT_CANTIDAD,
  DEFAULT_UNIDAD,
  ESTADO_PENDIENTE,
  SALARIO_BASE_CODIGO,
  SALARIO_BASE_CONCEPTO,
} from "../constants/payrollChoices";
import type {
  Payroll,
  PayrollCreate,
  PayrollLineWrite,
  PayrollUpdate,
} from "../interfaces/payroll.interface";
import { halfMonthCents, resolveEmployeeSalary, type SalarySource } from "../utils/payrollSalary";
import { useCreatePayroll } from "./useCreatePayroll";
import { useUpdatePayroll } from "./useUpdatePayroll";
import { PAYROLL_KEY_ROOT } from "./usePayrolls";
import { verifyPayrollPendiente } from "./verifyPayrollPendiente";
import { payrollEstadoChangedMessage } from "./payrollErrorMessages";

const LINE_ERROR_PREFIX = "detalles";

/** `detalles.<i>.<campo>` → índice (grupo 1) y campo (grupo 2). */
const LINE_FIELD_PATH_RE = /^detalles\.(\d+)\.(.+)$/;

/** Campos fijos en edición: sus errores de esquema no aplican. */
const CREATE_ONLY_FIELDS = new Set(["empleado", "quincena"]);

interface UsePayrollFormParams {
  onSuccess: () => void;
  /** Solo se edita una nómina `pendiente`. */
  payrollToEdit?: Payroll | null;
  /** Quincena inicial del alta (la elegida en el listado). */
  defaultQuincena: Quincena;
}

const emptyLine = (): PayrollLineFormValues => ({
  tipo: "percepcion",
  codigo: "",
  concepto: "",
  monto: "",
  cantidad: DEFAULT_CANTIDAD,
  unidad: DEFAULT_UNIDAD,
});

/**
 * El renglón que siembra el alta: mismo código y monto que el de
 * `generar_periodo/`, con el concepto en mayúsculas (ver `SALARIO_BASE_CONCEPTO`).
 */
const salaryLine = (monthlyCents: number): PayrollLineFormValues => ({
  tipo: "percepcion",
  codigo: SALARIO_BASE_CODIGO,
  concepto: SALARIO_BASE_CONCEPTO,
  monto: centsToMoney(halfMonthCents(monthlyCents)),
  cantidad: DEFAULT_CANTIDAD,
  unidad: DEFAULT_UNIDAD,
});

const sameLines = (a: readonly PayrollLineFormValues[], b: readonly PayrollLineFormValues[]) =>
  a.length === b.length &&
  a.every(
    (line, index) =>
      line.tipo === b[index].tipo &&
      line.codigo === b[index].codigo &&
      line.concepto === b[index].concepto &&
      line.monto === b[index].monto &&
      line.cantidad === b[index].cantidad &&
      line.unidad === b[index].unidad
  );

/** Renglón guardado → valores del formulario; conserva `cantidad` y `unidad`. */
const toFormLine = (line: Payroll["detalles"][number]): PayrollLineFormValues => {
  const cents = moneyToCents(line.monto);
  return {
    tipo: line.tipo,
    codigo: line.codigo ?? "",
    concepto: line.concepto,
    monto: cents === null ? line.monto : centsToMoney(cents),
    cantidad: line.cantidad,
    unidad: line.unidad,
  };
};

/** Decimal capturado y ya validado → string de 2 posiciones para la API. */
const toApiMoney = (value: string): string => {
  const cents = moneyToCents(stripTrailingDecimalPoint(value.trim()));
  // Inalcanzable tras la validación; solo estrecha el tipo.
  return cents === null ? value.trim() : centsToMoney(cents);
};

const toLineWrite = (line: PayrollLineFormValues): PayrollLineWrite => ({
  codigo: line.codigo.trim() || null,
  concepto: line.concepto.trim(),
  tipo: line.tipo,
  cantidad: line.cantidad,
  unidad: line.unidad,
  monto: toApiMoney(line.monto),
});

export function usePayrollForm({ onSuccess, payrollToEdit, defaultQuincena }: UsePayrollFormParams) {
  const isEditing = Boolean(payrollToEdit?.id);
  const editingId = payrollToEdit?.id ?? null;
  const queryClient = useQueryClient();

  // ── Catálogos ────────────────────────────────────────────────────────────
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const {
    employees,
    isLoading: isLoadingEmployees,
    isInitialError: isErrorEmployees,
  } = useEmployees();
  const {
    branches,
    isLoading: isLoadingBranches,
    isInitialError: isErrorBranches,
  } = useCompanyBranches(selectedCompany.id);
  const {
    contracts,
    isLoading: isLoadingContracts,
    isInitialError: isErrorContracts,
  } = useContracts();
  const {
    positions,
    isLoading: isLoadingPositions,
    isInitialError: isErrorPositions,
  } = usePositions();

  // El selector de empleado necesita empleados y sucursales; el prellenado
  // del salario, contratos y puestos. El selector espera a los cuatro para que
  // el primer cambio de empleado ya pueda prellenar.
  const isLoadingCatalogs =
    isLoadingEmployees || isLoadingBranches || isLoadingContracts || isLoadingPositions;
  const isErrorEmployeeCatalogs = isErrorEmployees || isErrorBranches;
  const isErrorSalaryCatalogs = isErrorContracts || isErrorPositions;

  const sucursalIds = new Set(branches.map((branch) => branch.id));
  const empleadoOptions = buildEmployeeOptions(employees, sucursalIds);
  const branchNameById = new Map(branches.map((branch) => [branch.id, branch.nombre]));
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  // ── Valores iniciales ────────────────────────────────────────────────────
  // `MainDialog` desmonta su contenido al cerrarse: cada apertura monta este
  // hook de nuevo, así que basta con calcularlos una vez.
  const [initialValues] = useState<PayrollFormValues>(() =>
    payrollToEdit
      ? {
          empleado: payrollToEdit.empleado,
          quincena: (() => {
            const quincena = quincenaFromRange(
              payrollToEdit.periodo_inicio,
              payrollToEdit.periodo_fin
            );
            return quincena ? toQuincenaKey(quincena) : "";
          })(),
          salario_base: (() => {
            const cents = moneyToCents(payrollToEdit.salario_base);
            return cents === null ? "" : centsToMoney(cents);
          })(),
          observaciones: payrollToEdit.observaciones ?? "",
          detalles: payrollToEdit.detalles.map(toFormLine),
        }
      : {
          empleado: 0,
          quincena: toQuincenaKey(defaultQuincena),
          salario_base: "",
          observaciones: "",
          detalles: [],
        }
  );

  // ── Estado de UI ─────────────────────────────────────────────────────────
  const formRef = useRef<HTMLFormElement | null>(null);
  // Errores indexados por ruta con puntos ("salario_base", "detalles.0.monto").
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isChecking, setIsChecking] = useState(false);
  // Envío en curso, síncrono: dos Enter en el mismo tick no envían dos veces.
  const submittingRef = useRef(false);

  // Claves estables por renglón: quitar uno intermedio no reutiliza el estado
  // de otro. El `id` del backend no sirve: el PATCH reemplaza los renglones.
  const lineKeyCounter = useRef(initialValues.detalles.length);
  const [lineKeys, setLineKeys] = useState<number[]>(() =>
    initialValues.detalles.map((_, index) => index)
  );

  /**
   * Lo último que el PRELLENADO escribió (alta). Si el campo sigue igual, el
   * usuario no lo tocó y un cambio de empleado lo vuelve a prellenar; si
   * difiere, se respeta lo capturado. Arranca con los valores vacíos iniciales.
   */
  const autoSalario = useRef(initialValues.salario_base);
  const autoLines = useRef<PayrollLineFormValues[]>(initialValues.detalles);

  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  const clearError = (path: string) => {
    setErrors((prev) => {
      // Editar un campo del renglón también limpia el error de renglón (`_form`)
      // y el del arreglo completo.
      const match = LINE_FIELD_PATH_RE.exec(path);
      const keys = [path];
      if (match && match[2] !== "_form") keys.push(`${LINE_ERROR_PREFIX}.${match[1]}._form`);
      if (match) keys.push(LINE_ERROR_PREFIX);
      if (!keys.some((key) => key in prev)) return prev;
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  };

  /** Quitar o reemplazar renglones recorre los índices: sus errores dejan de apuntar bien. */
  const resetLineErrors = () => {
    setErrors((prev) => {
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(LINE_ERROR_PREFIX)) next[key] = value;
      }
      return next;
    });
  };

  const { mutateAsync: createPayroll, isPending: isCreating } = useCreatePayroll({
    setFieldError: (field, message) => setErrors((prev) => ({ ...prev, [field]: message })),
    setLineErrors: (lineErrors) => setErrors((prev) => ({ ...prev, ...lineErrors })),
  });
  const { mutateAsync: updatePayroll, isPending: isUpdating } = useUpdatePayroll({
    setFieldError: (field, message) => setErrors((prev) => ({ ...prev, [field]: message })),
    setLineErrors: (lineErrors) => setErrors((prev) => ({ ...prev, ...lineErrors })),
  });

  /** Validación del esquema; en edición se ignoran los campos fijos. */
  const validate = (value: PayrollFormValues) => {
    const parsed = PayrollFormSchema.safeParse(value);
    if (parsed.success) {
      return { ok: true as const, issuePaths: [] as string[] };
    }
    const nextErrors: Record<string, string> = {};
    const issuePaths: string[] = [];
    parsed.error.issues.forEach((issue) => {
      if (isEditing && CREATE_ONLY_FIELDS.has(String(issue.path[0]))) return;
      const key = issue.path.join(".");
      if (!nextErrors[key]) {
        nextErrors[key] = issue.message;
        issuePaths.push(fieldNameFromIssuePath(issue.path));
      }
    });
    setErrors(nextErrors);
    return issuePaths.length === 0
      ? { ok: true as const, issuePaths }
      : { ok: false as const, issuePaths };
  };

  /** ¿La nómina sigue `pendiente` en la caché? Vía rápida; la definitiva es la guarda de red. */
  const cachedEstadoProblem = (id: number): string | null => {
    const cached = queryClient
      .getQueriesData<Payroll[]>({ queryKey: PAYROLL_KEY_ROOT })
      .flatMap(([, data]) => data ?? [])
      .find((payroll) => payroll.id === id);
    if (!cached) return null; // Fuera de las quincenas en caché: decide la guarda.
    return cached.estado === ESTADO_PENDIENTE ? null : payrollEstadoChangedMessage(cached.estado);
  };

  const submit = async (value: PayrollFormValues) => {
    if (isEditing && editingId !== null) {
      const problem = cachedEstadoProblem(editingId);
      if (problem) {
        toast.error(problem);
        void queryClient.invalidateQueries({ queryKey: PAYROLL_KEY_ROOT });
        onSuccess();
        return;
      }
    }

    const validation = validate(value);
    if (!validation.ok) {
      scrollToFirstValidationError(formRef.current, validation.issuePaths);
      return;
    }

    const common = {
      salario_base:
        value.salario_base.trim() === "" ? null : toApiMoney(value.salario_base),
      observaciones: value.observaciones.trim() || null,
      detalles: value.detalles.map(toLineWrite),
    };

    if (isEditing && editingId !== null) {
      setIsChecking(true);
      try {
        const check = await verifyPayrollPendiente(queryClient, editingId);
        if (check.status === "stale") onSuccess();
        if (check.status !== "ok") return;
        const payload: PayrollUpdate = common;
        await updatePayroll({ id: editingId, ...payload });
        onSuccess();
      } catch {
        // El `onError` de la mutación ya avisó y pintó los errores.
      } finally {
        setIsChecking(false);
      }
      return;
    }

    const employee = employeeById.get(value.empleado);
    const quincena = parseQuincenaKey(value.quincena);
    if (!employee || !quincena) {
      // Inalcanzable tras la validación (las opciones salen del catálogo).
      setErrors((prev) => ({ ...prev, empleado: "El empleado es requerido" }));
      return;
    }
    const payload: PayrollCreate = {
      empresa: employee.empresa,
      sucursal: employee.sucursal,
      empleado: employee.id,
      ...getQuincenaRange(quincena),
      ...common,
    };
    try {
      await createPayroll(payload);
      onSuccess();
    } catch {
      // El `onError` de la mutación ya avisó y pintó los errores.
    }
  };

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      try {
        await submit(value);
      } finally {
        submittingRef.current = false;
      }
    },
  });

  // ── Renglones ────────────────────────────────────────────────────────────
  const addLine = () => {
    const key = lineKeyCounter.current++;
    form.pushFieldValue("detalles", emptyLine());
    setLineKeys((prev) => [...prev, key]);
    clearError(LINE_ERROR_PREFIX);
  };

  const removeLine = (index: number) => {
    form.removeFieldValue("detalles", index);
    setLineKeys((prev) => prev.filter((_, i) => i !== index));
    resetLineErrors();
  };

  // ── Empleado y prellenado (solo alta) ────────────────────────────────────
  const watchedEmpleado = useStore(form.store, (state) => state.values.empleado);
  const watchedLines = useStore(form.store, (state) => state.values.detalles);
  const selectedEmployee = employeeById.get(watchedEmpleado) ?? null;

  const salaryInfo: { source: SalarySource } | null =
    !isEditing && selectedEmployee && !isErrorSalaryCatalogs
      ? resolveEmployeeSalary(selectedEmployee, contracts, positions)
      : null;

  /**
   * Cambio de empleado: vuelve a prellenar `salario_base` y el renglón
   * `PER001` SOLO si siguen como los dejó el último prellenado. Con contratos
   * o puestos caídos no se prellena nada (se captura a mano).
   */
  const changeEmpleado = (nextEmpleado: number) => {
    form.setFieldValue("empleado", nextEmpleado);
    clearError("empleado");

    const employee = employeeById.get(nextEmpleado);
    if (!employee || isErrorSalaryCatalogs) return;
    const { cents } = resolveEmployeeSalary(employee, contracts, positions);

    if (form.getFieldValue("salario_base") === autoSalario.current) {
      const nextSalario = cents === null ? "" : centsToMoney(cents);
      form.setFieldValue("salario_base", nextSalario);
      autoSalario.current = nextSalario;
      clearError("salario_base");
    }

    if (sameLines(form.getFieldValue("detalles"), autoLines.current)) {
      const nextLines = cents === null ? [] : [salaryLine(cents)];
      form.setFieldValue("detalles", nextLines);
      setLineKeys(nextLines.map(() => lineKeyCounter.current++));
      autoLines.current = nextLines;
      resetLineErrors();
    }
  };

  const changeQuincena = (next: Quincena) => {
    form.setFieldValue("quincena", toQuincenaKey(next));
    clearError("quincena");
  };

  // ── Datos derivados para la vista ────────────────────────────────────────
  const totals = sumPayrollLines(watchedLines);

  const editingEmployee = payrollToEdit ? employeeById.get(payrollToEdit.empleado) : undefined;
  const sucursalId = payrollToEdit ? payrollToEdit.sucursal : (selectedEmployee?.sucursal ?? null);
  const empresaId = payrollToEdit ? payrollToEdit.empresa : (selectedEmployee?.empresa ?? null);
  const sucursalLabel =
    sucursalId === null
      ? "Selecciona un empleado"
      : (branchNameById.get(sucursalId) ?? `Sucursal #${sucursalId}`);
  const companyName = selectedCompany.nombre_comercial || selectedCompany.razon_social;
  const empresaLabel =
    empresaId === null
      ? "Selecciona un empleado"
      : empresaId === selectedCompany.id && companyName
        ? companyName
        : `Empresa #${empresaId}`;

  const isPending = isCreating || isUpdating || isChecking;

  /** "Limpiar": vuelve a los valores con que se abrió el diálogo. */
  const handleReset = () => {
    form.reset(initialValues);
    setLineKeys(initialValues.detalles.map(() => lineKeyCounter.current++));
    autoSalario.current = initialValues.salario_base;
    autoLines.current = initialValues.detalles;
    setErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    formRef,
    isEditing,
    isPending,
    lineKeys,
    totals,
    empleadoOptions,
    editingEmployee,
    sucursalLabel,
    empresaLabel,
    salaryInfo,
    isLoadingCatalogs,
    isErrorEmployeeCatalogs,
    isErrorSalaryCatalogs,
    getError,
    clearError,
    addLine,
    removeLine,
    changeEmpleado,
    changeQuincena,
    handleReset,
    handleFormSubmit,
  };
}
