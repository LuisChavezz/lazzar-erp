import { useCallback, useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { Product } from "../interfaces/product.interface";
import { getColumns } from "./ProductColumns";
import { useSession } from "next-auth/react";
import ProductForm from "./ProductForm";
import { useProductCategories } from "../../product-categories/hooks/useProductCategories";
import { useUnitsOfMeasure } from "../../units-of-measure/hooks/useUnitsOfMeasure";
import { useTaxes } from "../../taxes/hooks/useTaxes";
import { useSatUnitCodes } from "../../sat-unit-codes/hooks/useSatUnitCodes";
import { useProductTypes } from "../../product-types/hooks/useProductTypes";
import { useSatProdServCodes } from "../../sat-prodserv-codes/hooks/useSatProdServCodes";
import { useProducts } from "../hooks/useProducts";
import { ErrorState } from "../../../components/ErrorState";

export default function ProductList() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { products, isLoading, isError, error } = useProducts();

  const { categories } = useProductCategories();
  const { units } = useUnitsOfMeasure();
  const { taxes } = useTaxes();
  const { satProdservCodes } = useSatProdServCodes();
  const { satUnitCodes } = useSatUnitCodes();
  const { productTypes } = useProductTypes();

  const handleEdit = useCallback(
    (product: Product) => {
      setSelectedProduct(product);
      setIsDialogOpen(true);
    },
    [setSelectedProduct]
  );

  const handleCreate = useCallback(() => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  }, [setSelectedProduct]);

  const lookups = useMemo(
    () => ({
      categories: new Map(categories.map((category) => [category.id, category.nombre])),
      units: new Map(units.map((unit) => [unit.id, unit.nombre])),
      taxes: new Map(taxes.map((tax) => [tax.id, tax.nombre])),
      satProdserv: new Map(
        satProdservCodes.map((code) => [code.id_sat_prodserv, `${code.codigo} - ${code.descripcion}`])
      ),
      satUnit: new Map(
        satUnitCodes.map((code) => [code.id_sat_unidad, `${code.codigo} - ${code.descripcion}`])
      ),
      productTypes: new Map(productTypes.map((type) => [type.codigo, type.codigo])),
    }),
    [categories, units, taxes, satProdservCodes, satUnitCodes, productTypes]
  );

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }, lookups),
    [handleEdit, canEditConfig, canDeleteConfig, lookups]
  );

  const isEditing = Boolean(selectedProduct?.id);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando productos...</span>
      </div>
    );
  }

  if (isError) {
    return <ErrorState title="Error al cargar productos" message={(error as Error).message} />;
  }

  return (
    <DataTable
      columns={columns}
      data={products}
      title="Productos"
      searchPlaceholder="Buscar producto..."
      actionButton={
        canEditConfig ? (
          <MainDialog
            title={
              <DialogHeader
                title={isEditing ? "Editar Producto" : "Alta de Producto"}
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
                + Nuevo Producto
              </button>
            }
          >
            <ProductForm
              onSuccess={() => setIsDialogOpen(false)}
              productToEdit={selectedProduct}
            />
          </MainDialog>
        ) : null
      }
    />
  );
};
