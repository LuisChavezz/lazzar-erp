import { ArrowLeftIcon } from "@/src/components/Icons";
import WarehouseList from "@/src/features/warehouses/components/WarehouseList";
import LocationList from "@/src/features/locations/components/LocationList";
import { SatInfo } from "@/src/features/sat/components/SatInfo";
import CompanyList from "@/src/features/companies/components/CompanyList";
import BranchList from "@/src/features/branches/components/BranchList";
import CurrencyList from "@/src/features/currency/components/CurrencyList";
import RoleList from "@/src/features/roles/components/RoleList";
import UserList from "@/src/features/users/components/UserList";

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
    </div>
  );
}