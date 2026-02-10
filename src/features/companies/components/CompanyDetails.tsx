import { Company } from "../interfaces/company.interface";
import Image from "next/image";

interface CompanyDetailsProps {
  company: Company;
}

export const CompanyDetails = ({ company }: CompanyDetailsProps) => {
  return (
    <div className="space-y-6">
      {/* Header Section with Logo and Basic Info */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {company.logo_url && (
          <div className="relative w-32 h-32 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white">
            <Image
              src={company.logo_url}
              alt={`Logo de ${company.razon_social}`}
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 100vw, 128px"
            />
          </div>
        )}
        
        <div className="flex-1 space-y-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Razón Social
              </label>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {company.razon_social}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Nombre Comercial
              </label>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {company.nombre_comercial || "-"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                RFC
              </label>
              <p className="mt-1 text-sm font-mono text-slate-900 dark:text-white">
                {company.rfc}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Código
              </label>
              <p className="mt-1 text-sm font-mono text-slate-900 dark:text-white">
                {company.codigo}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-white/10" />

      {/* Contact & Config Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Información de Contacto
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Email</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">{company.email_contacto}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Teléfono</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">{company.telefono || "-"}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Sitio Web</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {company.sitio_web ? (
                  <a href={company.sitio_web} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {company.sitio_web}
                  </a>
                ) : (
                  "-"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Configuración Regional
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Moneda Base</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">{company.moneda_base}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Zona Horaria</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">{company.timezone}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Idioma</label>
              <p className="text-sm text-slate-700 dark:text-slate-300 capitalize">{company.idioma}</p>
            </div>
          </div>
        </div>

        {/* Status & System */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Estado del Sistema
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Estatus</label>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    company.estatus === "activo"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400"
                  }`}
                >
                  {company.estatus}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">ID Interno</label>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300">#{company.id_empresa}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
