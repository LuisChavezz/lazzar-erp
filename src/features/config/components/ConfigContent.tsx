"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCompanies } from "@/src/features/companies/services/actions";
import { getBranches } from "@/src/features/branches/services/actions";
import { 
  BuildingIcon, 
  MapPinIcon, 
  InfoIcon, 
  ArrowLeftIcon,
  BancosIcon,
  CapitalHumanoIcon,
  LockIcon,
  ListaPreciosIcon,
  InventariosIcon
} from "@/src/components/Icons";
import { ConfigCard } from "./ConfigCard";
import WarehouseList from "@/src/features/warehouses/components/WarehouseList";
import LocationList from "@/src/features/locations/components/LocationList";
import { SatInfo } from "@/src/features/sat/components/SatInfo";
import CompanyList from "@/src/features/companies/components/CompanyList";
import BranchList from "@/src/features/branches/components/BranchList";

export function ConfigContent() {
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState<string | null>(null);

  const handleCardClick = (view: string) => {
    setSelectedView(view);
  };

  const handleBack = () => {
    setSelectedView(null);
  };

  const renderBackButton = () => (
    <button 
      onClick={handleBack}
      className="self-start flex items-center gap-2 cursor-pointer text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
    >
      <ArrowLeftIcon className="w-4 h-4" />
      <span className="text-sm font-medium">Volver a configuración</span>
    </button>
  );

  return (
    <>
      <div className="w-full grid grid-cols-1">
        {/* Grid View */}
        <div 
          className={`
            col-start-1 row-start-1 w-full transition-all duration-500 ease-in-out
            ${selectedView 
              ? "opacity-0 -translate-y-20 pointer-events-none scale-95" 
              : "opacity-100 translate-y-0 scale-100"
            }
          `}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ConfigCard 
              title="Empresas" 
              description="Gestión de empresas del sistema"
              icon={BancosIcon}
              onClick={() => handleCardClick("companies")}
              onMouseEnter={() => {
                queryClient.prefetchQuery({
                  queryKey: ["companies"],
                  queryFn: getCompanies,
                });
              }}
            />
            <ConfigCard 
              title="Sucursales" 
              description="Gestión de sucursales operativas"
              icon={BuildingIcon}
              onClick={() => handleCardClick("branches")}
              onMouseEnter={() => {
                queryClient.prefetchQuery({
                  queryKey: ["branches"],
                  queryFn: getBranches,
                });
              }}
            />
            <ConfigCard 
              title="Almacenes" 
              description="Gestión de almacenes e inventarios" 
              icon={InventariosIcon}
              onClick={() => handleCardClick("warehouses")}
            />
            <ConfigCard 
              title="Ubicaciones" 
              description="Gestión de ubicaciones físicas" 
              icon={MapPinIcon}
              onClick={() => handleCardClick("locations")}
            />
            <ConfigCard 
              title="Usuarios" 
              description="Administración de usuarios y accesos"
              icon={CapitalHumanoIcon}
              onClick={() => handleCardClick("users")}
            />
            <ConfigCard 
              title="Roles" 
              description="Configuración de roles y permisos"
              icon={LockIcon}
              onClick={() => handleCardClick("roles")}
            />
            <ConfigCard 
              title="Monedas" 
              description="Catálogo de monedas y tipos de cambio"
              icon={ListaPreciosIcon}
              onClick={() => handleCardClick("currencies")}
            />
            <ConfigCard 
              title="Información Fiscal" 
              icon={InfoIcon} 
              onClick={() => handleCardClick("sat")}
            />
          </div>
        </div>

        {/* Detail View */}
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

          {/* New Views Placeholders */}
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
              <div className="p-6 bg-white dark:bg-zinc-900/50 rounded-3xl border border-slate-200 dark:border-white/10">
                <h2 className="text-xl font-semibold mb-4">Gestión de Usuarios</h2>
                <p className="text-slate-500">Próximamente: Contenido de usuarios.</p>
              </div>
            </div>
          )}

          {selectedView === "roles" && (
            <div className="flex flex-col gap-6">
              {renderBackButton()}
              <div className="p-6 bg-white dark:bg-zinc-900/50 rounded-3xl border border-slate-200 dark:border-white/10">
                <h2 className="text-xl font-semibold mb-4">Gestión de Roles</h2>
                <p className="text-slate-500">Próximamente: Contenido de roles.</p>
              </div>
            </div>
          )}

          {selectedView === "currencies" && (
            <div className="flex flex-col gap-6">
              {renderBackButton()}
              <div className="p-6 bg-white dark:bg-zinc-900/50 rounded-3xl border border-slate-200 dark:border-white/10">
                <h2 className="text-xl font-semibold mb-4">Gestión de Monedas</h2>
                <p className="text-slate-500">Próximamente: Contenido de monedas.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
