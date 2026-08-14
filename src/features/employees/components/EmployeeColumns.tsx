import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { useState } from "react";
import { DeleteIcon, EditIcon, ViewIcon } from "@/src/components/Icons";
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
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
  if (canDelete) {
    menuItems.push({
      label: "Cancelar",
      icon: DeleteIcon,
      onSelect: () => setIsDeleteOpen(true),
      disabled: isPending,
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de empleado" />
      {canDelete && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Eliminar Empleado"
          description="¿Estás seguro de que deseas eliminar este empleado? Esta acción no se puede deshacer."
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          onConfirm={() => {
            deleteEmployee(row.original.id);
            setIsDeleteOpen(false);
          }}
          confirmColor="red"
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
