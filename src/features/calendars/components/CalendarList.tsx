"use client";

import { useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useShifts } from "@/src/features/shifts/hooks/useShifts";
import { getColumns, CalendarRow } from "./CalendarColumns";
import { Calendar } from "../interfaces/calendar.interface";
import CalendarForm from "./CalendarForm";
import { useCalendars } from "../hooks/useCalendars";

export default function CalendarList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const { calendars, isLoading, isError, error } = useCalendars();
  const { shifts } = useShifts();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = useCallback(
    (calendar: Calendar) => {
      setSelectedCalendar(calendar);
      setIsDialogOpen(true);
    },
    [setSelectedCalendar, setIsDialogOpen]
  );

  const handleNew = () => {
    setSelectedCalendar(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  const shiftNameById = useMemo(
    () => new Map(shifts.map((shift) => [shift.id, shift.nombre])),
    [shifts]
  );

  // El nombre se incorpora a la FILA, no al accessor: así la llegada tardía del
  // catálogo de turnos produce un `data` nuevo y TanStack recalcula celda,
  // búsqueda y orden. Ver `CalendarRow`.
  const rows = useMemo<CalendarRow[]>(
    () =>
      calendars.map((calendar) => ({
        ...calendar,
        turno_nombre: shiftNameById.get(calendar.turno) ?? null,
      })),
    [calendars, shiftNameById]
  );

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditHr, canDelete: canDeleteHr }),
    [handleEdit, canEditHr, canDeleteHr]
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      // Ata la identidad de la fila al id del registro y no a su índice: las
      // celdas guardan el estado de su diálogo y las filas se reordenan.
      getRowId={(row) => String(row.id)}
      searchPlaceholder="Buscar día..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar el calendario"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando calendario"
      actionButton={
        canEditHr ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedCalendar ? "Editar Día" : "Alta de Día"}
                subtitle={selectedCalendar ? "Edición de registro" : "Registro Nuevo"}
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
                + Nuevo Día
              </Button>
            }
          >
            <CalendarForm
              onSuccess={() => setIsDialogOpen(false)}
              calendarToEdit={selectedCalendar}
            />
          </MainDialog>
        ) : null
      }
    />
  );
}
