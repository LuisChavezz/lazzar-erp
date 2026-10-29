"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { UserIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { DIALOG_WIDTH_SECTIONED_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { usePositions } from "@/src/features/positions/hooks/usePositions";
import { getColumns, EmployeeRow, EMPLOYEE_HEADER_FILTERS } from "./EmployeeColumns";
import { Employee } from "../interfaces/employee.interface";
import EmployeeForm from "./EmployeeForm";
import { useEmployees } from "../hooks/useEmployees";
import { useDeleteEmployee } from "../hooks/useDeleteEmployee";
import { useReactivateEmployee } from "../hooks/useReactivateEmployee";
import { EmployeeRowActionsProvider, usePendingEmployeeIds } from "../hooks/useEmployeeRowActions";
import { getEmployeeFullName } from "../utils/employeeName";

export default function EmployeeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  // Diálogos de fila: solo el id, resuelto contra el listado completo (ver
  // `useEmployeeRowActions`).
  const [deactivateTargetId, setDeactivateTargetId] = useState<number | null>(null);
  const [reactivateTargetId, setReactivateTargetId] = useState<number | null>(null);
  const { employees, isLoading, isInitialError, error } = useEmployees();
  const queryClient = useQueryClient();
  const { mutate: deactivateEmployee } = useDeleteEmployee();
  const { mutate: reactivateEmployee } = useReactivateEmployee();
  const busyIds = usePendingEmployeeIds();

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
  const rows: EmployeeRow[] = employees.map((employee) => ({
    ...employee,
    puesto_nombre: positionNameById.get(employee.puesto) ?? `Puesto #${employee.puesto}`,
    departamento_nombre:
      departmentNameById.get(employee.departamento) ?? `Departamento #${employee.departamento}`,
    sucursal_nombre: branchNameById.get(employee.sucursal) ?? `Sucursal #${employee.sucursal}`,
  }));

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
  const isDeactivating = deactivateTargetId !== null && busyIds.includes(deactivateTargetId);
  const isReactivating = reactivateTargetId !== null && busyIds.includes(reactivateTargetId);

  // Un id que ya no aplica no queda colgado: el empleado desapareció o cambió
  // de `activo` por fuera (refetch, otra pestaña). Mientras SU acción está en
  // vuelo no se toca: el optimista invierte `activo` al arrancar y el diálogo
  // lo cierra el `onSettled` de la mutación. Ajuste en render, no en un efecto.
  if (deactivateTargetId !== null && !isDeactivating && !deactivateTarget?.activo) {
    setDeactivateTargetId(null);
  }
  if (
    reactivateTargetId !== null &&
    !isReactivating &&
    (reactivateTarget === null || reactivateTarget.activo)
  ) {
    setReactivateTargetId(null);
  }

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

      {canDeleteHr && deactivateTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeactivateTargetId(null);
          }}
          title="Desactivar Empleado"
          description={`¿Deseas desactivar a ${getEmployeeFullName(deactivateTarget)}? Su información se conserva y seguirá visible en el listado con estatus Inactivo.`}
          confirmText={isDeactivating ? "Desactivando..." : "Desactivar"}
          closeOnConfirm={false}
          busy={isDeactivating}
          onConfirm={() =>
            deactivateEmployee(deactivateTarget.id, {
              onSettled: () => setDeactivateTargetId(null),
            })
          }
          confirmColor="amber"
        />
      )}
      {canDeleteHr && reactivateTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setReactivateTargetId(null);
          }}
          title="Reactivar Empleado"
          description={`¿Deseas reactivar a ${getEmployeeFullName(reactivateTarget)}? Volverá a aparecer con estatus Activo y se limpiará su fecha de baja.`}
          confirmText={isReactivating ? "Reactivando..." : "Reactivar"}
          closeOnConfirm={false}
          busy={isReactivating}
          onConfirm={() =>
            reactivateEmployee(reactivateTarget.id, {
              onSettled: () => setReactivateTargetId(null),
            })
          }
          confirmColor="green"
        />
      )}
    </EmployeeRowActionsProvider>
  );
}
