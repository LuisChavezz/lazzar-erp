import { useCallback, useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { Product } from "../interfaces/product.interface";
import { useProductStore } from "../stores/product.store";
import { getColumns } from "./ProductColumns";
import { useSession } from "next-auth/react";
import ProductForm from "./ProductForm";
import { useProductCategoryStore } from "../../product-categories/stores/product-category.store";
import { useUnitOfMeasureStore } from "../../units-of-measure/stores/unit-of-measure.store";
import { useTaxStore } from "../../taxes/stores/tax.store";
import { useSatProdservCodeStore } from "../../sat-prodserv-codes/stores/sat-prodserv-code.store";
import { useSatUnitCodeStore } from "../../sat-unit-codes/stores/sat-unit-code.store";
import { useProductTypeStore } from "../../product-types/stores/product-type.store";

export default function ProductList() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { products, selectedProduct, setSelectedProduct } = useProductStore((state) => state);

  const { categories } = useProductCategoryStore((state) => state);
  const { units } = useUnitOfMeasureStore((state) => state);
  const { taxes } = useTaxStore((state) => state);
  const { satProdservCodes } = useSatProdservCodeStore((state) => state);
  const { satUnitCodes } = useSatUnitCodeStore((state) => state);
  const { productTypes } = useProductTypeStore((state) => state);

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
      productTypes: new Map(
        productTypes.map((type) => [type.id, type.descripcion || type.codigo])
      ),
    }),
    [categories, units, taxes, satProdservCodes, satUnitCodes, productTypes]
  );

  const columns = useMemo(() => getColumns(handleEdit, isAdmin, lookups), [handleEdit, isAdmin, lookups]);

  const isEditing = Boolean(selectedProduct?.id);

  return (
    <DataTable
      columns={columns}
      data={products}
      title="Productos"
      searchPlaceholder="Buscar producto..."
      actionButton={
        isAdmin ? (
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
            <ProductForm onSuccess={() => setIsDialogOpen(false)} />
            {/* <ProductFormTest onSuccess={() => setIsDialogOpen(false)} /> */}
          </MainDialog>
        ) : null
      }
    />
  );
};
