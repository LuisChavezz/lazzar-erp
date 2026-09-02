import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { useState } from "react";
import { BanIcon, CheckCircleIcon, EditIcon, ViewIcon } from "@/src/components/Icons";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { formatLocalDate } from "@/src/utils/formatDate";
import { Branch } from "@/src/features/branches/interfaces/branch.interface";
import { Department } from "@/src/features/departments/interfaces/department.interface";
import { Position } from "@/src/features/positions/interfaces/position.interface";
import { Employee } from "../interfaces/employee.interface";
import { getEmployeeFullName } from "../utils/employeeName";
import { useDeleteEmployee } from "../hooks/useDeleteEmployee";
import { useReactivateEmployee } from "../hooks/useReactivateEmployee";

const columnHelper = createColumnHelper<Employee>();

const ActionsCell = ({
  row,
  onViewDetails,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<Employee>;
  onViewDetails: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteEmployee, isPending } = useDeleteEmployee();
  const { mutate: reactivateEmployee, isPending: isReactivating } = useReactivateEmployee();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReactivateOpen, setIsReactivateOpen] = useState(false);

  // El DELETE del backend es una baja lógica: pone `activo` en false, no borra
  // el registro. Por eso la acción se ofrece solo sobre empleados activos —
  // sobre uno inactivo sería un no-op.
  const canDeactivate = canDelete && row.original.activo;

  // Reactivar es la dirección contraria del mismo cambio de ciclo de vida, así
  // que comparte permiso con desactivar (D-RH) y se excluyen entre sí: una fila
  // ofrece una acción o la otra, nunca las dos.
  const canReactivate = canDelete && !row.original.activo;

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => onViewDetails(row.original),
    },
  ];
  if (canEdit) {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(row.original),
    });
  }
  if (canDeactivate) {
    menuItems.push({
      label: "Desactivar",
      icon: BanIcon,
      onSelect: () => setIsDeleteOpen(true),
      disabled: isPending,
    });
  }
  if (canReactivate) {
    menuItems.push({
      label: "Reactivar",
      icon: CheckCircleIcon,
      onSelect: () => setIsReactivateOpen(true),
      disabled: isReactivating,
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de empleado" />
      {/*
        El diálogo sigue montado mientras esté abierto aunque `canDeactivate`
        ya sea falso: el optimista invierte `activo` en cuanto arranca la
        mutación, y sin esto el diálogo se desmontaría antes de poder mostrar
        su estado pendiente. Lo cierra el `onSettled` de la propia mutación.
      */}
      {(canDeactivate || isDeleteOpen) && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Desactivar Empleado"
          description="¿Deseas desactivar a este empleado? Su información se conserva y seguirá visible en el listado con estatus Inactivo."
          confirmText={isPending ? "Desactivando..." : "Desactivar"}
          closeOnConfirm={false}
          onConfirm={() => {
            if (isPending) {
              return;
            }
            deleteEmployee(row.original.id, {
              onSettled: () => setIsDeleteOpen(false),
            });
          }}
          confirmColor="amber"
        />
      )}
      {(canReactivate || isReactivateOpen) && (
        <ConfirmDialog
          open={isReactivateOpen}
          onOpenChange={setIsReactivateOpen}
          title="Reactivar Empleado"
          description="¿Deseas reactivar a este empleado? Volverá a aparecer con estatus Activo y se limpiará su fecha de baja."
          confirmText={isReactivating ? "Reactivando..." : "Reactivar"}
          closeOnConfirm={false}
          onConfirm={() => {
            if (isReactivating) {
              return;
            }
            reactivateEmployee(row.original.id, {
              onSettled: () => setIsReactivateOpen(false),
            });
          }}
          confirmColor="green"
        />
      )}
    </div>
  );
};

export const getColumns = (
  onViewDetails: (employee: Employee) => void,
  onEdit: (employee: Employee) => void,
  permissions: { canEdit: boolean; canDelete: boolean },
  catalogs: { branches: Branch[]; departments: Department[]; positions: Position[] }
) => {
  // El endpoint devuelve los FK como IDs crudos; se resuelven en cliente.
  const branchNameById = new Map(catalogs.branches.map((branch) => [branch.id, branch.nombre]));
  const departmentNameById = new Map(
    catalogs.departments.map((department) => [department.id_departamento, department.nombre])
  );
  const positionNameById = new Map(
    catalogs.positions.map((position) => [position.id, position.nombre])
  );

  const columns = [
    columnHelper.accessor("numero_empleado", {
      header: "No. Empleado",
      // Número clickeable: navega al detalle con el MISMO callback que la
      // acción "Ver Detalles". Mismo patrón que el folio de las órdenes.
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onViewDetails(row.original)}
          className="font-mono text-slate-700 dark:text-slate-200 font-semibold hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
          title="Ver detalle"
        >
          {row.original.numero_empleado}
        </button>
      ),
    }),
    columnHelper.accessor((row) => getEmployeeFullName(row), {
      id: "nombre_completo",
      header: "Nombre",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor(
      (row) => positionNameById.get(row.puesto) ?? String(row.puesto),
      {
        id: "puesto",
        header: "Puesto",
        cell: (info) => (
          <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
        ),
      }
    ),
    columnHelper.accessor(
      (row) => departmentNameById.get(row.departamento) ?? String(row.departamento),
      {
        id: "departamento",
        header: "Departamento",
        cell: (info) => (
          <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
        ),
      }
    ),
    columnHelper.accessor(
      (row) => branchNameById.get(row.sucursal) ?? String(row.sucursal),
      {
        id: "sucursal",
        header: "Sucursal",
        cell: (info) => (
          <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
        ),
      }
    ),
    columnHelper.accessor("fecha_ingreso", {
      header: "Ingreso",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatLocalDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("activo", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge
          status={info.getValue() ? "activo" : "inactivo"}
          config={ACTIVO_INACTIVO_CFG}
        />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => (
        <ActionsCell
          row={row}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          canEdit={permissions.canEdit}
          canDelete={permissions.canDelete}
        />
      ),
    }),
  ] as ColumnDef<Employee>[];

  return columns;
};
