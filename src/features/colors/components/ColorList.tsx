import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
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
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");

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
              <Button
                variant="primary"
                rounded="full"
                onClick={handleNew}
                className="hover:scale-105 active:scale-95"
              >
                + Nuevo Color
              </Button>
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
