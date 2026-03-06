import { ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { SerieFolio } from "../interfaces/serie-folio.interface";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteSerieFolio } from "../hooks/useDeleteSerieFolio";

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

  return (
    <div className="flex items-center justify-center gap-2">
      {canEdit ? (
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
          title="Editar"
          onClick={() => onEdit(row.original)}
        >
          <EditIcon className="w-5 h-5" />
        </button>
      ) : null}
      {canDelete ? (
        <ConfirmDialog
          title="Eliminar Serie y Folio"
          description="¿Estás seguro de que deseas eliminar esta serie y folio? Esta acción no se puede deshacer."
          confirmText={isPending ? "Eliminando..." : "Eliminar"}
          onConfirm={() => deleteSerieFolio(row.original)}
          confirmColor="red"
          trigger={
            <button
              className="p-1 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
              title="Eliminar"
              disabled={isPending}
            >
              <DeleteIcon className="w-5 h-5" />
            </button>
          }
        />
      ) : null}
    </div>
  );
};

const StatusBadge = ({ status }: { status: SerieFolio["estatus"] }) => {
  const styles =
    status === "ACTIVO"
      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
      : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
      {status === "ACTIVO" ? "Activo" : "Inactivo"}
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
    columnHelper.display({
      id: "sucursal",
      header: "Sucursal",
      cell: ({ row }) => (
        <span className="text-slate-500 dark:text-slate-400">
          {branchLookup.get(row.original.sucursal) ?? "Sin sucursal"}
        </span>
      ),
    }),
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => <StatusBadge status={info.getValue()} />,
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
