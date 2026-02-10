import { Branch } from "../interfaces/branch.interface";

interface BranchDetailsProps {
  branch: Branch;
}

export const BranchDetails = ({ branch }: BranchDetailsProps) => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Nombre de Sucursal
              </label>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {branch.nombre}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Código
              </label>
              <p className="mt-1 text-sm font-mono text-slate-900 dark:text-white">
                {branch.codigo}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-white/10" />

      {/* Location & Contact Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Location Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Ubicación
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Dirección</label>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <p>{branch.direccion_linea1 || "-"}</p>
                {branch.direccion_linea2 && <p>{branch.direccion_linea2}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">Ciudad</label>
                <p className="text-sm text-slate-700 dark:text-slate-300">{branch.ciudad || "-"}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">Estado</label>
                <p className="text-sm text-slate-700 dark:text-slate-300">{branch.estado || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">C.P.</label>
                <p className="text-sm text-slate-700 dark:text-slate-300">{branch.cp || "-"}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">País</label>
                <p className="text-sm text-slate-700 dark:text-slate-300">{branch.pais || "-"}</p>
              </div>
            </div>
            {(branch.lat || branch.lng) && (
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">Coordenadas</label>
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                  {branch.lat}, {branch.lng}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Información de Contacto
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Email</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">{branch.email || "-"}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Teléfono</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">{branch.telefono || "-"}</p>
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
                    branch.estatus === "activo"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400"
                  }`}
                >
                  {branch.estatus}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">ID Sucursal</label>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300">#{branch.id_sucursal}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">ID Empresa</label>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300">#{branch.empresa}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
