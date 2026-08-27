import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { getColumns } from "./ColorColumns";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Color } from "../interfaces/color.interface";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import ColorForm from "./ColorForm";
import { useColors } from "../hooks/useColors";

export default function ColorList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const { colors, isLoading, isError, error } = useColors();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);

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
    () => getColumns(handleEdit, { canEdit, canDelete }),
    [handleEdit, canEdit, canDelete]
  );

  return (
    <DataTable
      columns={columns}
      data={colors}
      title="Colores"
      searchPlaceholder="Buscar color..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar colores"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando colores"
      actionButton={
        // El diálogo es DUAL (alta y edición: lo abre `handleEdit` por `open`,
        // sin pasar por el trigger), así que se monta también con solo permiso
        // de edición; lo que se oculta sin `canCreate` es el botón de alta.
        canCreate || canEdit ? (
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
              canCreate ? (
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleNew}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nuevo Color
                </Button>
              ) : undefined
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
