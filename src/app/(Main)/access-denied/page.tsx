import type { Metadata } from "next";
import { AccessDeniedContent } from "@/src/components/AccessDeniedContent";

export const metadata: Metadata = {
  title: "Sin acceso | ERP",
  description: "No tienes permiso para abrir la página que intentaste ver.",
};

/**
 * Destino del proxy cuando una ruta exige un permiso que el usuario no tiene
 * (EC-895, `ACCESS_DENIED_PATH`). Estática: la sesión se lee en el cliente.
 */
export default function AccessDeniedPage() {
  return <AccessDeniedContent />;
}
