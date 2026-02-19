import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useSatUnitCodeStore } from "../stores/sat-unit-code.store";
import { getColumns } from "./SatUnitCodeColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { SatUnitCode } from "../interfaces/sat-unit-code.interface";
import { useSession } from "next-auth/react";
import SatUnitCodeForm from "./SatUnitCodeForm";

export default function SatUnitCodeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { satUnitCodes, setSelectedSatUnitCode, selectedSatUnitCode } = useSatUnitCodeStore(
    (state) => state
  );
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const handleEdit = useCallback(
    (code: SatUnitCode) => {
      setSelectedSatUnitCode(code);
      setIsDialogOpen(true);
    },
    [setSelectedSatUnitCode]
  );

  const handleNew = () => {
    setSelectedSatUnitCode(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getColumns(handleEdit, isAdmin), [handleEdit, isAdmin]);

  return (
    <DataTable
      columns={columns}
      data={satUnitCodes}
      title="Claves SAT Unidades"
      searchPlaceholder="Buscar clave..."
      actionButton={
        isAdmin ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedSatUnitCode ? "Editar Clave SAT" : "Alta de Clave SAT"}
                subtitle={selectedSatUnitCode ? "Edición de registro" : "Registro Nuevo"}
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
                + Nueva Clave
              </button>
            }
          >
            <SatUnitCodeForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
