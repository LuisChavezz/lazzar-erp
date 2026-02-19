import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { useSizeStore } from "../stores/size.store";
import { getColumns } from "./SizeColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Size } from "../interfaces/size.interface";
import { useSession } from "next-auth/react";
import SizeForm from "./SizeForm";

export default function SizeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { sizes, setSelectedSize, selectedSize } = useSizeStore((state) => state);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const handleEdit = useCallback(
    (size: Size) => {
      setSelectedSize(size);
      setIsDialogOpen(true);
    },
    [setSelectedSize]
  );

  const handleNew = () => {
    setSelectedSize(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getColumns(handleEdit, isAdmin), [handleEdit, isAdmin]);

  return (
    <DataTable
      columns={columns}
      data={sizes}
      title="Tallas"
      searchPlaceholder="Buscar talla..."
      actionButton={
        isAdmin ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedSize ? "Editar Talla" : "Alta de Talla"}
                subtitle={selectedSize ? "Edición de registro" : "Registro Nuevo"}
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
                + Nueva Talla
              </button>
            }
          >
            <SizeForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
