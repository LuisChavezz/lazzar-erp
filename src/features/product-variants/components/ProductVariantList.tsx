import { useCallback, useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { useProductVariantStore } from "../stores/product-variant.store";
import { getColumns } from "./ProductVariantColumns";
import { useSession } from "next-auth/react";
import ProductVariantForm from "./ProductVariantForm";
import { ProductVariant } from "../interfaces/product-variant.interface";
import { useProductStore } from "../../products/stores/product.store";
import { useColorStore } from "../../colors/stores/color.store";
import { useSizeStore } from "../../sizes/stores/size.store";

export default function ProductVariantList() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { productVariants, selectedProductVariant, setSelectedProductVariant } =
    useProductVariantStore((state) => state);
  const { products } = useProductStore((state) => state);
  const { colors } = useColorStore((state) => state);
  const { sizes } = useSizeStore((state) => state);

  const handleEdit = useCallback(
    (variant: ProductVariant) => {
      setSelectedProductVariant(variant);
      setIsDialogOpen(true);
    },
    [setSelectedProductVariant]
  );

  const handleCreate = useCallback(() => {
    setSelectedProductVariant(null);
    setIsDialogOpen(true);
  }, [setSelectedProductVariant]);

  const lookups = useMemo(
    () => ({
      products: new Map(products.map((product) => [product.id, product.nombre])),
      colors: new Map(colors.map((color) => [color.id, color.nombre])),
      sizes: new Map(sizes.map((size) => [size.id, size.nombre])),
    }),
    [products, colors, sizes]
  );

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }, lookups),
    [handleEdit, canEditConfig, canDeleteConfig, lookups]
  );
  const isEditing = Boolean(selectedProductVariant?.id);

  return (
    <DataTable
      columns={columns}
      data={productVariants}
      title="Variantes de Producto"
      searchPlaceholder="Buscar variante..."
      actionButton={
        canEditConfig ? (
          <MainDialog
            title={
              <DialogHeader
                title={isEditing ? "Editar Variante" : "Alta de Variante"}
                subtitle={isEditing ? "Edición de registro" : "Registro Nuevo"}
                statusColor="emerald"
              />
            }
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            maxWidth="1000px"
            trigger={
              <button
                onClick={handleCreate}
                className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                + Nueva Variante
              </button>
            }
          >
            <ProductVariantForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
