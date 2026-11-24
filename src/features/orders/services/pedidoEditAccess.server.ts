import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { canActAsMesaControl } from "@/src/utils/permissions";
import { MESA_CONTROL_PEDIDOS_PERMISSION } from "@/src/constants/mesaControlActionPermissions";

const OPERATIONS_ORDERS_PATH = "/operations/orders";

/**
 * Guard de la ruta /orders/[id]/edit-mesa-control — alcance DELIBERADAMENTE
 * acotado, mismo criterio que `quoteEditAccess.server.ts`.
 *
 * Hace DOS chequeos, ambos LOCALES (sin red):
 *
 *   1. La forma del id.
 *   2. Ser Mesa de Control según la sesión de NextAuth (`canActAsMesaControl`):
 *      `es_mesa_control`, la MISMA decisión que el backend aplica en
 *      `POST /ventas/pedidos/{id}/editar-mesa-control/` (superuser,
 *      `is_admin_empresa` o rol activo de departamento `MESACONTROL` de su
 *      empresa, EC-943/EC-944). Una sesión anterior que no la trae cae al
 *      código `E-MESACONTROL-PEDIDOS` hasta el siguiente inicio de sesión.
 *
 * DOS PUERTAS, NO UNA. Este guard NO es la primera: `src/proxy.ts` evalúa
 * antes la regla "/orders" de `routePermissions`, que exige CUALQUIERA de once
 * códigos de LECTURA. O sea que hay que poder llegar (p. ej.
 * `R-MESACONTROL-PEDIDOS`) y además ser Mesa de Control para editar. Sin
 * lectura, el proxy rebota antes de que esta función corra y los dos
 * disparadores quedarían visibles sin llevar a ninguna parte. NO se duplica
 * aquí la comprobación de lectura: el proxy ya la hace y repetirla solo
 * añadiría una segunda fuente de verdad que puede divergir.
 *
 * El chequeo aquí es posible porque la sesión de NextAuth NO es la credencial del
 * backend: su JWT viaja en una cookie del ORIGEN DE ESTA APP y lleva `role`,
 * `permissions` y `es_mesa_control` — la misma fuente que `src/proxy.ts` lee con `getToken`. Hace
 * falta aquí porque `routePermissions` no puede expresar esta ruta: el segmento
 * dinámico va EN MEDIO, y la regla "/orders" que sí la cubre exige CUALQUIERA de
 * once permisos de lectura, ninguno de los cuales autoriza a editar.
 *
 * La verificación real de acceso al DATO —existencia del pedido, denegaciones
 * 403/404 y la ausencia de cotización ligada— vive en el cliente
 * (`usePedidoMesaControlEditForm` + `PedidoMesaControlEditForm`), el ÚNICO lado
 * con credenciales DEL BACKEND: la cookie `auth-jwt` es HttpOnly y está acotada
 * al ORIGEN DEL BACKEND, que vive en otro dominio en todos los entornos, así que
 * cualquier fetch de verificación desde este servidor respondería 401 de forma
 * determinista. NO se añade esa llamada: su única rama alcanzable sería
 * "401 → permitir", un fail-open estructural.
 */
export async function redirectIfPedidoCannotBeEdited(pedidoId: number): Promise<void> {
  // Id malformado o no positivo (ej. /orders/abc/edit-mesa-control): se
  // redirige sin montar el bundle del formulario.
  if (!Number.isFinite(pedidoId) || pedidoId <= 0) {
    redirect(OPERATIONS_ORDERS_PATH);
  }

  // Sin sesión no se llega hasta aquí (el proxy redirige antes al login), pero
  // el `?.` deja el guard cerrado en vez de abierto si eso cambiara: sin
  // bandera ni permisos, `canActAsMesaControl` responde `false`.
  const session = await getServerSession(authOptions);

  if (
    !canActAsMesaControl(
      {
        role: session?.user?.role,
        permissions: session?.user?.permissions,
        es_mesa_control: session?.user?.es_mesa_control,
      },
      MESA_CONTROL_PEDIDOS_PERMISSION,
    )
  ) {
    redirect(OPERATIONS_ORDERS_PATH);
  }
}
