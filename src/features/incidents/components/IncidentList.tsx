"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { IncidentIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import type { StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { useUsers } from "@/src/features/users/hooks/useUsers";
import { getColumns, INCIDENT_HEADER_FILTERS } from "./IncidentColumns";
import { Incident } from "../interfaces/incident.interface";
import IncidentForm from "./IncidentForm";
import { useIncidents } from "../hooks/useIncidents";
import { useToggleIncidentActivo } from "../hooks/useToggleIncidentActivo";
import { IncidentRowActionsProvider, usePendingIncidentIds } from "../hooks/useIncidentRowActions";
import { buildIncidentRows, getStaleIncidentToggleNotice } from "../utils/incidentRows";

export default function IncidentList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  // Diálogo de fila: el id y el `activo` con que se abrió, resueltos contra el
  // listado COMPLETO — el toggle cambia `activo`, que es un filtro, y puede
  // sacar la fila de la vista. El `activo` de apertura decide el sentido
  // (dar de baja o reactivar) aunque la caché cambie después.
  const [toggleRequest, setToggleRequest] = useState<{ id: number; activo: boolean } | null>(null);
  const { incidents, isLoading, isInitialError, error } = useIncidents();
  const { employees } = useEmployees();
  // Solo para resolver `reportado_por`. No bloquea ni la tabla ni el
  // formulario: mientras carga la columna dice "…" y si falla cae a
  // "Usuario #N" (ver `resolveUserName`).
  const { data: users, isError: isUsersError } = useUsers();
  const { mutate: toggleActivo, isPending: isTogglePending } = useToggleIncidentActivo();
  const busyIds = usePendingIncidentIds();
  // Aviso del diálogo de fila que se cerró porque su incidencia cambió por
  // fuera. Se dispara desde un efecto: un toast en pleno render actualizaría
  // otro componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  // Sin `useCallback`/`useMemo`: el React Compiler memoiza el componente.
  const handleEdit = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedIncident(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve los FK como ID crudo; los nombres se resuelven en
  // cliente. Incluye a los empleados inactivos: una incidencia histórica sigue
  // mostrando a quién pertenece.
  const employeeNameById = new Map(
    employees.map((employee) => [employee.id, getEmployeeFullName(employee)])
  );
  // `null` mientras el catálogo de usuarios no tenga datos (cargando o caído).
  const usersById = users ? new Map(users.map((user) => [user.id, user])) : null;

  // Los nombres se incorporan a la FILA, no al accessor: así la llegada tardía
  // de cualquiera de los dos catálogos produce un `data` nuevo y TanStack
  // recalcula celda, búsqueda, orden y opciones de filtro. Ver `IncidentRow`.
  const rows = buildIncidentRows(incidents, employeeNameById, usersById, isUsersError);

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `IncidentRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    rows,
    INCIDENT_HEADER_FILTERS
  );

  // ── Diálogo de fila, resuelto contra el listado COMPLETO ──────────────────
  const toggleTargetId = toggleRequest?.id ?? null;
  const toggleTarget =
    toggleTargetId !== null ? (rows.find((row) => row.id === toggleTargetId) ?? null) : null;
  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo.
  const isToggling =
    toggleTargetId !== null && (busyIds.includes(toggleTargetId) || isTogglePending);

  // Vía rápida contra la caché: un refetch mostró que la incidencia del
  // diálogo abierto ya no existe o que su registro ya cambió de `activo` por
  // fuera. Se cierra con un aviso (la regla vive en
  // `getStaleIncidentToggleNotice`). Ajuste en render, no en un efecto.
  const staleToggle = getStaleIncidentToggleNotice({
    targetId: toggleTargetId,
    target: toggleTarget,
    expectedActivo: toggleRequest?.activo ?? true,
    isBusy: isToggling,
  });
  if (staleToggle) {
    setToggleRequest(null);
    setStaleNotice(staleToggle);
  }

  useEffect(() => {
    if (staleNotice) {
      // `id` estable: un doble render no duplica el aviso.
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  // Copia de la incidencia al ABRIR la confirmación: el texto y el sentido no
  // siguen a los refetch (el optimista invierte `activo` al confirmar) y
  // sobreviven a la animación de salida cuando el id vuelve a `null`.
  const toggleSession = useDialogSession(toggleRequest !== null, toggleTarget);
  const isDeactivate = toggleSession.snapshot?.activo ?? true;

  return (
    <IncidentRowActionsProvider
      value={{
        onEdit: handleEdit,
        onToggleActivo: (incident) => setToggleRequest({ id: incident.id, activo: incident.activo }),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice: el
        // toggle cambia `activo`, que es un filtro, y mueve filas.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar incidencia..."
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar incidencias"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando incidencias"
        actionButton={
          canEditHr ? (
            <MainDialog
              title={
                <DialogHeader
                  title={selectedIncident ? "Editar Incidencia" : "Alta de Incidencia"}
                  subtitle={selectedIncident ? "Edición de registro" : "Registro Nuevo"}
                  statusColor="amber"
                  icon={IncidentIcon}
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
                  + Nueva Incidencia
                </Button>
              }
            >
              <IncidentForm
                onSuccess={() => setIsDialogOpen(false)}
                incidentToEdit={selectedIncident}
              />
            </MainDialog>
          ) : null
        }
      />

      {/*
        Montado mientras haya una copia: `open` sale de la petición, así que al
        cerrarse anima su salida con el nombre y el sentido de la apertura.
        Queda abierto y bloqueado (`busy`) hasta que el servidor responde y el
        listado se refresca; entonces lo cierra su `onSettled`.
      */}
      {canDeleteHr && toggleSession.snapshot && (
        <ConfirmDialog
          key={`toggle-${toggleSession.id}`}
          open={toggleRequest !== null}
          onOpenChange={(open) => {
            if (!open) setToggleRequest(null);
          }}
          title={isDeactivate ? "Dar de baja Incidencia" : "Reactivar Incidencia"}
          description={
            isDeactivate
              ? `¿Deseas dar de baja la incidencia de ${toggleSession.snapshot.empleado_nombre}? Su información se conserva y seguirá visible en el listado con registro Inactivo.`
              : `¿Deseas reactivar la incidencia de ${toggleSession.snapshot.empleado_nombre}? Volverá a aparecer con registro Activo.`
          }
          confirmText={
            isToggling
              ? isDeactivate
                ? "Dando de baja..."
                : "Reactivando..."
              : isDeactivate
                ? "Dar de baja"
                : "Reactivar"
          }
          closeOnConfirm={false}
          busy={isToggling}
          onConfirm={() => {
            const snapshot = toggleSession.snapshot;
            if (!snapshot) return;
            toggleActivo(
              { id: snapshot.id, activo: !snapshot.activo },
              { onSettled: () => setToggleRequest(null) }
            );
          }}
          // `ConfirmDialog` usa la paleta de Radix: "green", no "emerald".
          confirmColor={isDeactivate ? "amber" : "green"}
        />
      )}
    </IncidentRowActionsProvider>
  );
}
