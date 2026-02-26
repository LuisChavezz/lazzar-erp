"use client";

import { useState, useMemo } from "react";
import { useCompanies } from "../hooks/useCompanies";
import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
import { getCompanyColumns } from "./CompanyColumns";
import { MainDialog } from "@/src/components/MainDialog";
import CompanyForm from "./CompanyForm";
import { useSession } from "next-auth/react";

export default function CompanyList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: companies, isLoading, isError, error } = useCompanies();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canReadConfig = isAdmin || permissions.includes("R-CONF");
  const canEditConfig = isAdmin || permissions.includes("E-CONF");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONF");
  const columns = useMemo(
    () => getCompanyColumns({ canRead: canReadConfig, canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [canReadConfig, canEditConfig, canDeleteConfig]
  );

  const handleNew = () => {
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando empresas...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState title="Error al cargar empresas" message={(error as Error).message} />
    );
  }

  if (!companies) return null;

  return (
    <DataTable
      columns={columns}
      data={companies}
      title="Empresas"
      searchPlaceholder="Buscar empresa..."
      actionButton={
        canEditConfig ? (
          <MainDialog
            title={
              <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                    Alta de Empresa
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Registro Nuevo
                    </p>
                  </div>
                </div>
              </div>
            }
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            maxWidth="1000px"
            trigger={
              <button
                onClick={handleNew}
                className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                + Nueva Empresa
              </button>
            }
          >
            <CompanyForm onSuccess={() => setIsDialogOpen(false)} />
          </MainDialog>
        ) : null
      }
    />
  );
}
