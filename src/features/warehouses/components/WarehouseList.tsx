import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns } from "./WarehouseColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Warehouse } from "../interfaces/warehouse.interface";
import { useSession } from "next-auth/react";
import WarehouseForm from "./WarehouseForm";
import { useWarehouses } from "../hooks/useWarehouses";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";

export default function WarehouseList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const { data: warehouses, isLoading, isError, error } = useWarehouses();
  const availableBranches = useWorkspaceStore((state) => state.availableBranches);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");

  const handleEdit = useCallback((warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsDialogOpen(true);
  }, [setSelectedWarehouse, setIsDialogOpen]);

  const handleNew = () => {
    setSelectedWarehouse(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }, availableBranches),
    [handleEdit, canEditConfig, canDeleteConfig, availableBranches]
  );

  return (
    <DataTable
      columns={columns}
      data={warehouses ?? []}
      title="Almacenes"
      searchPlaceholder="Buscar almacén..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar almacenes"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando almacenes"
      actionButton={
        canEditConfig ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedWarehouse ? "Editar Almacén" : "Alta de Almacén"}
                subtitle={selectedWarehouse ? "Edición de registro" : "Registro Nuevo"}
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
                + Nuevo Almacén
              </Button>
            }
          >
            <WarehouseForm
              onSuccess={() => setIsDialogOpen(false)}
              warehouseToEdit={selectedWarehouse}
            />
          </MainDialog>
        ) : null
      }
    />
  );
}
