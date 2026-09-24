import { GoogleCalendarIcon } from "@/src/components/Icons";
import { GoogleAuthRequired } from "./GoogleAuthRequired";
import { GoogleCalendar } from "./GoogleCalendar";

/**
 * Google Calendar protegido por la conexión de Google. Compartido por las
 * páginas de calendario de Ventas y Mesa de Control: el contenido es de la
 * cuenta de Google del usuario, no del módulo. Metadata y encabezados viven en
 * cada page.
 */
export const GoogleCalendarView = () => (
  <GoogleAuthRequired
    featureName="Google Calendar"
    description="Conecta tu cuenta de Google para visualizar tus eventos y citas del calendario directamente desde el ERP."
    icon={<GoogleCalendarIcon className="w-4 h-4" />}
  >
    <GoogleCalendar />
  </GoogleAuthRequired>
);
