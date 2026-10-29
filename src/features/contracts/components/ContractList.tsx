"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ContractIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_SECTIONED_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { getStaleRowDialogNotice, type StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { getColumns, CONTRACT_HEADER_FILTERS } from "./ContractColumns";
import { Contract } from "../interfaces/contract.interface";
import ContractForm from "./ContractForm";
import { useContracts } from "../hooks/useContracts";
import { useDeleteContract } from "../hooks/useDeleteContract";
import { ContractRowActionsProvider, usePendingContractIds } from "../hooks/useContractRowActions";
import { buildContractRows, CONTRACT_STALE_MESSAGES } from "../utils/contractRows";

export default function ContractList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  // Diálogo de fila: solo el id, resuelto contra el listado completo — la baja
  // cambia `activo`, que es un filtro, y puede sacar la fila de la vista.
  const [deactivateTargetId, setDeactivateTargetId] = useState<number | null>(null);
  const { contracts, isLoading, isInitialError, error } = useContracts();
  const { employees } = useEmployees();
  const { mutate: deactivateContract, isPending: isDeactivatePending } = useDeleteContract();
  const busyIds = usePendingContractIds();
  // Aviso del diálogo de fila que se cerró porque su contrato cambió por
  // fuera. Se dispara desde un efecto: un toast en pleno render actualizaría
  // otro componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedContract(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  // Incluye a los empleados inactivos: un contrato histórico sigue mostrando a
  // quién pertenece.
  const employeeNameById = new Map(
    employees.map((employee) => [employee.id, getEmployeeFullName(employee)])
  );

  // El nombre se incorpora a la FILA, no al accessor: así la llegada tardía del
  // catálogo de empleados produce un `data` nuevo y TanStack recalcula celda,
  // búsqueda y orden. Ver `ContractRow`.
  const rows = buildContractRows(contracts, employeeNameById);

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `ContractRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    rows,
    CONTRACT_HEADER_FILTERS
  );

  // ── Diálogo de fila, resuelto contra el listado COMPLETO ──────────────────
  const deactivateTarget =
    deactivateTargetId !== null ? (rows.find((row) => row.id === deactivateTargetId) ?? null) : null;
  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo.
  const isDeactivating =
    deactivateTargetId !== null && (busyIds.includes(deactivateTargetId) || isDeactivatePending);

  // Vía rápida contra la caché: un refetch mostró que el contrato del diálogo
  // abierto ya no existe o su registro ya está inactivo. Se cierra con un
  // aviso (mismo patrón que `EmployeeList`). Ajuste en render, no en un efecto.
  const staleDeactivate = getStaleRowDialogNotice({
    resource: "contract",
    targetId: deactivateTargetId,
    target: deactivateTarget,
    expectedActivo: true,
    isBusy: isDeactivating,
    messages: CONTRACT_STALE_MESSAGES,
  });
  if (staleDeactivate) {
    setDeactivateTargetId(null);
    setStaleNotice(staleDeactivate);
  }

  useEffect(() => {
    if (staleNotice) {
      // `id` estable: un doble render no duplica el aviso.
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  // Copia del contrato al ABRIR la confirmación: el texto no sigue a los
  // refetch y sobrevive a la animación de salida cuando el id vuelve a `null`.
  const deactivateSession = useDialogSession(deactivateTargetId !== null, deactivateTarget);

  return (
    <ContractRowActionsProvider
      value={{
        onEdit: handleEdit,
        onDeactivate: (contract) => setDeactivateTargetId(contract.id),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice: al
        // desactivar cambia `activo`, que es un filtro.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar contrato..."
        isLoading={isLoading}
        isError={isInitialError}
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
                  icon={ContractIcon}
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

      {/*
        Montado mientras haya una copia: `open` sale del id, así que al
        cerrarse anima su salida con el nombre de la apertura.
      */}
      {canDeleteHr && deactivateSession.snapshot && (
        <ConfirmDialog
          key={deactivateSession.id}
          open={deactivateTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeactivateTargetId(null);
          }}
          title="Desactivar Contrato"
          description={`¿Deseas desactivar el contrato de ${deactivateSession.snapshot.empleado_nombre}? Su información se conserva y seguirá visible en el listado con registro Inactivo.`}
          confirmText={isDeactivating ? "Desactivando..." : "Desactivar"}
          closeOnConfirm={false}
          busy={isDeactivating}
          onConfirm={() => {
            const id = deactivateSession.snapshot?.id;
            if (id === undefined) return;
            deactivateContract(id, {
              onSettled: () => setDeactivateTargetId(null),
            });
          }}
          confirmColor="amber"
        />
      )}
    </ContractRowActionsProvider>
  );
}
