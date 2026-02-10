"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCompanies } from "@/src/features/companies/services/actions";
import { getBranches } from "@/src/features/branches/services/actions";
import { getCurrencies } from "@/src/features/currency/services/actions";
import { getRoles } from "@/src/features/roles/services/actions";
import { getUsers } from "@/src/features/users/services/actions";
import { 
  BuildingIcon, 
  MapPinIcon, 
  InfoIcon, 
  BancosIcon,
  CapitalHumanoIcon,
  LockIcon,
  ListaPreciosIcon,
  InventariosIcon
} from "@/src/components/Icons";
import { ConfigCard } from "./ConfigCard";
import { ConfigDetailView } from "./ConfigDetailView";

export function ConfigContent() {
  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [isGridVisible, setIsGridVisible] = useState(true);

  const handleCardClick = (view: string) => {
    setSelectedView(view);
    // Esperar a que termine la animación de salida (500ms) antes de ocultar el grid
    setTimeout(() => setIsGridVisible(false), 500);
  };

  const handleBack = () => {
    setIsGridVisible(true);
    // Pequeño retraso para permitir que el grid sea visible antes de iniciar la animación de entrada
    requestAnimationFrame(() => {
      setSelectedView(null);
    });
  };

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
            ${!isGridVisible ? "hidden" : ""}
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
              onMouseEnter={() => {
                queryClient.prefetchQuery({
                  queryKey: ["users"],
                  queryFn: getUsers,
                });
              }}
            />
            <ConfigCard 
              title="Roles" 
              description="Configuración de roles y permisos"
              icon={LockIcon}
              onClick={() => handleCardClick("roles")}
              onMouseEnter={() => {
                queryClient.prefetchQuery({
                  queryKey: ["roles"],
                  queryFn: getRoles,
                });
              }}
            />
            <ConfigCard 
              title="Monedas" 
              description="Catálogo de monedas y tipos de cambio"
              icon={ListaPreciosIcon}
              onClick={() => handleCardClick("currencies")}
              onMouseEnter={() => {
                queryClient.prefetchQuery({
                  queryKey: ["currencies"],
                  queryFn: getCurrencies,
                });
              }}
            />
            <ConfigCard 
              title="Información Fiscal" 
              icon={InfoIcon} 
              onClick={() => handleCardClick("sat")}
            />
          </div>
        </div>

        {/* Detail View */}
        <ConfigDetailView selectedView={selectedView} onBack={handleBack} />
      </div>
    </>
  );
}
