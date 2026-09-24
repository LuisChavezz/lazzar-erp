import { GmailIcon } from "@/src/components/Icons";
import { GoogleAuthRequired } from "./GoogleAuthRequired";
import { EmailInbox } from "./emails/EmailInbox";

/**
 * Bandeja de Gmail protegida por la conexión de Google. Compartida por las
 * páginas de correos de Ventas y Mesa de Control: el contenido es de la cuenta
 * de Google del usuario, no del módulo. Metadata y encabezados viven en cada page.
 */
export const GoogleEmailsView = () => (
  <GoogleAuthRequired
    featureName="Correos de Gmail"
    description="Conecta tu cuenta de Google para leer y enviar correos directamente desde el ERP."
    icon={<GmailIcon className="w-4 h-4" />}
  >
    <EmailInbox />
  </GoogleAuthRequired>
);
