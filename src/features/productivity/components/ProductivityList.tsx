"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable, type DataTableFilterConfig } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatLocalDate } from "@/src/utils/formatDate";
import { hasPermission } from "@/src/utils/permissions";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { useUnitsOfMeasure } from "@/src/features/units-of-measure/hooks/useUnitsOfMeasure";
import { getColumns, ProductivityRow } from "./ProductivityColumns";
import { Productivity } from "../interfaces/productivity.interface";
import {
  ESTADO_BORRADOR,
  ESTADO_CONFIRMADO,
  ESTADO_PRODUCTIVIDAD_OPTIONS,
  type EstadoProductividad,
} from "../constants/productivityChoices";
import { getCumplimiento } from "../utils/compliance";
import ProductivityForm from "./ProductivityForm";
import { ProductivityDetailDialog } from "./ProductivityDetailDialog";
import { useProductivity } from "../hooks/useProductivity";
import { useDeleteProductivity } from "../hooks/useDeleteProductivity";
import { useChangeProductivityEstado } from "../hooks/useChangeProductivityEstado";
import {
  ProductivityRowActionsProvider,
  usePendingProductivityIds,
} from "../hooks/useProductivityRowActions";
import {
  PRODUCTIVITY_GONE_MESSAGE,
  productivityEstadoChangedMessage,
} from "../hooks/productivityErrorMessages";
import { verifyProductivityEstado } from "../hooks/verifyProductivityEstado";

/**
 * Confirmar o devolver a borrador. `from` es el estado con que se abrió el
 * diálogo (la guarda previa compara contra él); `sent` marca que el PATCH ya
 * salió, para que la vía rápida de la caché no confunda el cambio de estado
 * PROPIO con uno ajeno.
 */
interface EstadoRequest {
  id: number;
  from: EstadoProductividad;
  to: EstadoProductividad;
  sent: boolean;
}

export default function ProductivityList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Productivity | null>(null);
  // Los diálogos de fila viven aquí y no en la celda: la celda se desmonta al
  // ordenar/paginar/filtrar, y confirmar o reabrir cambia `estado` —un
  // filtro—. Se guarda el ID y se resuelve contra el listado COMPLETO.
  const [detailTargetId, setDetailTargetId] = useState<number | null>(null);
  const [estadoRequest, setEstadoRequest] = useState<EstadoRequest | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const checkingRef = useRef(false);
  const queryClient = useQueryClient();
  // Aviso pendiente de la vía rápida (ver `closeStale`), mostrado desde un efecto.
  const [staleNotice, setStaleNotice] = useState<{ key: string; message: string } | null>(null);
  // Acciones de fila en vuelo: UNA suscripción para toda la tabla.
  const busyIds = usePendingProductivityIds();

  const { records, isLoading, isInitialError, error } = useProductivity();
  const { employees } = useEmployees();
  const { departments } = useDepartments();
  const { units } = useUnitsOfMeasure();
  const { mutate: deleteRecord } = useDeleteProductivity();
  const { mutate: changeEstado, isPending: isChangingEstado } = useChangeProductivityEstado();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin". `E-RH` crea, edita y
  // confirma; `D-RH` elimina y devuelve a borrador.
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = (record: Productivity) => {
    setSelectedRecord(record);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  // Empleados y departamentos llegan COMPLETOS (empleados incluye inactivos):
  // un registro histórico sigue mostrando a quién pertenece. Unidades de
  // medida NO: `/nucleo/unidades-medida/` solo lista las activas, así que una
  // unidad desactivada cae al respaldo "Unidad #id". Cada FK tiene su respaldo.
  const employeeNameById = new Map(
    employees.map((employee) => [employee.id, getEmployeeFullName(employee)])
  );
  const departmentNameById = new Map(
    departments.map((department) => [department.id_departamento, department.nombre])
  );
  const unitNameById = new Map(units.map((unit) => [unit.id, unit.nombre]));

  // Los nombres se incorporan a la FILA, no al accessor: la llegada tardía de
  // un catálogo produce un `data` nuevo y TanStack recalcula todo.
  const rows: ProductivityRow[] = records.map((record) => ({
    ...record,
    empleado_nombre: employeeNameById.get(record.empleado) ?? `Empleado #${record.empleado}`,
    departamento_nombre:
      departmentNameById.get(record.departamento) ?? `Departamento #${record.departamento}`,
    unidad_nombre: unitNameById.get(record.meta_unidad) ?? `Unidad #${record.meta_unidad}`,
    cumplimiento: getCumplimiento(record.meta, record.resultado),
  }));

  // Filtros en memoria sobre el valor CRUDO de la fila. Las opciones salen de
  // los catálogos COMPLETOS, no de las filas visibles (mismo criterio que
  // evaluaciones): la config existe siempre.
  const empleadoFilterOptions = employees
    .map((employee) => ({
      value: String(employee.id),
      label: employee.activo
        ? getEmployeeFullName(employee)
        : `${getEmployeeFullName(employee)} (inactivo)`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const departamentoFilterOptions = departments
    .map((department) => ({
      value: String(department.id_departamento),
      label: department.nombre,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const filterConfig: DataTableFilterConfig[] = [
    { id: "estado", label: "Estado", options: ESTADO_PRODUCTIVIDAD_OPTIONS },
    { id: "empleado", label: "Empleado", options: empleadoFilterOptions },
    { id: "departamento", label: "Departamento", options: departamentoFilterOptions },
  ];

  const columns = getColumns({ canEdit: canEditHr, canDelete: canDeleteHr });

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  const findRow = (id: number | null) =>
    id !== null ? (rows.find((row) => row.id === id) ?? null) : null;

  const detailTarget = findRow(detailTargetId);
  const estadoTarget = findRow(estadoRequest?.id ?? null);
  const deleteTarget = findRow(deleteTargetId);

  /** Vía rápida contra la caché: mismo aviso que la guarda de red. */
  const closeStale = (id: number, target: ProductivityRow | null) =>
    setStaleNotice({
      key: `productivity-stale-${id}-${target?.estado ?? "gone"}`,
      message: target ? productivityEstadoChangedMessage(target.estado) : PRODUCTIVITY_GONE_MESSAGE,
    });

  // Ajustes en RENDER (no en efecto). Ninguno se toca mientras su guarda o su
  // propia escritura están en vuelo.
  if (detailTargetId !== null && detailTarget === null) setDetailTargetId(null);
  if (
    estadoRequest !== null &&
    !estadoRequest.sent &&
    !isChecking &&
    estadoTarget?.estado !== estadoRequest.from
  ) {
    setEstadoRequest(null);
    closeStale(estadoRequest.id, estadoTarget);
  }
  if (
    deleteTargetId !== null &&
    !isChecking &&
    !busyIds.includes(deleteTargetId) &&
    deleteTarget?.estado !== ESTADO_BORRADOR
  ) {
    setDeleteTargetId(null);
    closeStale(deleteTargetId, deleteTarget);
  }

  useEffect(() => {
    if (staleNotice) {
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  /**
   * Ejecuta `write` solo si el registro FRESCO sigue en `expected`. `stale`
   * cierra el diálogo (ya se avisó); `error` lo deja abierto para reintentar.
   */
  const runGuarded = async (
    id: number,
    expected: EstadoProductividad,
    write: () => void,
    close: () => void
  ) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setIsChecking(true);
    try {
      const check = await verifyProductivityEstado(queryClient, id, expected);
      if (check === "ok") {
        write();
      } else if (check === "stale") {
        close();
      }
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  };

  const handleConfirmEstado = () => {
    if (!estadoRequest) return;
    const { id, from, to } = estadoRequest;
    void runGuarded(
      id,
      from,
      () => {
        setEstadoRequest((prev) => (prev ? { ...prev, sent: true } : prev));
        // Sin optimista: el diálogo queda abierto y bloqueado hasta que
        // responde el servidor y el listado se refresca.
        changeEstado({ id, estado: to }, { onSettled: () => setEstadoRequest(null) });
      },
      () => setEstadoRequest(null)
    );
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId === null) return;
    const id = deleteTargetId;
    void runGuarded(
      id,
      ESTADO_BORRADOR,
      () => {
        // Optimista: la fila sale del listado y la confirmación se cierra ya.
        deleteRecord(id);
        setDeleteTargetId(null);
      },
      () => setDeleteTargetId(null)
    );
  };

  const isEstadoBusy = isChecking || isChangingEstado;
  const isConfirming = estadoRequest?.to === ESTADO_CONFIRMADO;
  // Confirmar exige `E-RH`; devolver a borrador, `D-RH`.
  const canRunEstadoRequest = isConfirming ? canEditHr : canDeleteHr;
  const estadoTargetLabel = estadoTarget
    ? `${estadoTarget.empleado_nombre} del ${formatLocalDate(estadoTarget.fecha)}`
    : "";

  return (
    <ProductivityRowActionsProvider
      value={{
        onView: (record) => setDetailTargetId(record.id),
        onEdit: handleEdit,
        onConfirm: (record) =>
          setEstadoRequest({
            id: record.id,
            from: ESTADO_BORRADOR,
            to: ESTADO_CONFIRMADO,
            sent: false,
          }),
        onReopen: (record) =>
          setEstadoRequest({
            id: record.id,
            from: ESTADO_CONFIRMADO,
            to: ESTADO_BORRADOR,
            sent: false,
          }),
        onDelete: (record) => setDeleteTargetId(record.id),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar registro..."
        filterConfig={filterConfig}
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar productividad"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando productividad"
        actionButton={
          canEditHr ? (
            <MainDialog
              title={
                <DialogHeader
                  title={selectedRecord ? "Editar Productividad" : "Alta de Productividad"}
                  subtitle={selectedRecord ? "Edición de registro" : "Registro Nuevo"}
                  statusColor="violet"
                />
              }
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              maxWidth="1000px"
              trigger={
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleNew}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nuevo Registro
                </Button>
              }
            >
              <ProductivityForm
                onSuccess={() => setIsFormOpen(false)}
                recordToEdit={selectedRecord}
              />
            </MainDialog>
          ) : null
        }
      />

      {detailTarget && (
        <ProductivityDetailDialog
          record={detailTarget}
          open
          onOpenChange={(open) => {
            if (!open) setDetailTargetId(null);
          }}
        />
      )}

      {canRunEstadoRequest && estadoRequest && estadoTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !isEstadoBusy) setEstadoRequest(null);
          }}
          title={isConfirming ? "Confirmar Registro" : "Devolver a Borrador"}
          description={
            isConfirming
              ? `¿Confirmar el registro de productividad de ${estadoTargetLabel}? No se podrá editar ni eliminar mientras siga confirmado.`
              : `¿Devolver a borrador el registro de productividad de ${estadoTargetLabel}? Volverá a poder editarse, confirmarse y eliminarse.`
          }
          confirmText={
            isChecking
              ? "Verificando…"
              : isChangingEstado
                ? "Procesando…"
                : isConfirming
                  ? "Confirmar"
                  : "Devolver a borrador"
          }
          confirmColor={isConfirming ? "green" : "amber"}
          closeOnConfirm={false}
          busy={isEstadoBusy}
          onConfirm={handleConfirmEstado}
        />
      )}

      {/* Solo sobre borradores: un confirmado no se elimina. */}
      {canDeleteHr && deleteTarget && deleteTarget.estado === ESTADO_BORRADOR && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !isChecking) setDeleteTargetId(null);
          }}
          title="Eliminar Registro"
          description="¿Estás seguro de que deseas eliminar este registro de productividad? Esta acción no se puede deshacer."
          confirmText={isChecking ? "Verificando…" : "Eliminar"}
          closeOnConfirm={false}
          busy={isChecking}
          onConfirm={handleConfirmDelete}
          confirmColor="red"
        />
      )}
    </ProductivityRowActionsProvider>
  );
}
