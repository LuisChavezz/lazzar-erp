"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { usePositions } from "@/src/features/positions/hooks/usePositions";
import { getColumns } from "./EmployeeColumns";
import { Employee } from "../interfaces/employee.interface";
import EmployeeForm from "./EmployeeForm";
import { useEmployees } from "../hooks/useEmployees";

export default function EmployeeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { employees, isLoading, isError, error } = useEmployees();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Catálogos para resolver los FK de las columnas. Las sucursales ya están en
  // el workspace (no dispara otra petición), igual que en `WarehouseList`.
  const availableBranches = useWorkspaceStore((state) => state.availableBranches);
  const { departments } = useDepartments();
  const { positions } = usePositions();

  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  // Siembra la caché del detalle antes de navegar para que la página pinte sin
  // esperar al fetch (list y retrieve comparten serializer).
  const handleViewDetails = useCallback(
    (employee: Employee) => {
      queryClient.setQueryData(["employees", employee.id], employee);
      router.push(`/hr/employees/${employee.id}`);
    },
    [queryClient, router]
  );

  const handleEdit = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  }, []);

  const handleNew = () => {
    setSelectedEmployee(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () =>
      getColumns(
        handleViewDetails,
        handleEdit,
        { canEdit: canEditHr, canDelete: canDeleteHr },
        { branches: availableBranches, departments, positions }
      ),
    [
      handleViewDetails,
      handleEdit,
      canEditHr,
      canDeleteHr,
      availableBranches,
      departments,
      positions,
    ]
  );

  return (
    <DataTable
      columns={columns}
      data={employees}
      // Ata la identidad de la fila al id del registro y no a su índice: las
      // celdas guardan el estado de sus diálogos, y al desactivar/reactivar
      // cambia `activo` y con él el orden, así que sin esto el estado abierto
      // podría quedar apuntando a otro empleado.
      getRowId={(row) => String(row.id)}
      searchPlaceholder="Buscar empleado..."
      isLoading={isLoading}
      isError={isError}
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
              />
            }
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            maxWidth="1000px"
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
  );
}
