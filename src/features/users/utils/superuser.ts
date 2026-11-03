/** La bandera de la sesión con la que el backend reconoce al superusuario. */
export interface SuperuserFlag {
  is_superuser?: boolean;
}

/**
 * ¿El usuario de la sesión es superusuario? Es la condición de
 * `SoloSuperusuarioEscribe` en el backend (catálogos globales: tipos de
 * producto y tallas), que deja escribir SOLO a `is_superuser`: un
 * administrador de empresa recibe 403. Por eso no sirve `hasPermission` ni
 * `role === "admin"`, que también dejan pasar a `is_admin_empresa`.
 *
 * FALLA CERRADO: sin la bandera como `true` (sesión cargando, o creada antes de
 * que la sesión guardara el campo) es `false`. Mismo criterio que
 * `getCompanyAdminStatus`, sin el estado `unknown`: aquí solo se usa para
 * mostrar acciones, y ocultarlas mientras no se sabe es lo seguro.
 */
export const isSuperuser = (user: SuperuserFlag | null | undefined): boolean =>
  user?.is_superuser === true;
