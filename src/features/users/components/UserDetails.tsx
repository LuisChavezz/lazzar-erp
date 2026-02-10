import { User } from "../interfaces/user.interface";

interface UserDetailsProps {
  user: User;
}

export const UserDetails = ({ user }: UserDetailsProps) => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Usuario
              </label>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {user.username}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Email
              </label>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-white/10" />

      {/* Personal Info & System Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Información Personal
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Nombre Completo</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {user.first_name} {user.last_name || "-"}
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Teléfono</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">{user.telefono || "-"}</p>
            </div>
          </div>
        </div>

        {/* System Role & Status */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Rol y Estatus
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Rol</label>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    user.is_admin_empresa
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                  }`}
                >
                  {user.is_admin_empresa ? "Admin Empresa" : "Usuario"}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Estatus</label>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.is_active && user.estatus === "activo"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400"
                  }`}
                >
                  {user.estatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamps & IDs */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Detalles del Sistema
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Fecha Registro</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {new Date(user.date_joined).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Último Acceso</label>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {user.last_login ? new Date(user.last_login).toLocaleDateString() : "-"}
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">ID Usuario</label>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300">#{user.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
