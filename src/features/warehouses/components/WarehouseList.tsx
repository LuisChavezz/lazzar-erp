import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useWarehouseStore } from "../stores/warehouse.store";
import { getColumns } from "./WarehouseColumns";
import { MainDialog } from "../../../components/MainDialog";
import WarehouseForm from "./WarehouseForm";
import { Warehouse } from "../interfaces/warehouse.interface";

export default function WarehouseList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { warehouses, setSelectedWarehouse, selectedWarehouse } = useWarehouseStore(
    (state) => state
  );

  const handleEdit = useCallback((warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsDialogOpen(true);
  }, [setSelectedWarehouse]);

  const handleNew = () => {
    setSelectedWarehouse(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getColumns(handleEdit), [handleEdit]);

  return (
    <DataTable
      columns={columns}
      data={warehouses}
      title="Almacenes"
      searchPlaceholder="Buscar almacén..."
      actionButton={
        <MainDialog
          title={
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                  {selectedWarehouse ? "Editar Almacén" : "Alta de Almacén"}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {selectedWarehouse ? "Edición de registro" : "Registro Nuevo"}
                  </p>
                </div>
              </div>
            </div>
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
      }
    />
  );
}
