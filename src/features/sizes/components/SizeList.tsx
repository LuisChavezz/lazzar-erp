import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns } from "./SizeColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Size } from "../interfaces/size.interface";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import SizeForm from "./SizeForm";
import { useSizes } from "../hooks/useSizes";

export default function SizeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const { sizes, isLoading, isError, error } = useSizes();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);

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
    () => getColumns(handleEdit, { canEdit, canDelete }),
    [handleEdit, canEdit, canDelete]
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
        // El diálogo es DUAL (alta y edición: lo abre `handleEdit` por `open`,
        // sin pasar por el trigger), así que se monta también con solo permiso
        // de edición; lo que se oculta sin `canCreate` es el botón de alta.
        canCreate || canEdit ? (
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
              canCreate ? (
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleNew}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nueva Talla
                </Button>
              ) : undefined
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
