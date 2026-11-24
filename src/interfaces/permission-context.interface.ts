export interface PermissionContext {
  role?: string;
  permissions?: string[];
  /**
   * Decisión del backend sobre las acciones de Mesa de Control (EC-944). Solo
   * la lee `canActAsMesaControl`; ausente en una sesión anterior a EC-943.
   */
  es_mesa_control?: boolean;
}
