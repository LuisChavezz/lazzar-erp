import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { SerieFolio } from "../interfaces/serie-folio.interface";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteSerieFolio } from "../hooks/useDeleteSerieFolio";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { useState } from "react";

const columnHelper = createColumnHelper<SerieFolio>();

const ActionsCell = ({
  row,
  onEdit,
  canEdit,
  canDelete,
}: {
  row: Row<SerieFolio>;
  onEdit: (serieFolio: SerieFolio) => void;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const { mutate: deleteSerieFolio, isPending } = useDeleteSerieFolio();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [];
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
      <ActionMenu items={menuItems} />
      {canDelete && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Eliminar Serie y Folio"
          description="¿Estás seguro de que deseas eliminar esta serie y folio? Esta acción no se puede deshacer."
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          onConfirm={() => {
            deleteSerieFolio(row.original);
            setIsDeleteOpen(false);
          }}
          confirmColor="red"
        />
      )}
    </div>
  );
};

const StatusBadge = ({ active }: { active: boolean }) => {
  const styles =
    active
      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
      : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
      {active ? "Activo" : "Inactivo"}
    </span>
  );
};

export const getSerieFolioColumns = (
  onEdit: (serieFolio: SerieFolio) => void,
  permissions: { canEdit: boolean; canDelete: boolean },
  branchLookup: Map<number, string>
) => {
  const columns = [
    columnHelper.accessor("tipo_documento", {
      header: "Tipo Documento",
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("serie", {
      header: "Serie",
      cell: (info) => (
        <span className="font-mono text-slate-600 dark:text-slate-300">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.display({
      id: "rango",
      header: "Rango",
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-300">
          {row.original.folio_inicial} - {row.original.folio_final}
        </span>
      ),
    }),
    columnHelper.accessor("folio_actual", {
      header: "Folio Actual",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300">
          {info.getValue()}
        </span>
      ),
    }),
    // `accessor` (no `display`) con el nombre de sucursal YA resuelto, para que
    // la columna participe en la búsqueda global. Como `display` no tiene
    // accessor alguno, TanStack la excluía del filtro global en TODAS las filas
    // —no es el bug de la fila 0, es ausencia total de valor buscable— y el
    // nombre de sucursal es texto libre que el usuario sí espera poder buscar.
    //
    // El miss del lookup colapsa a `""` (misma convención que el resto del
    // proyecto) y NO a `undefined`: `branchLookup` se arma con una query
    // independiente de la del listado (`useCompanyBranches`, ver
    // `SerieFolioList`), así que puede llegar vacío o incompleto mientras carga,
    // si falla, si no hay empresa seleccionada, o si la serie apunta a una
    // sucursal ajena a la empresa actual. Devolver `""` mantiene el valor como
    // string y con ello la columna elegible para la búsqueda; `undefined` la
    // volvería a dejar fuera. Al resolverse la query, `getSerieFolioColumns` se
    // reconstruye (el `useMemo` depende de `branchLookup`) y el accessor pasa a
    // devolver el nombre real.
    columnHelper.accessor((row) => branchLookup.get(row.sucursal) ?? "", {
      id: "sucursal",
      header: "Sucursal",
      // `display` nunca era ordenable (`getCanSort` exige `accessorFn`); un
      // `accessor` sí lo es por defecto, y aquí el valor puede estar vacío
      // mientras `branchLookup` (query independiente de `useCompanyBranches`)
      // sigue cargando — ordenar en ese momento sería un empate sin sentido
      // que además se reacomoda solo cuando el lookup resuelve. Se desactiva
      // explícitamente para conservar el comportamiento de antes (columna no
      // ordenable) y no sumar ese reacomodo inesperado.
      enableSorting: false,
      // Se reutiliza el valor del accessor en vez de repetir el lookup. `||` y
      // no `??`: el valor sin resolver llega como `""`, no como `null`. El
      // render es idéntico al anterior (nombre resuelto, o "Sin sucursal").
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">
          {info.getValue() || "Sin sucursal"}
        </span>
      ),
    }),
    columnHelper.accessor("activo", {
      header: "Estatus",
      cell: (info) => <StatusBadge active={info.getValue()} />,
    }),
  ] as ColumnDef<SerieFolio>[];

  if (permissions.canEdit || permissions.canDelete) {
    columns.push(
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-center">Acciones</div>,
        cell: ({ row }) => (
          <ActionsCell
            row={row}
            onEdit={onEdit}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
          />
        ),
      }) as ColumnDef<SerieFolio>
    );
  }

  return columns;
};
