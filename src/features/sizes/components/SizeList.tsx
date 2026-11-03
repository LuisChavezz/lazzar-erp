import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns } from "./SizeColumns";
import { MainDialog } from "../../../components/MainDialog";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useDeleteSize } from "../hooks/useDeleteSize";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Size } from "../interfaces/size.interface";
import { useIsSuperuser } from "@/src/features/users/hooks/useIsSuperuser";
import SizeForm from "./SizeForm";
import { useSizes } from "../hooks/useSizes";

export default function SizeList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const { sizes, isLoading, isInitialError, error } = useSizes();
  // Catálogo global: el backend (`SoloSuperusuarioEscribe`) solo deja escribir
  // al superusuario; un admin de empresa recibiría 403 (EC-714).
  const isSuperuser = useIsSuperuser();
  const canCreate = isSuperuser;
  const canEdit = isSuperuser;
  const canDelete = isSuperuser;

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

  // La confirmación de baja vive aquí y no en la celda: las celdas se
  // desmontan al ordenar, paginar o filtrar.
  const [sizeToDelete, setSizeToDelete] = useState<Size | null>(null);
  const isDeleteOpen = sizeToDelete !== null;
  const deleteSession = useDialogSession(isDeleteOpen, sizeToDelete);
  const { mutate: deleteSize } = useDeleteSize();

  const columns = useMemo(
    () => getColumns(handleEdit, setSizeToDelete, { canEdit, canDelete }),
    [handleEdit, canEdit, canDelete]
  );

  return (
    <>
      {canDelete && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={(open) => {
            if (!open) setSizeToDelete(null);
          }}
          title="Eliminar Talla"
          description="¿Estás seguro de que deseas eliminar esta talla? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          onConfirm={() => {
            if (deleteSession.snapshot) deleteSize(deleteSession.snapshot.id);
            setSizeToDelete(null);
          }}
          confirmColor="red"
        />
      )}
      <DataTable
        columns={columns}
        data={sizes}
        searchPlaceholder="Buscar talla..."
        isLoading={isLoading}
        isError={isInitialError}
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
    </>
  );
}
