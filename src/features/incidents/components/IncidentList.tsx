"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable, type DataTableFilterConfig } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { useUsers } from "@/src/features/users/hooks/useUsers";
import type { User } from "@/src/features/users/interfaces/user.interface";
import { getColumns, IncidentRow } from "./IncidentColumns";
import { Incident } from "../interfaces/incident.interface";
import {
  ESTADO_INCIDENCIA_OPTIONS,
  GRAVEDAD_INCIDENCIA_OPTIONS,
  TIPO_INCIDENCIA_OPTIONS,
} from "../constants/incidentChoices";
import IncidentForm from "./IncidentForm";
import { useIncidents } from "../hooks/useIncidents";
import { useToggleIncidentActivo } from "../hooks/useToggleIncidentActivo";
import { IncidentRowActionsProvider } from "../hooks/useIncidentRowActions";

// Filtros en memoria sobre el valor CRUDO de la fila (`row.tipo`, `row.activo`,
// ...), no sobre la etiqueta: las opciones usan los mismos valores del enum, y
// `activo` se compara como `String(boolean)`.
const FILTER_CONFIG: DataTableFilterConfig[] = [
  { id: "tipo", label: "Tipo", options: TIPO_INCIDENCIA_OPTIONS },
  { id: "gravedad", label: "Gravedad", options: GRAVEDAD_INCIDENCIA_OPTIONS },
  { id: "estado", label: "Estado", options: ESTADO_INCIDENCIA_OPTIONS },
  {
    id: "activo",
    label: "Estatus",
    options: [
      { value: "true", label: "Activo" },
      { value: "false", label: "Inactivo" },
    ],
  },
];

/**
 * Texto de "Reportado por". SIEMPRE string, para que la columna nunca quede
 * fuera de la búsqueda global. Precedencia:
 *
 * 1. Sin reportante (`null`) → "—".
 * 2. Con el catálogo de usuarios cargado —aunque un refetch posterior haya
 *    fallado, porque `data` se conserva— → `nombre_completo` (el
 *    `get_full_name()` del backend), luego el email, y si el id no está en el
 *    catálogo, "Usuario #N".
 * 3. Sin datos y con la consulta en error → "Usuario #N".
 * 4. Sin datos y todavía cargando → "…". `/usuarios/` es lento (calcula
 *    permisos por usuario) y mostrar "Usuario #N" mientras tanto parecería una
 *    referencia rota, no una carga en curso.
 */
const getReporterName = (
  reportadoPor: number | null,
  usersById: Map<number, User> | null,
  usersFailed: boolean
): string => {
  if (reportadoPor === null) {
    return "—";
  }
  if (usersById) {
    const user = usersById.get(reportadoPor);
    return user?.nombre_completo?.trim() || user?.email || `Usuario #${reportadoPor}`;
  }
  return usersFailed ? `Usuario #${reportadoPor}` : "…";
};

export default function IncidentList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  // El diálogo de baja/reactivación vive aquí y no en la celda: la celda se
  // desmonta al ordenar/paginar/filtrar, y el toggle cambia `activo`, que es
  // justo el filtro "Estatus". Se guarda el ID y se resuelve contra el listado
  // COMPLETO (ver `toggleIncident`).
  const [toggleTargetId, setToggleTargetId] = useState<number | null>(null);
  const { incidents, isLoading, isInitialError, error } = useIncidents();
  const { employees } = useEmployees();
  // Solo para resolver `reportado_por`. No bloquea ni la tabla ni el
  // formulario: mientras carga la columna dice "…" y si falla cae a
  // "Usuario #N" (ver `getReporterName`).
  const { data: users, isError: isUsersError } = useUsers();
  const { mutate: toggleActivo } = useToggleIncidentActivo();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  // Sin `useCallback`/`useMemo`: el React Compiler memoiza el componente (ver
  // CLAUDE.md y `CostCenterList`), así que los handlers, los mapas, las filas y
  // las columnas conservan su identidad mientras no cambien sus entradas.
  const handleEdit = (incident: Incident) => {
    setSelectedIncident(incident);
    setIsDialogOpen(true);
  };

  const handleToggleActivo = (incident: Incident) => setToggleTargetId(incident.id);

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
  // recalcula celda, búsqueda y orden. Ver `IncidentRow`.
  const rows: IncidentRow[] = incidents.map((incident) => ({
    ...incident,
    empleado_nombre: employeeNameById.get(incident.empleado) ?? null,
    reportado_por_nombre: getReporterName(incident.reportado_por, usersById, isUsersError),
  }));

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `IncidentRowActionsProvider`, así un cambio de estatus no remonta las celdas.
  const columns = getColumns({ canEdit: canEditHr, canDelete: canDeleteHr });

  // La confirmación se resuelve contra el arreglo COMPLETO, así sobrevive a que
  // la fila salga de la vista filtrada —p. ej. dar de baja con el filtro
  // "Activo" puesto— y muestra el valor nuevo tras el refetch. Mismo criterio
  // que `CostCenterList`.
  const toggleIncident =
    toggleTargetId !== null
      ? (incidents.find((incident) => incident.id === toggleTargetId) ?? null)
      : null;

  // Si la incidencia desaparece del payload, el id no puede quedar colgado (un
  // refetch posterior reabriría el diálogo solo). Ajuste en RENDER, no en un
  // efecto (`react-hooks/set-state-in-effect`).
  if (toggleTargetId !== null && toggleIncident === null) setToggleTargetId(null);

  return (
    <IncidentRowActionsProvider
      value={{ onEdit: handleEdit, onToggleActivo: handleToggleActivo }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice: el
        // toggle cambia `activo` y, con el filtro "Estatus", mueve filas.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar incidencia..."
        filterConfig={FILTER_CONFIG}
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

      {canDeleteHr && toggleIncident && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setToggleTargetId(null);
            }
          }}
          title={toggleIncident.activo ? "Dar de baja Incidencia" : "Reactivar Incidencia"}
          description={
            toggleIncident.activo
              ? "¿Deseas dar de baja esta incidencia? Su información se conserva y seguirá visible en el listado con estatus Inactivo."
              : "¿Deseas reactivar esta incidencia? Volverá a aparecer con estatus Activo."
          }
          confirmText={toggleIncident.activo ? "Dar de baja" : "Reactivar"}
          onConfirm={() => {
            toggleActivo({ id: toggleIncident.id, activo: !toggleIncident.activo });
            setToggleTargetId(null);
          }}
          // `ConfirmDialog` usa la paleta de Radix: "green", no "emerald".
          confirmColor={toggleIncident.activo ? "amber" : "green"}
        />
      )}
    </IncidentRowActionsProvider>
  );
}
