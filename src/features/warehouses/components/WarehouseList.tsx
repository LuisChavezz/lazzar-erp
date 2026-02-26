import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { ErrorState } from "../../../components/ErrorState";
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
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");

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

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando almacenes...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState title="Error al cargar almacenes" message={(error as Error).message} />
    );
  }

  if (!warehouses) return null;

  return (
    <DataTable
      columns={columns}
      data={warehouses}
      title="Almacenes"
      searchPlaceholder="Buscar almacén..."
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
              <button
                onClick={handleNew}
                className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                + Nuevo Almacén
              </button>
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
