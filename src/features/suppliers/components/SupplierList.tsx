"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  DataTable,
  type DataTableHandle,
  type DataTableVisibleColumn,
} from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "@/src/components/Button";
import { ExportCsvIcon, ExportPdfIcon, PlusIcon } from "@/src/components/Icons";
import { hasPermission } from "@/src/utils/permissions";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDeleteSupplier } from "../hooks/useDeleteSupplier";
import SupplierFormDialog from "./SupplierFormDialog";
import { useSuppliers } from "../hooks/useSuppliers";
import { supplierDetailHref } from "../utils/supplierPurchaseOrderHistoryFilters";
import { getSupplierColumns } from "./SupplierColumns";
import { useSupplierCsvExport } from "../hooks/useSupplierCsvExport";
import { useSupplierPdfExport } from "../hooks/useSupplierPdfExport";
import { Supplier } from "../interfaces/supplier.interface";

/**
 * Códigos de permiso por punto de montaje.
 *
 * Este listado se alcanza desde DOS módulos distintos y cada uno tiene su propia
 * familia en el catálogo de la tabla `permisos`: quien administra proveedores
 * desde Compras no es necesariamente quien administra los catálogos del sistema.
 * La lectura ya la controla la ruta de cada módulo (`R-COMPRAS-PROV` en
 * `/procurement/suppliers`, `R-CONFIGURACION` en `/config`); esto solo decide
 * qué códigos gobiernan alta, edición y baja.
 */
const PERMISSIONS_BY_CONTEXT = {
  procurement: {
    create: "C-COMPRAS-PROV",
    edit: "E-COMPRAS-PROV",
    delete: "D-COMPRAS-PROV",
  },
  config: {
    create: "C-CONFIGURACION",
    edit: "E-CONFIGURACION",
    delete: "D-CONFIGURACION",
  },
} as const;

interface SupplierListProps {
  /**
   * Familia de permisos a aplicar según desde dónde se monte el listado.
   * Por defecto "procurement", que es el comportamiento histórico.
   */
  permissionContext?: keyof typeof PERMISSIONS_BY_CONTEXT;
  /**
   * Cuando es `true`, el cuerpo de la tabla LLENA su contenedor en vez de
   * reservar un alto fijo de 480px sin importar cuántas filas haya — evita
   * el scroll de página "vacío" que deja un catálogo corto como Proveedores.
   * Requiere que el padre inmediato le dé una altura acotada. Hoy ningún
   * punto de montaje lo activa: la página de Compras pone los indicadores
   * encima de la lista y hace scroll normal, y Configuración monta este
   * componente SIN un contenedor de altura acotada. Activarlo sin esa altura
   * colapsaría la tabla a 0px de alto. Por defecto `false`.
   */
  fillHeight?: boolean;
}

export default function SupplierList({
  permissionContext = "procurement",
  fillHeight = false,
}: SupplierListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const { suppliers, isLoading, isError, error } = useSuppliers();
  const { data: session } = useSession();

  // `hasPermission` ya cortocircuita para el rol "admin", así que no hace falta
  // el `isAdmin || ...` manual que vivía aquí.
  const permissions = PERMISSIONS_BY_CONTEXT[permissionContext];
  const canCreate = hasPermission(permissions.create, session?.user);
  const canEdit = hasPermission(permissions.edit, session?.user);
  const canDelete = hasPermission(permissions.delete, session?.user);
  // El detalle (`/procurement/suppliers/[id]`) solo se ofrece desde Compras:
  // Configuración monta este listado como catálogo de solo edición. Exige el
  // permiso de LECTURA de la ruta destino, no el de edición.
  const canViewDetail =
    permissionContext === "procurement" && hasPermission("R-COMPRAS-PROV", session?.user);

  // `handleViewDetail`, `handleEdit` y `columns` sin `useCallback`/`useMemo`: el React Compiler
  // memoiza (ver CLAUDE.md).
  const router = useRouter();
  const handleViewDetail = (supplier: Supplier) => router.push(supplierDetailHref(supplier.id));

  const handleEdit = (supplier: Supplier) => {
    setSupplierToEdit(supplier);
    setIsDialogOpen(true);
  };

  // ── Desactivar ────────────────────────────────────────────────────────────
  // El diálogo vive AQUÍ y no en la celda: la baja quita la fila de forma
  // optimista (y ordenar/paginar desmonta celdas), así que un diálogo dentro de
  // la celda se desmontaría con ella. La celda solo dispara `onDeactivate`.
  // El DELETE del backend es una baja LÓGICA (`activo=False`): el proveedor
  // deja de listarse y su detalle responde 404, pero no se borra.
  const [supplierToDeactivate, setSupplierToDeactivate] = useState<Supplier | null>(null);
  const { mutate: deactivateSupplier, isPending: isDeactivating } = useDeleteSupplier();

  const handleCreate = useCallback(() => {
    setSupplierToEdit(null);
    setIsDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSupplierToEdit(null);
    }
  }, []);

  const handleSuccess = useCallback(() => {
    setIsDialogOpen(false);
    setSupplierToEdit(null);
  }, []);

  const columns = getSupplierColumns(handleEdit, handleViewDetail, setSupplierToDeactivate, {
    canEdit,
    canDelete,
    canViewDetail,
  });

  // ── Exportar (Excel/PDF) ──────────────────────────────────────────────────
  // Exportan lo que el usuario está VIENDO: las filas se LEEN de la tabla al
  // hacer clic (`getFilteredRows`: filtradas y ordenadas de todas las
  // páginas) y las columnas llegan por `onVisibleColumnsChange`. Mismo patrón
  // que `PurchaseOrderView`.
  const tableRef = useRef<DataTableHandle<Supplier>>(null);
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<Supplier>[]>([]);
  useSupplierCsvExport(tableRef, visibleColumns);
  useSupplierPdfExport(tableRef, visibleColumns);

  return (
    <>
      <div className={fillHeight ? "h-full flex flex-col min-h-0" : undefined}>
      <DataTable
        ref={tableRef}
        columns={columns}
        data={suppliers}
        searchPlaceholder="Buscar proveedor..."
        fillHeight={fillHeight}
        onVisibleColumnsChange={setVisibleColumns}
        actionButton={
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="success"
              size="icon"
              onClick={() => document.dispatchEvent(new CustomEvent("suppliers:exportCSV"))}
              title="Exportar a Excel (CSV)"
              aria-label="Exportar proveedores a Excel"
            >
              <ExportCsvIcon className="w-4 h-4 shrink-0" />
            </Button>
            <Button
              variant="danger"
              size="icon"
              onClick={() => document.dispatchEvent(new CustomEvent("suppliers:exportPDF"))}
              title="Exportar a PDF"
              aria-label="Exportar proveedores a PDF"
            >
              <ExportPdfIcon className="w-4 h-4 shrink-0" />
            </Button>
            {/* El alta se rige por C-COMPRAS-PROV, no por el permiso de edición:
                son dos capacidades distintas del catálogo. */}
            {canCreate && (
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="w-4 h-4" />}
                onClick={handleCreate}
              >
                Nuevo Proveedor
              </Button>
            )}
          </div>
        }
        isLoading={isLoading}
        isError={isError}
        errorTitle="Error al cargar proveedores"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando proveedores"
      />
      </div>

      {canDelete && (
        <ConfirmDialog
          open={supplierToDeactivate !== null}
          onOpenChange={(open) => {
            if (!open) setSupplierToDeactivate(null);
          }}
          title="Desactivar proveedor"
          description={`¿Deseas desactivar al proveedor "${supplierToDeactivate?.nombre ?? ""}"? Dejará de aparecer en los listados.`}
          confirmText={isDeactivating ? "Desactivando..." : "Desactivar"}
          confirmColor="red"
          onConfirm={() => {
            if (supplierToDeactivate) deactivateSupplier(supplierToDeactivate.id);
            setSupplierToDeactivate(null);
          }}
        />
      )}

      <SupplierFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        supplierToEdit={supplierToEdit}
        onSuccess={handleSuccess}
      />
    </>
  );
}
