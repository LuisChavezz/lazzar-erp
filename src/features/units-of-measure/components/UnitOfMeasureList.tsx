import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useUnitOfMeasureStore } from "../stores/unit-of-measure.store";
import { getColumns } from "./UnitOfMeasureColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { UnitOfMeasure } from "../interfaces/unit-of-measure.interface";
import { useSession } from "next-auth/react";
import UnitOfMeasureForm from "./UnitOfMeasureForm";

export default function UnitOfMeasureList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { units, setSelectedUnit, selectedUnit } = useUnitOfMeasureStore((state) => state);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const handleEdit = useCallback(
    (unit: UnitOfMeasure) => {
      setSelectedUnit(unit);
      setIsDialogOpen(true);
    },
    [setSelectedUnit]
  );

  const handleNew = () => {
    setSelectedUnit(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getColumns(handleEdit, isAdmin), [handleEdit, isAdmin]);

  return (
    <DataTable
      columns={columns}
      data={units}
      title="Unidades de Medida"
      searchPlaceholder="Buscar unidad..."
      actionButton={
        isAdmin ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedUnit ? "Editar Unidad de Medida" : "Alta de Unidad de Medida"}
                subtitle={selectedUnit ? "Edición de registro" : "Registro Nuevo"}
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
                + Nueva Unidad
              </button>
            }
          >
            <UnitOfMeasureForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
