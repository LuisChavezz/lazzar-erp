import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { hasPermission } from "@/src/utils/permissions";

const OPERATIONS_ORDERS_PATH = "/operations/orders";

/**
 * Código de edición de pedidos de Mesa de Control, del catálogo de la tabla
 * `permisos`.
 *
 * DIVERGENCIA CONSCIENTE con el backend: el endpoint
 * `POST /ventas/pedidos/{id}/editar-mesa-control/` NO valida este código.
 * `PedidoViewSet._require_mesa_control` exige pertenecer al ROL
 * `MESA-DE-CONTROL` (o ser superuser / admin de empresa). O sea que este permiso
 * gobierna la UI —esta ruta y los dos disparadores— y la frontera real de
 * seguridad es el rol, evaluado en Django en cada guardado. Quien tenga el
 * permiso pero no el rol llegará a la pantalla y recibirá un 403 al guardar.
 */
const EDIT_PEDIDO_PERMISSION = "E-MESACONTROL-PEDIDOS";

/**
 * Guard de la ruta /orders/[id]/edit-mesa-control — alcance DELIBERADAMENTE
 * acotado, mismo criterio que `quoteEditAccess.server.ts`.
 *
 * Hace DOS chequeos, ambos LOCALES (sin red):
 *
 *   1. La forma del id.
 *   2. El permiso `E-MESACONTROL-PEDIDOS` en la sesión de NextAuth.
 *
 * DOS PERMISOS, NO UNO. Este guard exige `E-MESACONTROL-PEDIDOS`, pero NO es
 * la primera puerta: `src/proxy.ts` evalúa antes la regla "/orders" de
 * `routePermissions`, que exige CUALQUIERA de nueve códigos de LECTURA. O sea
 * que el rol de Mesa de Control necesita los dos —`R-MESACONTROL-PEDIDOS` para
 * llegar y `E-MESACONTROL-PEDIDOS` para editar—, y hoy el despliegue los asigna
 * juntos. Con solo el de edición, el proxy rebota al home antes de que esta
 * función corra y los dos disparadores quedarían visibles sin llevar a ninguna
 * parte. NO se duplica aquí la comprobación de lectura: el proxy ya la hace y
 * repetirla solo añadiría una segunda fuente de verdad que puede divergir.
 *
 * El chequeo de permiso aquí es posible porque la sesión de NextAuth NO es la credencial del
 * backend: su JWT viaja en una cookie del ORIGEN DE ESTA APP y lleva `role` +
 * `permissions` — la misma fuente que `src/proxy.ts` lee con `getToken`. Hace
 * falta aquí porque `routePermissions` no puede expresar esta ruta: el segmento
 * dinámico va EN MEDIO, y la regla "/orders" que sí la cubre exige CUALQUIERA de
 * nueve permisos de lectura, ninguno de los cuales autoriza a editar.
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

  // `hasPermission` ya cortocircuita para el rol "admin". Sin sesión no se llega
  // hasta aquí (el proxy redirige antes al login), pero el `?.` deja el guard
  // cerrado en vez de abierto si eso cambiara.
  const session = await getServerSession(authOptions);

  if (
    !hasPermission(EDIT_PEDIDO_PERMISSION, {
      role: session?.user?.role,
      permissions: session?.user?.permissions,
    })
  ) {
    redirect(OPERATIONS_ORDERS_PATH);
  }
}
