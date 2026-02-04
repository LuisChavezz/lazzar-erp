"use client";

import { useState } from "react";
import { BuildingIcon, MapPinIcon, InfoIcon, ArrowLeftIcon } from "@/src/components/Icons";
import { ConfigCard } from "./ConfigCard";
import WarehouseList from "@/src/features/warehouses/components/WarehouseList";
import { useWarehouseStore } from "../../warehouses/stores/warehouse.store";

export function ConfigContent() {

  // Obtener la cantidad de almacenes del store
  const warehousesCount = useWarehouseStore((state) => state.warehouses.length);

  const [selectedView, setSelectedView] = useState<string | null>(null);

  const handleCardClick = (view: string) => {
    if (view === "warehouses") {
      setSelectedView("warehouses");
    }
  };

  const handleBack = () => {
    setSelectedView(null);
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
          `}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ConfigCard 
              title="Almacenes" 
              count={warehousesCount} 
              icon={BuildingIcon}
              onClick={() => handleCardClick("warehouses")}
            />
            <ConfigCard 
              title="Ubicaciones" 
              count={12} 
              icon={MapPinIcon} 
            />
            <ConfigCard 
              title="Información Fiscal" 
              icon={InfoIcon} 
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
              <button 
                onClick={handleBack}
                className="self-start flex items-center gap-2 cursor-pointer text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Volver a configuración</span>
              </button>
              
              <WarehouseList />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
