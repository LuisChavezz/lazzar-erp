"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, EditIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import {
  InfoField,
  InfoGrid,
  Section,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatLocalDate } from "@/src/utils/formatDate";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { usePositions } from "@/src/features/positions/hooks/usePositions";
import { useEmployee } from "../hooks/useEmployee";
import { getEmployeeFullName } from "../utils/employeeName";
import EmployeeForm from "./EmployeeForm";

// Destino del "Volver". Fijo, sin mapa `?from=`: la ruta cuelga de `/hr`, exige
// `R-RH` y hoy solo se alcanza desde el listado del propio módulo.
const BACK = {
  href: "/hr/employees",
  label: "Volver a Empleados",
};

interface EmployeeDetailContentProps {
  employeeId: string;
}

const BackLink = () => (
  <div className="sticky top-0 z-10 py-2 w-fit">
    <Link
      href={BACK.href}
      className="flex items-center gap-2 text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span className="text-sm font-medium">{BACK.label}</span>
    </Link>
  </div>
);

export const EmployeeDetailContent = ({ employeeId }: EmployeeDetailContentProps) => {
  const { data: employee, isLoading, isError, error } = useEmployee(employeeId);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Mismos catálogos que el listado para resolver los FK (IDs crudos).
  const availableBranches = useWorkspaceStore((state) => state.availableBranches);
  const { departments } = useDepartments();
  const { positions } = usePositions();

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditHr = isAdmin || permissions.includes("E-RH");

  if (isLoading) {
    return <Loader title="Cargando empleado" message="Obteniendo detalle del empleado..." />;
  }

  if (isError || !employee) {
    return (
      <div className="w-full space-y-6">
        <BackLink />
        <ErrorState
          title="Error al cargar el empleado"
          message={extractErrorMessage(error, "No se pudo cargar la información.")}
        />
      </div>
    );
  }

  const branchName = availableBranches.find((branch) => branch.id === employee.sucursal)?.nombre;
  const departmentName = departments.find(
    (department) => department.id_departamento === employee.departamento
  )?.nombre;
  const positionName = positions.find((position) => position.id === employee.puesto)?.nombre;

  return (
    <div className="w-full space-y-6">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {getEmployeeFullName(employee)}
            </h1>
            <StatusBadge
              status={employee.activo ? "activo" : "inactivo"}
              config={ACTIVO_INACTIVO_CFG}
            />
          </div>
          <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
            {employee.numero_empleado}
          </p>
        </div>

        {canEditHr && (
          <MainDialog
            title={
              <DialogHeader
                title="Editar Empleado"
                subtitle="Edición de registro"
                statusColor="emerald"
              />
            }
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            maxWidth="1000px"
            trigger={
              <Button variant="primary" rounded="full" className="hover:scale-105 active:scale-95">
                <span className="flex items-center gap-2">
                  <EditIcon className="w-4 h-4" />
                  Editar
                </span>
              </Button>
            }
          >
            <EmployeeForm onSuccess={() => setIsEditOpen(false)} employeeToEdit={employee} />
          </MainDialog>
        )}
      </div>

      <Section title="Datos personales">
        <InfoGrid>
          <InfoField label="Nombre(s)">{employee.nombre}</InfoField>
          <InfoField label="Apellido paterno">{employee.apellido_paterno}</InfoField>
          <InfoField label="Apellido materno">{textOrDash(employee.apellido_materno)}</InfoField>
          <InfoField label="Fecha de nacimiento">
            {formatLocalDate(employee.fecha_nacimiento)}
          </InfoField>
          <InfoField label="CURP">{textOrDash(employee.curp)}</InfoField>
          <InfoField label="RFC">{textOrDash(employee.rfc)}</InfoField>
          <InfoField label="Correo">{textOrDash(employee.email)}</InfoField>
          <InfoField label="Teléfono">{textOrDash(employee.telefono)}</InfoField>
        </InfoGrid>
      </Section>

      <Section title="Datos laborales">
        <InfoGrid>
          <InfoField label="Número de empleado">
            <span className="font-mono">{employee.numero_empleado}</span>
          </InfoField>
          <InfoField label="Puesto">{textOrDash(positionName)}</InfoField>
          <InfoField label="Departamento">{textOrDash(departmentName)}</InfoField>
          <InfoField label="Sucursal">{textOrDash(branchName)}</InfoField>
          <InfoField label="Fecha de ingreso">{formatLocalDate(employee.fecha_ingreso)}</InfoField>
          <InfoField label="Fecha de baja">{formatLocalDate(employee.fecha_baja)}</InfoField>
          <InfoField label="Estatus">
            <StatusBadge
              status={employee.activo ? "activo" : "inactivo"}
              config={ACTIVO_INACTIVO_CFG}
            />
          </InfoField>
        </InfoGrid>
      </Section>

      {/*
        Aquí crecerán las pestañas del expediente (contratos, asistencia,
        nómina, evaluaciones): todas cuelgan de `hr.Empleado` en el backend.
        Esta iteración es solo el empleado.
      */}
    </div>
  );
};
