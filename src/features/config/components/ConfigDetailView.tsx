import { ArrowLeftIcon } from "@/src/components/Icons";
import dynamic from "next/dynamic";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";

const WarehouseList = dynamic(() => import("@/src/features/warehouses/components/WarehouseList"), {
  loading: () => <LoadingSkeleton />,
});
const LocationList = dynamic(() => import("@/src/features/locations/components/LocationList"), {
  loading: () => <LoadingSkeleton />,
});
const SatInfo = dynamic(() => import("@/src/features/sat/components/SatInfo").then(mod => mod.SatInfo), {
  loading: () => <LoadingSkeleton />,
});
const CompanyList = dynamic(() => import("@/src/features/companies/components/CompanyList"), {
  loading: () => <LoadingSkeleton />,
});
const BranchList = dynamic(() => import("@/src/features/branches/components/BranchList"), {
  loading: () => <LoadingSkeleton />,
});
const CurrencyList = dynamic(() => import("@/src/features/currency/components/CurrencyList"), {
  loading: () => <LoadingSkeleton />,
});
const RoleList = dynamic(() => import("@/src/features/roles/components/RoleList"), {
  loading: () => <LoadingSkeleton />,
});
const UserList = dynamic(() => import("@/src/features/users/components/UserList"), {
  loading: () => <LoadingSkeleton />,
});
const ProductCategoryList = dynamic(() => import("@/src/features/product-categories/components/ProductCategoryList"), {
    loading: () => <LoadingSkeleton />,
});
const ProductTypeList = dynamic(() => import("@/src/features/product-types/components/ProductTypeList"), {
    loading: () => <LoadingSkeleton />,
});
const ColorList = dynamic(() => import("@/src/features/colors/components/ColorList"), {
    loading: () => <LoadingSkeleton />,
});
const SizeList = dynamic(() => import("@/src/features/sizes/components/SizeList"), {
    loading: () => <LoadingSkeleton />,
});
const UnitOfMeasureList = dynamic(() => import("@/src/features/units-of-measure/components/UnitOfMeasureList"), {
    loading: () => <LoadingSkeleton />,
});
const TaxList = dynamic(() => import("@/src/features/taxes/components/TaxList"), {
    loading: () => <LoadingSkeleton />,
});
const SatProdservCodeList = dynamic(() => import("@/src/features/sat-prodserv-codes/components/SatProdservCodeList"), {
    loading: () => <LoadingSkeleton />,
});
const SatUnitCodeList = dynamic(() => import("@/src/features/sat-unit-codes/components/SatUnitCodeList"), {
    loading: () => <LoadingSkeleton />,
});


interface ConfigDetailViewProps {
  selectedView: string | null;
  onBack: () => void;
}

export function ConfigDetailView({ selectedView, onBack }: ConfigDetailViewProps) {
  const renderBackButton = () => (
    <div className="sticky top-0 z-10 py-2 w-fit">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Volver a configuración</span>
      </button>
    </div>
  );

  return (
    <div 
      className={`
        col-start-1 row-start-1 w-full transition-all duration-500 ease-in-out
        ${!selectedView 
          ? "opacity-0 translate-y-20 pointer-events-none scale-95" 
          : "opacity-100 translate-y-0 scale-100 delay-150"
        }
      `}
    >
      {selectedView === "warehouses" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <WarehouseList />
        </div>
      )}

      {selectedView === "locations" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <LocationList />
        </div>
      )}

      {selectedView === "sat" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <SatInfo />
        </div>
      )}

      {selectedView === "companies" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <CompanyList />
        </div>
      )}

      {selectedView === "branches" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <BranchList />
        </div>
      )}

      {selectedView === "users" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <UserList />
        </div>
      )}

      {selectedView === "roles" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <RoleList />
        </div>
      )}

      {selectedView === "currencies" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <CurrencyList />
        </div>
      )}

      {selectedView === "product-categories" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <ProductCategoryList />
        </div>
      )}

      {selectedView === "product-types" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <ProductTypeList />
        </div>
      )}

      {selectedView === "colors" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <ColorList />
        </div>
      )}
      
      {selectedView === "sizes" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <SizeList />
        </div>
      )}
      
      {selectedView === "units" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <UnitOfMeasureList />
        </div>
      )}

      {selectedView === "taxes" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <TaxList />
        </div>
      )}

      {selectedView === "sat-prod-serv" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <SatProdservCodeList />
        </div>
      )}

      {selectedView === "sat-unit-codes" && (
        <div className="flex flex-col gap-6">
          {renderBackButton()}
          <SatUnitCodeList />
        </div>
      )}
    </div>
  );
}
