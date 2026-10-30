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
import { ProductivityIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatLocalDate } from "@/src/utils/formatDate";
import { hasPermission } from "@/src/utils/permissions";
import {
  getStaleRowDialogNotice,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { useUnitsOfMeasure } from "@/src/features/units-of-measure/hooks/useUnitsOfMeasure";
import { getColumns, PRODUCTIVITY_HEADER_FILTERS } from "./ProductivityColumns";
import { Productivity } from "../interfaces/productivity.interface";
import {
  ESTADO_BORRADOR,
  ESTADO_CONFIRMADO,
  type EstadoProductividad,
} from "../constants/productivityChoices";
import ProductivityForm from "./ProductivityForm";
import { ProductivityDetailDialog } from "./ProductivityDetailDialog";
import { useProductivity } from "../hooks/useProductivity";
import { useDeleteProductivity } from "../hooks/useDeleteProductivity";
import { useChangeProductivityEstado } from "../hooks/useChangeProductivityEstado";
import {
  ProductivityRowActionsProvider,
  usePendingProductivityIds,
} from "../hooks/useProductivityRowActions";
import { verifyProductivityEstado } from "../hooks/verifyProductivityEstado";
import { buildProductivityRows } from "../utils/productivityRows";
import { PRODUCTIVITY_STALE_MESSAGES } from "../hooks/productivityErrorMessages";

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
  // Guardado del formulario en curso: bloquea cerrar su diálogo.
  const [isFormBusy, setIsFormBusy] = useState(false);
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
  // Aviso del diálogo de fila que se cerró porque su registro cambió por
  // fuera, mostrado desde un efecto.
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
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
  const rows = buildProductivityRows(records, employeeNameById, departmentNameById, unitNameById);

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `ProductivityRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    rows,
    PRODUCTIVITY_HEADER_FILTERS
  );

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  const findRow = (id: number | null) =>
    id !== null ? (rows.find((row) => row.id === id) ?? null) : null;

  const detailTarget = findRow(detailTargetId);
  const estadoTarget = findRow(estadoRequest?.id ?? null);
  const deleteTarget = findRow(deleteTargetId);

  // Ajustes en RENDER (no en efecto). Un detalle cuyo registro desapareció se
  // cierra sin aviso.
  if (detailTargetId !== null && detailTarget === null) setDetailTargetId(null);

  // Vía rápida contra la caché, con el mismo aviso que la guarda de red: el
  // cambio de estado espera el estado con que se abrió; el borrado, un
  // borrador. Ninguno se toca mientras su guarda o su propia escritura están
  // en vuelo (`sent` marca que el PATCH propio ya salió).
  const staleEstado = getStaleRowDialogNotice({
    resource: "productivity",
    targetId: estadoRequest?.id ?? null,
    target: estadoTarget,
    expectedEstado: estadoRequest?.from ?? ESTADO_BORRADOR,
    isBusy: isChecking || (estadoRequest?.sent ?? false),
    messages: PRODUCTIVITY_STALE_MESSAGES,
  });
  if (staleEstado) {
    setEstadoRequest(null);
    setStaleNotice(staleEstado);
  }
  const staleDelete = getStaleRowDialogNotice({
    resource: "productivity",
    targetId: deleteTargetId,
    target: deleteTarget,
    expectedEstado: ESTADO_BORRADOR,
    isBusy: isChecking || (deleteTargetId !== null && busyIds.includes(deleteTargetId)),
    messages: PRODUCTIVITY_STALE_MESSAGES,
  });
  if (staleDelete) {
    setDeleteTargetId(null);
    setStaleNotice(staleDelete);
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

  // Copias al ABRIR cada diálogo: el texto no sigue a los refetch y sobrevive
  // a la animación de salida cuando el id vuelve a `null`. El cambio de
  // estado copia también su petición: el título ("Confirmar" o "Devolver") no
  // debe voltearse mientras se cierra.
  const detailSession = useDialogSession(detailTargetId !== null, detailTarget);
  const estadoSession = useDialogSession(
    estadoRequest !== null,
    estadoRequest && estadoTarget ? { request: estadoRequest, record: estadoTarget } : null
  );
  const deleteSession = useDialogSession(deleteTargetId !== null, deleteTarget);

  const isEstadoBusy = isChecking || isChangingEstado;
  const isConfirming = estadoSession.snapshot?.request.to === ESTADO_CONFIRMADO;
  // Confirmar exige `E-RH`; devolver a borrador, `D-RH`.
  const canRunEstadoRequest = isConfirming ? canEditHr : canDeleteHr;
  const estadoRecord = estadoSession.snapshot?.record;
  const estadoTargetLabel = estadoRecord
    ? `${estadoRecord.empleado_nombre} del ${formatLocalDate(estadoRecord.fecha)}`
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
                  icon={ProductivityIcon}
                />
              }
              open={isFormOpen}
              onOpenChange={(open) => {
                // No se cierra a media guarda o escritura (Esc, X ni "Cerrar"):
                // el resultado —éxito o errores por campo— debe verse.
                if (!open && isFormBusy) return;
                setIsFormOpen(open);
              }}
              maxWidth={DIALOG_WIDTH_FORM}
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
                onPendingChange={setIsFormBusy}
              />
            </MainDialog>
          ) : null
        }
      />

      {/*
        Montados mientras haya una copia: `open` sale del id, así que al
        cerrarse animan su salida con los datos de la apertura.
      */}
      {detailSession.snapshot && (
        <ProductivityDetailDialog
          key={`detail-${detailSession.id}`}
          // El detalle sí sigue a los refetch mientras su registro exista.
          record={detailTarget ?? detailSession.snapshot}
          open={detailTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDetailTargetId(null);
          }}
        />
      )}

      {canRunEstadoRequest && estadoSession.snapshot && (
        <ConfirmDialog
          key={`estado-${estadoSession.id}`}
          open={estadoRequest !== null}
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
      {canDeleteHr && deleteSession.snapshot && deleteSession.snapshot.estado === ESTADO_BORRADOR && (
        <ConfirmDialog
          key={`delete-${deleteSession.id}`}
          open={deleteTargetId !== null}
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
