import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns } from "./SizeColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Size } from "../interfaces/size.interface";
import { useSession } from "next-auth/react";
import SizeForm from "./SizeForm";
import { useSizes } from "../hooks/useSizes";

export default function SizeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const { sizes, isLoading, isError, error } = useSizes();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");

  const handleEdit = useCallback(
    (size: Size) => {
      setSelectedSize(size);
      setIsDialogOpen(true);
    },
    [setSelectedSize, setIsDialogOpen]
  );

  const handleNew = () => {
    setSelectedSize(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [handleEdit, canEditConfig, canDeleteConfig]
  );

  return (
    <DataTable
      columns={columns}
      data={sizes}
      title="Tallas"
      searchPlaceholder="Buscar talla..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar tallas"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando tallas"
      actionButton={
        canEditConfig ? (
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
              <Button
                variant="primary"
                rounded="full"
                onClick={handleNew}
                className="hover:scale-105 active:scale-95"
              >
                + Nueva Talla
              </Button>
            }
          >
            <SizeForm
              onSuccess={() => setIsDialogOpen(false)}
              sizeToEdit={selectedSize}
            />
          </MainDialog>
        ) : null
      }
    />
  );
}
