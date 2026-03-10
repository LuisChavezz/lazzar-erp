"use client";

import { useMemo, useState } from "react";
import { Loader } from "@/src/components/Loader";
import { capitalize } from "@/src/utils/capitalize";
import { CloseIcon, SearchIcon } from "@/src/components/Icons";
import { usePermissions } from "../../permissions/hooks/usePermissions";
import { Role } from "../interfaces/role.interface";
import { useRolePermissions } from "../hooks/useRolePermissions";
import { useUpdateRolePermissions } from "../hooks/useUpdateRolePermissions";

interface RolePermissionsProps {
  role: Role;
  onUpdated?: () => void;
}

export default function RolePermissions({ role, onUpdated }: RolePermissionsProps) {
  
  // Carga de datos base: catálogo total de permisos y permisos asignados al rol actual
  const { data: permissions = [], isLoading: isLoadingPermissions } = usePermissions();
  const { data: rolePermissions, isLoading: isLoadingRolePermissions } = useRolePermissions(role.id);
  const { mutateAsync: updatePermissions, isPending } = useUpdateRolePermissions(role.id);

  // Estado local de interacción: selección temporal y término de búsqueda por módulo
  const [selectedPermissions, setSelectedPermissions] = useState<number[] | null>(null);
  const [moduleSearch, setModuleSearch] = useState("");

  // Fuente de verdad para checkboxes: cambios locales o permisos actuales del backend
  const currentPermissions = selectedPermissions ?? rolePermissions?.permisos ?? [];

  // Agrupación del catálogo por módulo para organizar la vista
  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, typeof permissions>>((acc, permission) => {
      const moduleKey = permission.modulo || "general";
      if (!acc[moduleKey]) {
        acc[moduleKey] = [];
      }
      acc[moduleKey].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  // Filtro por nombre de módulo con normalización para búsqueda más tolerante
  const normalizedModuleSearch = moduleSearch.trim().toLowerCase();
  const filteredGroupedPermissions = useMemo(() => {
    return Object.entries(groupedPermissions).filter(([module]) =>
      module.toLowerCase().includes(normalizedModuleSearch)
    );
  }, [groupedPermissions, normalizedModuleSearch]);

  // Alterna la inclusión de un permiso en la selección del rol
  const onTogglePermission = (permissionId: number) => {
    setSelectedPermissions((prev) =>
      (prev ?? rolePermissions?.permisos ?? []).includes(permissionId)
        ? (prev ?? rolePermissions?.permisos ?? []).filter((id) => id !== permissionId)
        : [...(prev ?? rolePermissions?.permisos ?? []), permissionId]
    );
  };

  // Persiste cambios y notifica al contenedor para cerrar el diálogo al éxito
  const onSave = async () => {
    await updatePermissions({ permisos: currentPermissions });
    onUpdated?.();
  };

  // Estado de carga inicial para evitar render parcial del contenido
  if (isLoadingPermissions || isLoadingRolePermissions) {
    return (
      <div className="py-8">
        <Loader title="Cargando permisos" message="Obteniendo permisos del rol..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-4 py-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Selecciona los permisos para el rol
          <span className="font-semibold text-slate-800 dark:text-slate-100"> {role.nombre}</span>.
        </p>
      </div>

      {/* Buscador por módulo con acción rápida para limpiar el texto */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <SearchIcon className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={moduleSearch}
          onChange={(event) => setModuleSearch(event.target.value)}
          className="block w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 sm:text-sm transition-shadow"
          placeholder="Buscar por módulo..."
        />
        {moduleSearch.length > 0 && (
          <button
            type="button"
            onClick={() => setModuleSearch("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Listado de módulos y permisos filtrados */}
      <div className="max-h-105 overflow-y-auto space-y-4 pr-1">
        {filteredGroupedPermissions.map(([module, modulePermissions]) => (
          <div
            key={module}
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4"
          >
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
              {capitalize(module)}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {modulePermissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-sky-500 dark:hover:border-sky-500 transition-colors cursor-pointer bg-slate-50/60 dark:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={currentPermissions.includes(permission.id)}
                    onChange={() => onTogglePermission(permission.id)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {permission.nombre}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {permission.clave}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
        {filteredGroupedPermissions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No se encontraron módulos con ese criterio.
          </div>
        )}
      </div>

      {/* Acción principal para guardar cambios en servidor */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium cursor-pointer bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Guardando..." : "Guardar permisos"}
        </button>
      </div>
    </div>
  );
}
