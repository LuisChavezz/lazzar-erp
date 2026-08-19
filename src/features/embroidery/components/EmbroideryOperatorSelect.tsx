"use client";

import { useUsers } from "@/src/features/users/hooks/useUsers";
import type { User } from "@/src/features/users/interfaces/user.interface";
import { EmbroideryInlineSelect } from "./EmbroideryInlineSelect";

/**
 * Nombre humano de un usuario, con el MISMO criterio que el backend
 * (`get_full_name()` y, si queda vacío, el email): así el nombre que se elige
 * en la lista coincide con el `usuario_nombre` que devolverá el detalle tras
 * el PATCH.
 */
const userLabel = (user: User): string => {
  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return fullName !== "" ? fullName : user.email;
};

interface EmbroideryOperatorSelectProps {
  /** Nombre ya resuelto por el backend; es lo que se pinta en el disparador. */
  usuarioNombre: string | null;
  onOperatorChange: (usuarioId: number) => void;
  isPending?: boolean;
}

/**
 * Selector inline del operador asignado a la orden.
 *
 * El catálogo es `useUsers()` (`GET /usuarios/`), que el backend ya acota a la
 * empresa del usuario autenticado y expone con solo `IsAuthenticated` — no hace
 * falta un hook nuevo ni parámetros de filtrado. Se ofrecen únicamente los
 * usuarios ACTIVOS, ordenados por nombre.
 *
 * El disparador muestra `usuario_nombre` del detalle, no un nombre recalculado
 * de la lista: es el valor canónico del servidor y evita que el rótulo cambie
 * de forma según el catálogo esté cargado o no.
 */
export function EmbroideryOperatorSelect({
  usuarioNombre,
  onOperatorChange,
  isPending = false,
}: EmbroideryOperatorSelectProps) {
  const { data: users, isLoading } = useUsers();

  const options = (users ?? [])
    .filter((user) => user.is_active)
    .map((user) => ({ value: String(user.id), label: userLabel(user) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  return (
    <EmbroideryInlineSelect
      options={options}
      onSelect={(value) => onOperatorChange(Number(value))}
      ariaLabel="Cambiar operador asignado"
      isPending={isPending}
      emptyLabel={isLoading ? "Cargando operadores…" : "Sin operadores disponibles"}
      triggerClassName="text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400"
    >
      {usuarioNombre?.trim() ? (
        usuarioNombre
      ) : (
        <span className="italic text-slate-400 dark:text-slate-500">Sin asignar</span>
      )}
    </EmbroideryInlineSelect>
  );
}
