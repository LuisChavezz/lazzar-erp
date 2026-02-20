import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useSatProdservCodeStore } from "../stores/sat-prodserv-code.store";
import { getColumns } from "./SatProdservCodeColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { SatProdservCode } from "../interfaces/sat-prodserv-code.interface";
import { useSession } from "next-auth/react";
import SatProdservCodeForm from "./SatProdservCodeForm";

export default function SatProdservCodeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { satProdservCodes, setSelectedSatProdservCode, selectedSatProdservCode } =
    useSatProdservCodeStore((state) => state);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");

  const handleEdit = useCallback(
    (code: SatProdservCode) => {
      setSelectedSatProdservCode(code);
      setIsDialogOpen(true);
    },
    [setSelectedSatProdservCode]
  );

  const handleNew = () => {
    setSelectedSatProdservCode(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [handleEdit, canEditConfig, canDeleteConfig]
  );

  return (
    <DataTable
      columns={columns}
      data={satProdservCodes}
      title="Claves SAT Prod/Serv"
      searchPlaceholder="Buscar clave..."
      actionButton={
        canEditConfig ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedSatProdservCode ? "Editar Clave SAT" : "Alta de Clave SAT"}
                subtitle={selectedSatProdservCode ? "Edición de registro" : "Registro Nuevo"}
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
            <SatProdservCodeForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
