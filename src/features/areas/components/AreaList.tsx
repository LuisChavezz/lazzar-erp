"use client";

import { useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { getColumns, AreaRow } from "./AreaColumns";
import { Area } from "../interfaces/area.interface";
import AreaForm from "./AreaForm";
import { useAreas } from "../hooks/useAreas";

export default function AreaList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const { areas, isLoading, isError, error } = useAreas();
  const { departments } = useDepartments();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = useCallback(
    (area: Area) => {
      setSelectedArea(area);
      setIsDialogOpen(true);
    },
    [setSelectedArea, setIsDialogOpen]
  );

  const handleNew = () => {
    setSelectedArea(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  const departmentNameById = useMemo(
    () =>
      new Map(departments.map((department) => [department.id_departamento, department.nombre])),
    [departments]
  );

  // El nombre se incorpora a la FILA, no al accessor: así la llegada tardía del
  // catálogo de departamentos produce un `data` nuevo y TanStack recalcula
  // celda, búsqueda y orden. Ver `AreaRow`.
  const rows = useMemo<AreaRow[]>(
    () =>
      areas.map((area) => ({
        ...area,
        departamento_nombre: departmentNameById.get(area.departamento) ?? null,
      })),
    [areas, departmentNameById]
  );

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditHr, canDelete: canDeleteHr }),
    [handleEdit, canEditHr, canDeleteHr]
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Buscar área..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar áreas"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando áreas"
      actionButton={
        canEditHr ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedArea ? "Editar Área" : "Alta de Área"}
                subtitle={selectedArea ? "Edición de registro" : "Registro Nuevo"}
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
                + Nueva Área
              </Button>
            }
          >
            <AreaForm onSuccess={() => setIsDialogOpen(false)} areaToEdit={selectedArea} />
          </MainDialog>
        ) : null
      }
    />
  );
}
