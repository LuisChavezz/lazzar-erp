import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useWarehouseStore } from "../stores/warehouse.store";
import { getColumns } from "./WarehouseColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Warehouse } from "../interfaces/warehouse.interface";
import { useSession } from "next-auth/react";
import WarehouseForm from "./WarehouseForm";

export default function WarehouseList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { warehouses, setSelectedWarehouse, selectedWarehouse } = useWarehouseStore(
    (state) => state
  );
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");

  const handleEdit = useCallback((warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsDialogOpen(true);
  }, [setSelectedWarehouse]);

  const handleNew = () => {
    setSelectedWarehouse(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [handleEdit, canEditConfig, canDeleteConfig]
  );

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
            <WarehouseForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
