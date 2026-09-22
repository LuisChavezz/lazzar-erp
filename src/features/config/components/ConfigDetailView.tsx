import { ArrowLeftIcon } from "@/src/components/Icons";
import dynamic from "next/dynamic";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";

function ConfigDetailLoadingSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 min-h-128"
      role="status"
      aria-live="polite"
      aria-label="Cargando detalle de configuración"
    >
      <div className="w-52">
        <LoadingSkeleton className="h-10 rounded-full" />
      </div>
      <LoadingSkeleton className="h-24 rounded-2xl" />
      <LoadingSkeleton className="h-104 rounded-3xl" />
    </div>
  );
}

const configDetailLoading = () => <ConfigDetailLoadingSkeleton />;

const WarehouseList = dynamic(() => import("@/src/features/warehouses/components/WarehouseList"), {
  loading: configDetailLoading,
});
const LocationList = dynamic(() => import("@/src/features/locations/components/LocationList"), {
  loading: configDetailLoading,
});
const StockMovementsView = dynamic(
  () =>
    import("@/src/features/stock-movements/components/StockMovementsView").then(
      (mod) => mod.StockMovementsView,
    ),
  {
    loading: configDetailLoading,
  },
);
const StockTransfersView = dynamic(
  () =>
    import("@/src/features/stock-transfers/components/StockTransfersView").then(
      (mod) => mod.StockTransfersView,
    ),
  {
    loading: configDetailLoading,
  },
);
const SatInfo = dynamic(() => import("@/src/features/sat/components/SatInfo").then(mod => mod.SatInfo), {
  loading: configDetailLoading,
});
const CurrencyList = dynamic(() => import("@/src/features/currency/components/CurrencyList"), {
  loading: configDetailLoading,
});
const SerieFolioList = dynamic(() => import("@/src/features/series-folios/components/SerieFolioList"), {
  loading: configDetailLoading,
});
const RoleList = dynamic(() => import("@/src/features/roles/components/RoleList"), {
  loading: configDetailLoading,
});
const UserList = dynamic(() => import("@/src/features/users/components/UserList"), {
  loading: configDetailLoading,
});
const ProductCategoryList = dynamic(() => import("@/src/features/product-categories/components/ProductCategoryList"), {
    loading: configDetailLoading,
});
const ProductTypeList = dynamic(() => import("@/src/features/product-types/components/ProductTypeList"), {
    loading: configDetailLoading,
});
const ColorList = dynamic(() => import("@/src/features/colors/components/ColorList"), {
    loading: configDetailLoading,
});
const SizeList = dynamic(() => import("@/src/features/sizes/components/SizeList"), {
    loading: configDetailLoading,
});
const UnitOfMeasureList = dynamic(() => import("@/src/features/units-of-measure/components/UnitOfMeasureList"), {
    loading: configDetailLoading,
});
const TaxList = dynamic(() => import("@/src/features/taxes/components/TaxList"), {
    loading: configDetailLoading,
});
const SatProdservCodeList = dynamic(() => import("@/src/features/sat-prodserv-codes/components/SatProdservCodeList"), {
    loading: configDetailLoading,
});
const SatUnitCodeList = dynamic(() => import("@/src/features/sat-unit-codes/components/SatUnitCodeList"), {
    loading: configDetailLoading,
});
const ProductList = dynamic(() => import("@/src/features/products/components/ProductList"), {
    loading: configDetailLoading,
});
const ProductVariantList = dynamic(() => import("@/src/features/product-variants/components/ProductVariantList"), {
    loading: configDetailLoading,
});
const SupplierList = dynamic(() => import("@/src/features/suppliers/components/SupplierList"), {
    loading: configDetailLoading,
});
const BomList = dynamic(() => import("@/src/features/bom/components/BomList"), {
    loading: configDetailLoading,
});


interface ConfigDetailViewProps {
  selectedView: string | null;
  onBack: () => void;
}

export function ConfigDetailView({ selectedView, onBack }: ConfigDetailViewProps) {
  // Encabezado de cada catálogo: botón "Volver" + título. El título vivía
  // dentro de `DataTable` (prop `title`, ya retirada): la tabla no pinta
  // encabezados y `/config` solo tiene "Configuración" en el `Header` global,
  // así que aquí es donde el usuario lee qué catálogo está viendo.
  const renderHeader = (title: string) => (
    <>
      <div className="sticky top-0 z-10 py-2 w-fit">
        <button
          onClick={onBack}
          className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Volver a configuración</span>
        </button>
      </div>
      <h1 className="text-xl font-semibold text-slate-800 dark:text-white">{title}</h1>
    </>
  );

  return (
    <div 
      className={`
        col-start-1 row-start-1 w-full min-h-128 transition-all duration-500 ease-in-out
        ${!selectedView 
          ? "opacity-0 translate-y-20 pointer-events-none scale-95" 
          : "opacity-100 translate-y-0 scale-100 delay-150"
        }
      `}
    >
      {selectedView === "warehouses" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Almacenes")}
          <WarehouseList />
        </div>
      )}

      {selectedView === "locations" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Ubicaciones")}
          <LocationList />
        </div>
      )}

      {selectedView === "stock-movements" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Movimientos de Inventario")}
          <StockMovementsView />
        </div>
      )}

      {selectedView === "stock-transfers" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Traspasos")}
          <StockTransfersView />
        </div>
      )}

      {selectedView === "sat" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Regímenes Fiscales")}
          <SatInfo />
        </div>
      )}

      {selectedView === "users" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Usuarios")}
          <UserList />
        </div>
      )}

      {selectedView === "roles" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Roles")}
          <RoleList />
        </div>
      )}

      {selectedView === "currencies" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Monedas")}
          <CurrencyList />
        </div>
      )}

      {selectedView === "series-folios" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Series y Folios")}
          <SerieFolioList />
        </div>
      )}

      {selectedView === "product-categories" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Categorías de Producto")}
          <ProductCategoryList />
        </div>
      )}

      {selectedView === "product-types" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Tipos de Producto")}
          <ProductTypeList />
        </div>
      )}

      {selectedView === "colors" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Colores")}
          <ColorList />
        </div>
      )}
      
      {selectedView === "sizes" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Tallas")}
          <SizeList />
        </div>
      )}
      
      {selectedView === "units" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Unidades de Medida")}
          <UnitOfMeasureList />
        </div>
      )}

      {selectedView === "taxes" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Impuestos")}
          <TaxList />
        </div>
      )}

      {selectedView === "sat-prod-serv" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Claves SAT Prod/Serv")}
          <SatProdservCodeList />
        </div>
      )}

      {selectedView === "sat-unit-codes" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Claves SAT Unidades")}
          <SatUnitCodeList />
        </div>
      )}

      {selectedView === "products" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Productos")}
          <ProductList />
        </div>
      )}

      {selectedView === "product-variants" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Variantes de Producto")}
          <ProductVariantList />
        </div>
      )}

      {selectedView === "bom" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Materiales")}
          <BomList />
        </div>
      )}

      {selectedView === "suppliers" && (
        <div className="flex flex-col gap-6">
          {renderHeader("Proveedores")}
          {/* Montado desde /config: aquí el alta/edición/baja se rige por los
              códigos de CONFIGURACION, no por los de Compras (ver
              `PERMISSIONS_BY_CONTEXT` en `SupplierList`). */}
          <SupplierList permissionContext="config" />
        </div>
      )}
    </div>
  );
}
