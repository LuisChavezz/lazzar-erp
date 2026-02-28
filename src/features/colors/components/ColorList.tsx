import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { ErrorState } from "../../../components/ErrorState";
import { getColumns } from "./ColorColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Color } from "../interfaces/color.interface";
import { useSession } from "next-auth/react";
import ColorForm from "./ColorForm";
import { useColors } from "../hooks/useColors";

export default function ColorList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const { colors, isLoading, isError, error } = useColors();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");

  const handleEdit = useCallback(
    (color: Color) => {
      setSelectedColor(color);
      setIsDialogOpen(true);
    },
    [setSelectedColor, setIsDialogOpen]
  );

  const handleNew = () => {
    setSelectedColor(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [handleEdit, canEditConfig, canDeleteConfig]
  );

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando colores...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar colores"
        message={(error as Error).message}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={colors}
      title="Colores"
      searchPlaceholder="Buscar color..."
      actionButton={
        canEditConfig ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedColor ? "Editar Color" : "Alta de Color"}
                subtitle={selectedColor ? "Edición de registro" : "Registro Nuevo"}
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
                + Nuevo Color
              </button>
            }
          >
            <ColorForm
              onSuccess={() => setIsDialogOpen(false)}
              colorToEdit={selectedColor}
            />
          </MainDialog>
        ) : null
      }
    />
  );
}
