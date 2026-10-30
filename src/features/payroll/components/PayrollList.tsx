"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { PayrollIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_SECTIONED_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import {
  getStaleRowDialogNotice,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";
import { formatQuincena, getQuincenaRange } from "@/src/utils/quincena";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import type { Payroll } from "../interfaces/payroll.interface";

import { usePayrolls } from "../hooks/usePayrolls";
import { usePayrollSearchParams } from "../hooks/usePayrollSearchParams";
import { useCancelPayroll } from "../hooks/useCancelPayroll";
import {
  PayrollRowActionsProvider,
  usePendingPayrollIds,
} from "../hooks/usePayrollRowActions";
import { verifyPayrollPendiente } from "../hooks/verifyPayrollPendiente";
import { ESTADO_PENDIENTE } from "../constants/payrollChoices";
import { buildPayrollRows, isPayrollRowDialogBusy } from "../utils/payrollRows";
import { PAYROLL_STALE_MESSAGES } from "../hooks/payrollErrorMessages";
import { getColumns, PAYROLL_HEADER_FILTERS } from "./PayrollColumns";
import PayrollForm from "./PayrollForm";
import { PayrollDetailDialog } from "./PayrollDetailDialog";
import { PayPayrollDialog } from "./PayPayrollDialog";
import { GeneratePayrollDialog } from "./GeneratePayrollDialog";
import { QuincenaPicker } from "./QuincenaPicker";

export default function PayrollList() {
  const { quincena, setQuincena } = usePayrollSearchParams();
  const range = getQuincenaRange(quincena);

  const [isFormOpen, setIsFormOpen] = useState(false);
  // Guardado del formulario en curso: bloquea cerrar su diálogo.
  const [isFormBusy, setIsFormBusy] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  // Los diálogos de fila viven aquí y no en la celda: la celda se desmonta al
  // ordenar/paginar/filtrar, y pagar o cancelar cambia `estado` —un filtro—.
  // Se guarda el ID y se resuelve contra el listado COMPLETO.
  const [detailTargetId, setDetailTargetId] = useState<number | null>(null);
  const [payTargetId, setPayTargetId] = useState<number | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  // Guarda de red del diálogo de pagar en curso (la reporta el diálogo).
  const [isPayChecking, setIsPayChecking] = useState(false);
  const checkingRef = useRef(false);
  const queryClient = useQueryClient();
  // Aviso del diálogo de fila que se cerró porque su nómina cambió por fuera,
  // mostrado desde un efecto.
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  // Acciones de fila en vuelo: UNA suscripción para toda la tabla.
  const busyIds = usePendingPayrollIds();

  const {
    payrolls,
    hasLoaded,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = usePayrolls({
    periodo_inicio__gte: range.periodo_inicio,
    periodo_fin__lte: range.periodo_fin,
  });
  const { employees } = useEmployees();
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const { branches } = useCompanyBranches(selectedCompany.id);
  const { mutate: cancelPayroll, isPending: isCancelling } = useCancelPayroll();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin". `E-RH` genera, crea
  // y edita pendientes; `D-RH` marca como pagada y cancela.
  const canEditHr = hasPermission("E-RH", session?.user);
  const canPayOrCancel = hasPermission("D-RH", session?.user);

  // Empleados llegan COMPLETOS (con inactivos): una nómina histórica sigue
  // mostrando a quién pertenece. Cada FK tiene su respaldo.
  const employeeNameById = new Map(
    employees.map((employee) => [employee.id, getEmployeeFullName(employee)])
  );
  const branchNameById = new Map(branches.map((branch) => [branch.id, branch.nombre]));

  // Los nombres se incorporan a la FILA, no al accessor: la llegada tardía de
  // un catálogo produce un `data` nuevo y TanStack recalcula todo.
  const rows = buildPayrollRows(payrolls, employeeNameById, branchNameById);

  // Filtros de encabezado en memoria, sobre la quincena ya cargada. Solo
  // dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `PayrollRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canPayOrCancel }),
    rows,
    PAYROLL_HEADER_FILTERS
  );

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  const findRow = (id: number | null) =>
    id !== null ? (rows.find((row) => row.id === id) ?? null) : null;

  const detailTarget = findRow(detailTargetId);
  const payTarget = findRow(payTargetId);
  const cancelTarget = findRow(cancelTargetId);

  // Ajustes en RENDER (no en efecto). Solo con el listado asentado (no a mitad
  // de un cambio de quincena, cuando las filas aún son las de la anterior): esa
  // espera queda fuera de la regla. Un detalle cuya nómina desapareció se
  // cierra sin aviso.
  const listSettled = hasLoaded && !isPlaceholderData;
  if (detailTargetId !== null && listSettled && detailTarget === null) setDetailTargetId(null);

  // Vía rápida contra la caché, con el mismo aviso que la guarda de red: pagar
  // y cancelar esperan una pendiente, y no se tocan mientras su guarda (la de
  // pagar vive en su diálogo) o su escritura están en vuelo.
  const stalePay = listSettled
    ? getStaleRowDialogNotice({
        resource: "payroll",
        targetId: payTargetId,
        target: payTarget,
        expectedEstado: ESTADO_PENDIENTE,
        isBusy: isPayrollRowDialogBusy(payTargetId, isPayChecking, busyIds),
        messages: PAYROLL_STALE_MESSAGES,
      })
    : null;
  if (stalePay) {
    setPayTargetId(null);
    setStaleNotice(stalePay);
  }
  const staleCancel = listSettled
    ? getStaleRowDialogNotice({
        resource: "payroll",
        targetId: cancelTargetId,
        target: cancelTarget,
        expectedEstado: ESTADO_PENDIENTE,
        isBusy: isPayrollRowDialogBusy(cancelTargetId, isChecking, busyIds),
        messages: PAYROLL_STALE_MESSAGES,
      })
    : null;
  if (staleCancel) {
    setCancelTargetId(null);
    setStaleNotice(staleCancel);
  }

  useEffect(() => {
    if (staleNotice) {
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  const handleConfirmCancel = async () => {
    if (cancelTargetId === null || checkingRef.current) return;
    const id = cancelTargetId;
    checkingRef.current = true;
    setIsChecking(true);
    try {
      const check = await verifyPayrollPendiente(queryClient, id);
      if (check.status === "stale") {
        setCancelTargetId(null);
        return;
      }
      if (check.status !== "ok") return;
      // Sin optimista: la confirmación queda abierta y bloqueada hasta que
      // responde el servidor y el listado se refresca.
      cancelPayroll(id, { onSettled: () => setCancelTargetId(null) });
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  };

  // Copias al ABRIR cada diálogo: el texto no sigue a los refetch y sobrevive
  // a la animación de salida cuando el id vuelve a `null`.
  const detailSession = useDialogSession(detailTargetId !== null, detailTarget);
  const paySession = useDialogSession(payTargetId !== null, payTarget);
  const cancelSession = useDialogSession(cancelTargetId !== null, cancelTarget);

  const isCancelBusy = isChecking || isCancelling;
  const isSwitchingQuincena = isFetching && isPlaceholderData;

  return (
    <PayrollRowActionsProvider
      value={{
        onView: (payroll) => setDetailTargetId(payroll.id),
        onEdit: (payroll) => {
          setSelectedPayroll(payroll);
          setIsFormOpen(true);
        },
        onPay: (payroll) => setPayTargetId(payroll.id),
        onCancel: (payroll) => setCancelTargetId(payroll.id),
        busyIds,
      }}
    >
      {/* Quincena de SERVIDOR, fuera de la tabla y en la URL. */}
      <section className="mb-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 p-5">
        <QuincenaPicker name="filtro-quincena" value={quincena} onChange={setQuincena} />
        <p className="ml-1 text-xs text-slate-500 dark:text-slate-400">
          Nóminas del {formatQuincena(quincena)}
        </p>
      </section>

      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id de la nómina y no a su índice.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar nómina..."
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage={`No hay nóminas del ${formatQuincena(quincena)}.`}
        isLoading={isLoading || isSwitchingQuincena}
        isError={isInitialError}
        errorTitle="Error al cargar las nóminas"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={() => void refetch()}
        loadingAriaLabel="Cargando nóminas"
        // Cambiar de quincena vuelve a la página 1 sin perder orden, búsqueda
        // ni columnas.
        paginationResetKey={range.periodo_inicio}
        actionButton={
          canEditHr ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                rounded="full"
                onClick={() => setIsGenerateOpen(true)}
                className="hover:scale-105 active:scale-95"
              >
                Generar quincena
              </Button>
              <Button
                variant="primary"
                rounded="full"
                onClick={() => {
                  setSelectedPayroll(null);
                  setIsFormOpen(true);
                }}
                className="hover:scale-105 active:scale-95"
              >
                + Nueva Nómina
              </Button>
            </div>
          ) : null
        }
      />

      {canEditHr && (
        <MainDialog
          title={
            <DialogHeader
              title={selectedPayroll ? "Editar Nómina" : "Alta de Nómina"}
              subtitle={selectedPayroll ? "Nómina pendiente" : "Nómina individual"}
              statusColor="emerald"
              icon={PayrollIcon}
            />
          }
          open={isFormOpen}
          onOpenChange={(open) => {
            // No se cierra a media guarda o escritura (Esc, X ni "Cerrar"):
            // el resultado —éxito o errores por campo— debe verse.
            if (!open && isFormBusy) return;
            setIsFormOpen(open);
          }}
          maxWidth={DIALOG_WIDTH_SECTIONED_FORM}
        >
          <PayrollForm
            onSuccess={() => setIsFormOpen(false)}
            payrollToEdit={selectedPayroll}
            defaultQuincena={quincena}
            onPendingChange={setIsFormBusy}
          />
        </MainDialog>
      )}

      {canEditHr && isGenerateOpen && (
        <GeneratePayrollDialog
          defaultQuincena={quincena}
          onClose={() => setIsGenerateOpen(false)}
          onGenerated={setQuincena}
        />
      )}

      {/*
        Montados mientras haya una copia: `open` sale del id, así que al
        cerrarse animan su salida con los datos de la apertura.
      */}
      {detailSession.snapshot && (
        <PayrollDetailDialog
          key={`detail-${detailSession.id}`}
          // El detalle sí sigue a los refetch mientras su nómina exista.
          payroll={detailTarget ?? detailSession.snapshot}
          open={detailTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDetailTargetId(null);
          }}
        />
      )}

      {canPayOrCancel && paySession.snapshot && (
        <PayPayrollDialog
          key={`pay-${paySession.id}`}
          payroll={paySession.snapshot}
          open={payTargetId !== null}
          onClose={() => setPayTargetId(null)}
          onCheckingChange={setIsPayChecking}
        />
      )}

      {canPayOrCancel && cancelSession.snapshot && (
        <ConfirmDialog
          key={`cancel-${cancelSession.id}`}
          open={cancelTargetId !== null}
          onOpenChange={(open) => {
            if (!open && !isCancelBusy) setCancelTargetId(null);
          }}
          title="Cancelar Nómina"
          description={`¿Cancelar la nómina de ${cancelSession.snapshot.empleado_nombre} (${cancelSession.snapshot.periodo_label})? Quedará como cancelada y de solo lectura; no se puede deshacer.`}
          confirmText={isChecking ? "Verificando…" : isCancelling ? "Cancelando…" : "Cancelar nómina"}
          cancelText="Volver"
          confirmColor="red"
          closeOnConfirm={false}
          busy={isCancelBusy}
          onConfirm={() => void handleConfirmCancel()}
        />
      )}
    </PayrollRowActionsProvider>
  );
}
