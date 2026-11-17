import { useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { Product } from "../interfaces/product.interface";
import { getColumns, type ProductRowActions } from "./ProductColumns";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useDeleteProduct } from "../hooks/useDeleteProduct";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import ProductForm from "./ProductForm";
import ProductOnboardingDialog from "../../product-onboarding/components/ProductOnboardingDialog";
import { useUnitsOfMeasure } from "../../units-of-measure/hooks/useUnitsOfMeasure";
import { useTaxes } from "../../taxes/hooks/useTaxes";
import { useSatUnitCodes } from "../../sat-unit-codes/hooks/useSatUnitCodes";
import { useSatProdServCodes } from "../../sat-prodserv-codes/hooks/useSatProdServCodes";
import { useProductsTable } from "../hooks/useProductsTable";
import { productsTable, withUrlPrefix } from "../utils/catalogListParams";

/**
 * En Configuración varias tablas en modo servidor comparten `/config` (la
 * vista elegida no va en la URL): el prefijo evita que esta herede la
 * búsqueda o la página que dejó otra. A nivel de módulo: referencia estable.
 */
const CONFIG_PRODUCTS_TABLE = withUrlPrefix(productsTable, "prod_");

/**
 * Productos terminados (`tipo_id=3`) en Configuración (`/config`, vista
 * "products"): edición y baja; el alta va por el alta rápida.
 *
 * MODO SERVIDOR (EC-897): paginación, búsqueda (`q`), orden y el filtro de
 * Línea —el único que tenía— los resuelve `GET /catalogo/producto/` y su estado
 * vive en la URL con el prefijo `prod_` (`useProductsTable`), así que
 * `ConfigDetailView` la envuelve en `<Suspense>`.
 */
export default function ProductList() {
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const table = useProductsTable({
    tipoId: 3,
    definition: CONFIG_PRODUCTS_TABLE,
    toastId: "config-products-table-refetch-error",
  });

  // Sin uso aquí: precargan los catálogos que pide el formulario de edición
  // (`useProductForm`), como antes, cuando sus mapas vivían en `lookups`.
  useUnitsOfMeasure();
  useTaxes();
  useSatProdServCodes();
  useSatUnitCodes();

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  // ── Baja ──────────────────────────────────────────────────────────────────
  // El diálogo vive AQUÍ y no en la celda: un cambio de página o un refetch
  // desmontan las celdas y un diálogo dentro se cerraría con ellas. La baja es
  // lógica (`activo=false`): el producto sale del listado al refrescarse.
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { mutate: deleteProduct } = useDeleteProduct();

  const rowActions: ProductRowActions = { onEdit: handleEdit, onDelete: setProductToDelete };
  const columns = getColumns(rowActions, { canEdit, canDelete }, "linea");

  return (
    <>
      <DataTable
        columns={columns}
        {...table.tableProps}
        // Identidad de la fila por registro, no por posición en la página.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar por nombre, código o código Proscai..."
        errorTitle="Error al cargar productos"
        loadingAriaLabel="Cargando productos"
        // El alta va por el alta rápida (asigna el `codigo`); el formulario
        // completo solo edita.
        actionButton={canCreate ? <ProductOnboardingDialog /> : null}
      />
      {/* Edición: sin trigger propio, la abre `handleEdit` desde la fila. */}
      {canEdit ? (
        <MainDialog
          title={
            <DialogHeader
              title="Editar Producto"
              subtitle="Edición de registro"
              statusColor="emerald"
            />
          }
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          maxWidth="1000px"
        >
          {selectedProduct ? (
            <ProductForm
              onSuccess={() => setIsDialogOpen(false)}
              product={selectedProduct}
            />
          ) : null}
        </MainDialog>
      ) : null}
      {canDelete && (
        <ConfirmDialog
          open={productToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setProductToDelete(null);
          }}
          title="Eliminar Producto"
          description="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          onConfirm={() => {
            if (productToDelete) deleteProduct(productToDelete.id);
            setProductToDelete(null);
          }}
          confirmColor="red"
        />
      )}
    </>
  );
};
