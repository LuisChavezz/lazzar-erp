"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { CalendarDaysIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatLocalDate } from "@/src/utils/formatDate";
import { hasPermission } from "@/src/utils/permissions";
import { getStaleRowDialogNotice, type StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useShifts } from "@/src/features/shifts/hooks/useShifts";
import { getColumns, CALENDAR_HEADER_FILTERS } from "./CalendarColumns";
import { Calendar } from "../interfaces/calendar.interface";
import CalendarForm from "./CalendarForm";
import { useCalendars } from "../hooks/useCalendars";
import { useDeleteCalendar } from "../hooks/useDeleteCalendar";
import { CalendarRowActionsProvider, usePendingCalendarIds } from "../hooks/useCalendarRowActions";
import { buildCalendarRows, CALENDAR_STALE_MESSAGES } from "../utils/calendarRows";

export default function CalendarList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  // Diálogo de fila: solo el id, resuelto contra el listado completo.
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const { calendars, isLoading, isInitialError, error } = useCalendars();
  const { shifts } = useShifts();
  const { mutate: deleteCalendar, isPending: isDeletePending } = useDeleteCalendar();
  const busyIds = usePendingCalendarIds();
  // Aviso del diálogo de fila que se cerró porque su día desapareció por fuera.
  // Se dispara desde un efecto: un toast en pleno render actualizaría otro
  // componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedCalendar(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  const shiftNameById = new Map(shifts.map((shift) => [shift.id, shift.nombre]));

  // El nombre se incorpora a la FILA, no al accessor: así la llegada tardía del
  // catálogo de turnos produce un `data` nuevo y TanStack recalcula celda,
  // búsqueda, orden y opciones de filtro. Ver `CalendarRow`.
  const rows = buildCalendarRows(calendars, shiftNameById);

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `CalendarRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    rows,
    CALENDAR_HEADER_FILTERS
  );

  // ── Diálogo de fila, resuelto contra el listado COMPLETO ──────────────────
  const deleteTarget =
    deleteTargetId !== null ? (rows.find((row) => row.id === deleteTargetId) ?? null) : null;
  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo.
  const isDeleting =
    deleteTargetId !== null && (busyIds.includes(deleteTargetId) || isDeletePending);

  // Vía rápida contra la caché: un refetch mostró que el día del diálogo
  // abierto ya no existe. Se cierra con un aviso (mismo patrón que
  // `EmployeeList`). Sin `expectedActivo`: `Calendario` no tiene baja lógica.
  // El borrado propio quita la fila en el optimista, pero va en vuelo y no
  // avisa. Ajuste en render, no en un efecto.
  const staleDelete = getStaleRowDialogNotice({
    resource: "calendar",
    targetId: deleteTargetId,
    target: deleteTarget,
    isBusy: isDeleting,
    messages: CALENDAR_STALE_MESSAGES,
  });
  if (staleDelete) {
    setDeleteTargetId(null);
    setStaleNotice(staleDelete);
  }

  useEffect(() => {
    if (staleNotice) {
      // `id` estable: un doble render no duplica el aviso.
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  // Copia del día al ABRIR la confirmación: el texto no sigue a los refetch y
  // sobrevive al optimista que quita la fila y a la animación de salida.
  const deleteSession = useDialogSession(deleteTargetId !== null, deleteTarget);

  return (
    <CalendarRowActionsProvider
      value={{
        onEdit: handleEdit,
        onDelete: (calendar) => setDeleteTargetId(calendar.id),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice: las
        // filas se reordenan y se filtran.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar día..."
        isLoading={isLoading}
        isError={isInitialError}
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
                  icon={CalendarDaysIcon}
                />
              }
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              maxWidth={DIALOG_WIDTH_FORM}
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

      {/*
        Montado mientras haya una copia: `open` sale del id, así que al
        cerrarse anima su salida con la fecha de la apertura.
      */}
      {canDeleteHr && deleteSession.snapshot && (
        <ConfirmDialog
          key={deleteSession.id}
          open={deleteTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetId(null);
          }}
          title="Eliminar Día de Calendario"
          description={`¿Estás seguro de que deseas eliminar el día ${formatLocalDate(deleteSession.snapshot.fecha)} (${deleteSession.snapshot.turno_nombre})? Esta acción no se puede deshacer.`}
          confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
          closeOnConfirm={false}
          busy={isDeleting}
          onConfirm={() => {
            const id = deleteSession.snapshot?.id;
            if (id === undefined) return;
            deleteCalendar(id, {
              onSettled: () => setDeleteTargetId(null),
            });
          }}
          confirmColor="red"
        />
      )}
    </CalendarRowActionsProvider>
  );
}
