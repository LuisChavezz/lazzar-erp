import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useColorStore } from "../stores/color.store";
import { getColumns } from "./ColorColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Color } from "../interfaces/color.interface";
import { useSession } from "next-auth/react";
import ColorForm from "./ColorForm";

export default function ColorList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { colors, setSelectedColor, selectedColor } = useColorStore((state) => state);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const handleEdit = useCallback(
    (color: Color) => {
      setSelectedColor(color);
      setIsDialogOpen(true);
    },
    [setSelectedColor]
  );

  const handleNew = () => {
    setSelectedColor(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getColumns(handleEdit, isAdmin), [handleEdit, isAdmin]);

  return (
    <DataTable
      columns={columns}
      data={colors}
      title="Colores"
      searchPlaceholder="Buscar color..."
      actionButton={
        isAdmin ? (
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
            <ColorForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
