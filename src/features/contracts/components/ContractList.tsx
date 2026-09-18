"use client";

import { useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { getColumns, ContractRow } from "./ContractColumns";
import { Contract } from "../interfaces/contract.interface";
import ContractForm from "./ContractForm";
import { useContracts } from "../hooks/useContracts";
import { useDeleteContract } from "../hooks/useDeleteContract";

export default function ContractList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  // El diálogo de baja vive aquí y no en la celda: la celda se desmonta al
  // ordenar/paginar/filtrar y se llevaría el diálogo a media confirmación.
  const [contractToDeactivate, setContractToDeactivate] = useState<Contract | null>(null);
  const { contracts, isLoading, isError, error } = useContracts();
  const { employees } = useEmployees();
  const {
    mutate: deleteContract,
    isPending: isDeactivating,
    variables: deactivatingId,
  } = useDeleteContract();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = useCallback(
    (contract: Contract) => {
      setSelectedContract(contract);
      setIsDialogOpen(true);
    },
    [setSelectedContract, setIsDialogOpen]
  );

  const handleDeactivate = useCallback(
    (contract: Contract) => setContractToDeactivate(contract),
    [setContractToDeactivate]
  );

  const handleNew = () => {
    setSelectedContract(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  // Incluye a los empleados inactivos: un contrato histórico sigue mostrando a
  // quién pertenece.
  const employeeNameById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, getEmployeeFullName(employee)])),
    [employees]
  );

  // El nombre se incorpora a la FILA, no al accessor: así la llegada tardía del
  // catálogo de empleados produce un `data` nuevo y TanStack recalcula celda,
  // búsqueda y orden. Ver `ContractRow`.
  const rows = useMemo<ContractRow[]>(
    () =>
      contracts.map((contract) => ({
        ...contract,
        empleado_nombre: employeeNameById.get(contract.empleado) ?? null,
      })),
    [contracts, employeeNameById]
  );

  const columns = useMemo(
    () =>
      getColumns(
        { onEdit: handleEdit, onDeactivate: handleDeactivate },
        { canEdit: canEditHr, canDelete: canDeleteHr },
        isDeactivating ? (deactivatingId ?? null) : null
      ),
    [handleEdit, handleDeactivate, canEditHr, canDeleteHr, isDeactivating, deactivatingId]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice: al
        // desactivar cambia `activo` y las filas se reordenan.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar contrato..."
        isLoading={isLoading}
        isError={isError}
        errorTitle="Error al cargar contratos"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando contratos"
        actionButton={
          canEditHr ? (
            <MainDialog
              title={
                <DialogHeader
                  title={selectedContract ? "Editar Contrato" : "Alta de Contrato"}
                  subtitle={selectedContract ? "Edición de registro" : "Registro Nuevo"}
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
                  + Nuevo Contrato
                </Button>
              }
            >
              <ContractForm
                onSuccess={() => setIsDialogOpen(false)}
                contractToEdit={selectedContract}
              />
            </MainDialog>
          ) : null
        }
      />

      {canDeleteHr && (
        <ConfirmDialog
          open={contractToDeactivate !== null}
          onOpenChange={(open) => {
            if (!open) {
              setContractToDeactivate(null);
            }
          }}
          title="Desactivar Contrato"
          description="¿Deseas desactivar este contrato? Su información se conserva y seguirá visible en el listado con registro Inactivo."
          confirmText="Desactivar"
          onConfirm={() => {
            if (contractToDeactivate) {
              deleteContract(contractToDeactivate.id);
            }
            setContractToDeactivate(null);
          }}
          confirmColor="amber"
        />
      )}
    </>
  );
}
