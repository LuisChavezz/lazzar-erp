import { BuildingIcon } from "@/src/components/Icons";
import { Company } from "@/src/features/companies/interfaces/company.interface";

interface CompanyGridProps {
  companies: Company[];
  selectedCompanyId: number | null;
  loading: boolean;
  onSelect: (id: number) => void;
}

export default function CompanyGrid({
  companies,
  selectedCompanyId,
  loading,
  onSelect,
}: CompanyGridProps) {
  return (
    <div
      className={`
        grid gap-6 transition-all duration-500 ease-in-out w-full
        ${
          selectedCompanyId
            ? "grid-cols-1 opacity-0 pointer-events-none absolute top-0 left-0"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 opacity-100 relative"
        }
      `}
    >
      {companies.map((company) => (
        <button
          key={company.id}
          onClick={() => onSelect(company.id)}
          className="group relative cursor-pointer bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-sky-500 dark:hover:border-sky-500 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300 text-left"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform duration-300">
              <BuildingIcon className="w-8 h-8" />
            </div>
            {company.sucursales && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {company.sucursales.length} Sucursales
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-sky-500 transition-colors">
            {company.razon_social}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {company.nombre_comercial}
          </p>
        </button>
      ))}

      {companies.length === 0 && !loading && (
        <div className="col-span-full text-center py-10 text-slate-500">
          No se encontraron empresas asociadas a tu cuenta.
        </div>
      )}
    </div>
  );
}
