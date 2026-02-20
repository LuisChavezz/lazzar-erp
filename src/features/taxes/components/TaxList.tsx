import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useTaxStore } from "../stores/tax.store";
import { getColumns } from "./TaxColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Tax } from "../interfaces/tax.interface";
import { useSession } from "next-auth/react";
import TaxForm from "./TaxForm";

export default function TaxList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { taxes, setSelectedTax, selectedTax } = useTaxStore((state) => state);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");

  const handleEdit = useCallback(
    (tax: Tax) => {
      setSelectedTax(tax);
      setIsDialogOpen(true);
    },
    [setSelectedTax]
  );

  const handleNew = () => {
    setSelectedTax(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [handleEdit, canEditConfig, canDeleteConfig]
  );

  return (
    <DataTable
      columns={columns}
      data={taxes}
      title="Impuestos"
      searchPlaceholder="Buscar impuesto..."
      actionButton={
        canEditConfig ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedTax ? "Editar Impuesto" : "Alta de Impuesto"}
                subtitle={selectedTax ? "Edición de registro" : "Registro Nuevo"}
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
                + Nuevo Impuesto
              </button>
            }
          >
            <TaxForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
