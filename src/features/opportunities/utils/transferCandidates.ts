import type { Role } from "@/src/features/roles/interfaces/role.interface";
import type { User } from "@/src/features/users/interfaces/user.interface";

/**
 * Departamentos a los que el backend deja transferir una oportunidad
 * (`DEPARTAMENTOS_VENTAS` en `ventas/api/oportunidades.py`). `CONTAVENTAS` y
 * `MESACONTROL` no cuentan.
 */
const CLAVES_DEPARTAMENTO_VENTAS = new Set(["VENTAS", "MESACONTROLYVENTAS"]);

/**
 * ¿Puede recibir una oportunidad? Replica la regla de `transferir/`
 * (`claves_departamento_usuario` en `seguridad/role_identity.py`): usuario
 * activo (`is_active` y `estatus === "activo"`) con al menos un rol de
 * `roles_ids` activo cuyo `clave_departamento` sea de Ventas.
 *
 * Solo se mira `clave_departamento` (el backend la guarda ya canonicalizada);
 * no se infiere el departamento de `codigo` ni `nombre`.
 *
 * No se compara la empresa: la oportunidad no la trae, y no hace falta. El
 * catálogo de usuarios (`/usuarios/`) viene acotado a la empresa activa para
 * todos, también para el superusuario desde EC-843, igual que la oportunidad.
 * Si aun así llegara un vendedor de otra empresa, el backend lo rechaza con un
 * 400 en `vendedor` que se pinta bajo el selector.
 */
export const isTransferCandidate = (
  user: User,
  rolesById: ReadonlyMap<Role["id"], Role>
): boolean =>
  user.is_active &&
  user.estatus === "activo" &&
  user.roles_ids.some((roleId) => {
    const role = rolesById.get(roleId);
    return (
      role !== undefined &&
      role.estatus === "activo" &&
      CLAVES_DEPARTAMENTO_VENTAS.has((role.clave_departamento ?? "").trim().toUpperCase())
    );
  });
