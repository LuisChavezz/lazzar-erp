import { useCallback, useMemo, useState } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "../../../components/DialogHeader";
import { Product } from "../interfaces/product.interface";
import { getColumns, ProductRow } from "./ProductColumns";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import ProductForm from "./ProductForm";
import ProductOnboardingDialog from "../../product-onboarding/components/ProductOnboardingDialog";
import { useProductCategories } from "../../product-categories/hooks/useProductCategories";
import { useUnitsOfMeasure } from "../../units-of-measure/hooks/useUnitsOfMeasure";
import { useTaxes } from "../../taxes/hooks/useTaxes";
import { useSatUnitCodes } from "../../sat-unit-codes/hooks/useSatUnitCodes";
import { useSatProdServCodes } from "../../sat-prodserv-codes/hooks/useSatProdServCodes";
import { useProducts } from "../hooks/useProducts";

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
  const { products, isLoading, isInitialError, error } = useProducts(3);

  const { categories } = useProductCategories();
  const { units } = useUnitsOfMeasure();
  const { taxes } = useTaxes();
  const { satProdservCodes } = useSatProdServCodes();
  const { satUnitCodes } = useSatUnitCodes();

  const handleEdit = useCallback(
    (product: Product) => {
      setSelectedProduct(product);
      setIsDialogOpen(true);
    },
    [setSelectedProduct]
  );

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
    }),
    [categories, units, taxes, satProdservCodes, satUnitCodes]
  );

  // El nombre de la categoría se incorpora a la FILA, no al accessor: así la
  // llegada tardía de su catálogo produce un `data` nuevo y TanStack recalcula
  // búsqueda y orden aunque ya se hubieran calculado. Ver `ProductRow`.
  const rows = useMemo<ProductRow[]>(
    () =>
      products.map((product) => ({
        ...product,
        categoria_nombre: lookups.categories.get(product.categoria_producto) ?? null,
      })),
    [products, lookups]
  );

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit, canDelete }),
    [handleEdit, canEdit, canDelete]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Buscar producto..."
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar productos"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
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
    </>
  );
};
