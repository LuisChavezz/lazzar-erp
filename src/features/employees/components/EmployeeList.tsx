"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { UserIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_SECTIONED_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { usePositions } from "@/src/features/positions/hooks/usePositions";
import { getColumns, EMPLOYEE_HEADER_FILTERS } from "./EmployeeColumns";
import { Employee } from "../interfaces/employee.interface";
import EmployeeForm from "./EmployeeForm";
import { useEmployees } from "../hooks/useEmployees";
import { useDeleteEmployee } from "../hooks/useDeleteEmployee";
import { useReactivateEmployee } from "../hooks/useReactivateEmployee";
import { EmployeeRowActionsProvider, usePendingEmployeeIds } from "../hooks/useEmployeeRowActions";
import { getEmployeeFullName } from "../utils/employeeName";
import {
  buildEmployeeRows,
  getStaleEmployeeDialogNotice,
  type StaleEmployeeDialogNotice,
} from "../utils/employeeRows";

export default function EmployeeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  // Diálogos de fila: solo el id, resuelto contra el listado completo (ver
  // `useEmployeeRowActions`).
  const [deactivateTargetId, setDeactivateTargetId] = useState<number | null>(null);
  const [reactivateTargetId, setReactivateTargetId] = useState<number | null>(null);
  const { employees, isLoading, isInitialError, error } = useEmployees();
  const queryClient = useQueryClient();
  const { mutate: deactivateEmployee, isPending: isDeactivatePending } = useDeleteEmployee();
  const { mutate: reactivateEmployee, isPending: isReactivatePending } = useReactivateEmployee();
  const busyIds = usePendingEmployeeIds();
  // Aviso de un diálogo de fila que se cerró porque su empleado cambió por
  // fuera. Se dispara desde un efecto: un toast en pleno render actualizaría
  // otro componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleEmployeeDialogNotice | null>(null);

  // Catálogos para resolver los FK de las columnas. Las sucursales ya están en
  // el workspace (no dispara otra petición), igual que en `WarehouseList`.
  const availableBranches = useWorkspaceStore((state) => state.availableBranches);
  const { departments } = useDepartments();
  const { positions } = usePositions();

  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  // Siembra la caché del detalle antes de que navegue el enlace "Ver detalle",
  // para que la página pinte sin esperar al fetch (list y retrieve comparten
  // serializer). Se siembra el `Employee` tal como llegó del listado, no la
  // fila de la tabla: `EmployeeRow` lleva nombres resueltos que no son parte
  // del recurso y no deben quedar en la caché del detalle.
  const handleViewDetails = (employee: Employee) => {
    const original = employees.find((item) => item.id === employee.id) ?? employee;
    queryClient.setQueryData(["employees", employee.id], original);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedEmployee(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve los FK como IDs crudos; se resuelven en cliente.
  const departmentNameById = new Map(
    departments.map((department) => [department.id_departamento, department.nombre])
  );
  const positionNameById = new Map(positions.map((position) => [position.id, position.nombre]));
  const branchNameById = new Map(availableBranches.map((branch) => [branch.id, branch.nombre]));

  // Los nombres se incorporan a la FILA, no al accessor: así la llegada tardía
  // de su catálogo produce un `data` nuevo y TanStack recalcula celda,
  // búsqueda, orden y opciones de filtro. Ver `EmployeeRow`.
  const rows = buildEmployeeRows(employees, {
    positionNameById,
    departmentNameById,
    branchNameById,
  });

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `EmployeeRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    rows,
    EMPLOYEE_HEADER_FILTERS
  );

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  const findRow = (id: number | null) =>
    id !== null ? (rows.find((row) => row.id === id) ?? null) : null;
  const deactivateTarget = findRow(deactivateTargetId);
  const reactivateTarget = findRow(reactivateTargetId);
  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo.
  const isDeactivating =
    deactivateTargetId !== null && (busyIds.includes(deactivateTargetId) || isDeactivatePending);
  const isReactivating =
    reactivateTargetId !== null && (busyIds.includes(reactivateTargetId) || isReactivatePending);

  // Vía rápida contra la caché: un refetch mostró que el empleado de un
  // diálogo abierto ya no existe o cambió de `activo` por fuera. Se cierra con
  // un aviso, para que no desaparezca sin explicación (mismo patrón que
  // `VacationList`); la regla vive en `getStaleEmployeeDialogNotice`. Ajuste
  // en render, no en un efecto.
  const staleDeactivate = getStaleEmployeeDialogNotice({
    targetId: deactivateTargetId,
    target: deactivateTarget,
    expectedActivo: true,
    isBusy: isDeactivating,
  });
  if (staleDeactivate) {
    setDeactivateTargetId(null);
    setStaleNotice(staleDeactivate);
  }
  const staleReactivate = getStaleEmployeeDialogNotice({
    targetId: reactivateTargetId,
    target: reactivateTarget,
    expectedActivo: false,
    isBusy: isReactivating,
  });
  if (staleReactivate) {
    setReactivateTargetId(null);
    setStaleNotice(staleReactivate);
  }

  useEffect(() => {
    if (staleNotice) {
      // `id` estable: un doble render no duplica el aviso.
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  // Copia del empleado al ABRIR cada confirmación: el texto no sigue a los
  // refetch y sobrevive a la animación de salida cuando el id vuelve a `null`.
  const deactivateSession = useDialogSession(deactivateTargetId !== null, deactivateTarget);
  const reactivateSession = useDialogSession(reactivateTargetId !== null, reactivateTarget);

  return (
    <EmployeeRowActionsProvider
      value={{
        onView: handleViewDetails,
        onEdit: handleEdit,
        onDeactivate: (employee) => setDeactivateTargetId(employee.id),
        onReactivate: (employee) => setReactivateTargetId(employee.id),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice:
        // desactivar/reactivar cambia `activo`, que es un filtro.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar empleado..."
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar empleados"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando empleados"
        actionButton={
          canEditHr ? (
            <MainDialog
              title={
                <DialogHeader
                  title={selectedEmployee ? "Editar Empleado" : "Alta de Empleado"}
                  subtitle={selectedEmployee ? "Edición de registro" : "Registro Nuevo"}
                  statusColor="emerald"
                  icon={UserIcon}
                />
              }
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              maxWidth={DIALOG_WIDTH_SECTIONED_FORM}
              trigger={
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleNew}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nuevo Empleado
                </Button>
              }
            >
              <EmployeeForm
                onSuccess={() => setIsDialogOpen(false)}
                employeeToEdit={selectedEmployee}
              />
            </MainDialog>
          ) : null
        }
      />

      {/*
        Montados mientras haya una copia: `open` sale del id, así que al
        cerrarse animan su salida con el nombre de la apertura.
      */}
      {canDeleteHr && deactivateSession.snapshot && (
        <ConfirmDialog
          key={deactivateSession.id}
          open={deactivateTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeactivateTargetId(null);
          }}
          title="Desactivar Empleado"
          description={`¿Deseas desactivar a ${getEmployeeFullName(deactivateSession.snapshot)}? Su información se conserva y seguirá visible en el listado con estatus Inactivo.`}
          confirmText={isDeactivating ? "Desactivando..." : "Desactivar"}
          closeOnConfirm={false}
          busy={isDeactivating}
          onConfirm={() => {
            const id = deactivateSession.snapshot?.id;
            if (id === undefined) return;
            deactivateEmployee(id, {
              onSettled: () => setDeactivateTargetId(null),
            });
          }}
          confirmColor="amber"
        />
      )}
      {canDeleteHr && reactivateSession.snapshot && (
        <ConfirmDialog
          key={reactivateSession.id}
          open={reactivateTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setReactivateTargetId(null);
          }}
          title="Reactivar Empleado"
          description={`¿Deseas reactivar a ${getEmployeeFullName(reactivateSession.snapshot)}? Volverá a aparecer con estatus Activo y se limpiará su fecha de baja.`}
          confirmText={isReactivating ? "Reactivando..." : "Reactivar"}
          closeOnConfirm={false}
          busy={isReactivating}
          onConfirm={() => {
            const id = reactivateSession.snapshot?.id;
            if (id === undefined) return;
            reactivateEmployee(id, {
              onSettled: () => setReactivateTargetId(null),
            });
          }}
          confirmColor="green"
        />
      )}
    </EmployeeRowActionsProvider>
  );
}
