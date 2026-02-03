"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, BuildingIcon, MapPinIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";

// Mock data structure
interface Branch {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  branches: Branch[];
}

const MOCK_COMPANIES: Company[] = [
  {
    id: "company1",
    name: "Tech Solutions S.A.",
    branches: [
      { id: "br1_c1", name: "Matriz - Ciudad de México" },
      { id: "br2_c1", name: "Sucursal Norte - Monterrey" },
      { id: "br3_c1", name: "Sucursal Suroeste - Guadalajara" }
    ],
  },
  {
    id: "company2",
    name: "Distribuidora del Sur",
    branches: [
      { id: "br1_c2", name: "Almacén Central - Mérida" },
      { id: "br2_c2", name: "Punto de Venta - Cancún" },
    ],
  },
  {
    id: "company3",
    name: "Consultoría Global",
    branches: [
      { id: "br1_c3", name: "Oficina Virtual" },
    ],
  }
];

export default function WorkspaceSelector2() {
  const router = useRouter();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Derive available branches based on selected company
  const availableBranches = useMemo(() => {
    const company = MOCK_COMPANIES.find((c) => c.id === selectedCompanyId);
    return company ? company.branches : [];
  }, [selectedCompanyId]);

  // Handle company selection
  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  // Handle branch selection
  const handleBranchSelect = (branchId: string) => {
    setIsLoading(true);
    const companyName = MOCK_COMPANIES.find(c => c.id === selectedCompanyId)?.name;
    const branchName = availableBranches.find(b => b.id === branchId)?.name;
    
    console.log("Seleccionado:", { 
      company: { id: selectedCompanyId, name: companyName }, 
      branch: { id: branchId, name: branchName } 
    });
    
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  };

  const handleBack = () => {
    setSelectedCompanyId("");
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 flex flex-col items-center">
      {/* Header Dinámico */}
      <div className={`transition-all duration-500 ease-in-out text-center mb-12 ${selectedCompanyId ? "transform -translate-y-4" : ""}`}>
        <h2 className="text-4xl md:text-5xl text-slate-900 dark:text-white font-medium brand-font mb-4">
          {selectedCompanyId ? "Selecciona una Sucursal" : "Bienvenido de nuevo"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          {selectedCompanyId 
            ? "Elige la ubicación donde trabajarás hoy" 
            : "Selecciona la empresa para comenzar"}
        </p>
      </div>

      <div className="w-full grid grid-cols-1">
        {/* Grid de Empresas */}
        <div 
          className={`
            col-start-1 row-start-1 w-full transition-all duration-500 ease-in-out
            ${selectedCompanyId 
              ? "opacity-0 -translate-y-20 pointer-events-none scale-95" 
              : "opacity-100 translate-y-0 scale-100"
            }
          `}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_COMPANIES.map((company) => (
              <button
                key={company.id}
                onClick={() => handleCompanySelect(company.id)}
                className="group relative cursor-pointer bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-left hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 flex flex-col gap-6 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-500/10 transition-colors"></div>
                
                <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform duration-300">
                  <BuildingIcon className="w-7 h-7" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-brand-500 transition-colors">
                    {company.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {company.branches.length} {company.branches.length === 1 ? 'sucursal' : 'sucursales'} disponibles
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Sucursales */}
        <div 
          className={`
            col-start-1 row-start-1 w-full transition-all duration-500 ease-in-out
            ${!selectedCompanyId 
              ? "opacity-0 translate-y-20 pointer-events-none scale-95" 
              : "opacity-100 translate-y-0 scale-100 delay-150"
            }
          `}
        >
          {selectedCompanyId && (
            <div className="flex flex-col gap-8">
              <button 
                onClick={handleBack}
                disabled={isLoading}
                className={`self-start flex items-center gap-2 cursor-pointer text-slate-500 hover:text-brand-500 transition-colors px-4 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 ${isLoading ? "invisible" : ""}`}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Volver a empresas</span>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12">
                    <Loader className="mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 animate-pulse">
                      Preparando tu espacio de trabajo...
                    </p>
                  </div>
                ) : (
                  availableBranches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => handleBranchSelect(branch.id)}
                      className="group cursor-pointer bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 rounded-2xl p-6 text-left hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/10 transition-all duration-300 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 transition-colors">
                        <MapPinIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">
                          {branch.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Seleccionar ubicación
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
