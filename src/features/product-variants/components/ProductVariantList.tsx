import { canCreateProducts } from "@/src/utils/productionPermissions";
import { useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { Button } from "../../../components/Button";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { getColumns, type ProductVariantRowActions } from "./ProductVariantColumns";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import ProductVariantForm from "./ProductVariantForm";
import BomList from "./BomList";
import { CreateBomDialog } from "@/src/features/bom/components/CreateBomDialog";
import { ProductVariant } from "../interfaces/product-variant.interface";
import { useProductVariantsTable } from "../hooks/useProductVariantsTable";
import { useDeleteProductVariant } from "../hooks/useDeleteProductVariant";
import {
  productVariantsTable,
  withUrlPrefix,
} from "@/src/features/products/utils/catalogListParams";

/**
 * En Configuración varias tablas en modo servidor comparten `/config` (la
 * vista elegida no va en la URL): el prefijo evita que esta herede la
 * búsqueda o la página que dejó otra. A nivel de módulo: referencia estable.
 */
const CONFIG_VARIANTS_TABLE = withUrlPrefix(productVariantsTable, "var_");

/** Diálogo de lista de materiales abierto desde una fila. */
type BomDialog = "list" | "edit" | "create";

/**
 * Variantes en Configuración (`/config`, vista "product-variants"): alta,
 * edición, baja y las listas de materiales de cada variante.
 *
 * MODO SERVIDOR (EC-897): paginación, búsqueda (`q`) y orden los resuelve
 * `GET /catalogo/producto-variante/` y su estado vive en la URL con el prefijo
 * `var_` (`useProductVariantsTable`), así que `ConfigDetailView` la envuelve en
 * `<Suspense>`. Esta vista no tenía filtros de encabezado y sigue sin ellos.
 *
 * Todos los diálogos viven AQUÍ y no en la celda: un cambio de página, un
 * refetch (las mutaciones de BOM invalidan `["product-variants"]`) o una baja
 * desmontan las celdas, y un diálogo dentro se cerraría con ellas. La celda
 * solo avisa qué variante y qué acción (`ProductVariantRowActions`).
 */
export default function ProductVariantList() {
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canCreate = canCreateProducts(session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductVariant, setSelectedProductVariant] =
    useState<ProductVariant | null>(null);
  // Producto, color y talla se pintan con los nombres que trae cada fila
  // (EC-888): sin pedir catálogos solo para traducir ids. El formulario carga
  // los suyos al abrir el diálogo.
  const table = useProductVariantsTable({
    definition: CONFIG_VARIANTS_TABLE,
    toastId: "config-variants-table-refetch-error",
  });

  // ── Lista de materiales ───────────────────────────────────────────────────
  // `bomVariant` NO se limpia al cerrar: el diálogo sigue en pantalla durante
  // su animación de salida y su subtítulo (el SKU) no debe vaciarse.
  const [bomVariant, setBomVariant] = useState<ProductVariant | null>(null);
  const [bomDialog, setBomDialog] = useState<BomDialog | null>(null);
  const openBomDialog = (variant: ProductVariant, dialog: BomDialog) => {
    setBomVariant(variant);
    setBomDialog(dialog);
  };
  const bomDialogOpenChange = (dialog: BomDialog) => (open: boolean) => {
    if (!open) setBomDialog((current) => (current === dialog ? null : current));
  };

  // ── Baja ──────────────────────────────────────────────────────────────────
  const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(null);
  const { mutate: deleteProductVariant } = useDeleteProductVariant();

  const handleEdit = (variant: ProductVariant) => {
    setSelectedProductVariant(variant);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProductVariant(null);
    setIsDialogOpen(true);
  };

  const rowActions: ProductVariantRowActions = {
    onEdit: handleEdit,
    onOpenBom: (variant) => openBomDialog(variant, "list"),
    onEditBom: (variant) => openBomDialog(variant, "edit"),
    onDelete: setVariantToDelete,
  };

  const columns = getColumns(rowActions, { canEdit, canDelete });
  const isEditing = Boolean(selectedProductVariant?.id);

  return (
    <>
      <DataTable
        columns={columns}
        {...table.tableProps}
        // Identidad de la fila por registro, no por posición en la página.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar por SKU, nombre o producto..."
        errorTitle="Error al cargar variantes"
        loadingAriaLabel="Cargando variantes"
        actionButton={
          // El diálogo es DUAL (alta y edición: lo abre `handleEdit` por `open`,
          // sin pasar por el trigger), así que se monta también con solo permiso
          // de edición; lo que se oculta sin `canCreate` es el botón de alta.
          canCreate || canEdit ? (
            <MainDialog
              title={
                <DialogHeader
                  title={isEditing ? "Editar Variante" : "Alta de Variante"}
                  subtitle={isEditing ? "Edición de registro" : "Registro Nuevo"}
                  statusColor="emerald"
                />
              }
              open={isDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedProductVariant(null);
                }
                setIsDialogOpen(open);
              }}
              maxWidth="1000px"
              trigger={
                canCreate ? (
                  <Button
                    variant="primary"
                    rounded="full"
                    onClick={handleCreate}
                    className="hover:scale-105 active:scale-95"
                  >
                    + Nueva Variante
                  </Button>
                ) : undefined
              }
            >
              <ProductVariantForm
                onSuccess={() => setIsDialogOpen(false)}
                productVariantToEdit={selectedProductVariant}
              />
            </MainDialog>
          ) : null
        }
      />

      {bomVariant ? (
        <>
          <MainDialog
            open={bomDialog === "list"}
            onOpenChange={bomDialogOpenChange("list")}
            maxWidth="760px"
            title={
              <DialogHeader
                title="Lista de Materiales"
                subtitle={bomVariant.sku}
                statusColor="indigo"
              />
            }
          >
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={() => setBomDialog("create")}
                >
                  Agregar materiales
                </Button>
              </div>
              <BomList productoVarianteId={bomVariant.id} />
            </div>
          </MainDialog>
          <MainDialog
            open={bomDialog === "edit"}
            onOpenChange={bomDialogOpenChange("edit")}
            maxWidth="760px"
            title={
              <DialogHeader
                title="Editar Lista de Materiales"
                subtitle={bomVariant.sku}
                statusColor="amber"
              />
            }
          >
            <BomList
              productoVarianteId={bomVariant.id}
              mode="edit"
              onClose={() => setBomDialog(null)}
            />
          </MainDialog>
          {/* Tras crear la lista, cierra el asistente y reabre el diálogo de la
              lista (que se refresca solo: `useCreateListaMaterial` invalida
              ["bom"] y ["product-variants"]). */}
          <CreateBomDialog
            open={bomDialog === "create"}
            onOpenChange={bomDialogOpenChange("create")}
            productoVarianteId={bomVariant.id}
            onSuccess={() => setBomDialog("list")}
          />
        </>
      ) : null}

      {canDelete && (
        <ConfirmDialog
          open={variantToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setVariantToDelete(null);
          }}
          title="Eliminar Variante"
          description="¿Estás seguro de que deseas eliminar esta variante? Esta acción no se puede deshacer."
          onConfirm={() => {
            if (variantToDelete) deleteProductVariant(variantToDelete.id);
            setVariantToDelete(null);
          }}
          confirmColor="red"
        />
      )}
    </>
  );
}
