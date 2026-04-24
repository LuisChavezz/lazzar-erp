import { Metadata } from "next";
import { EmailInbox } from "@/src/features/google/components/emails/EmailInbox";
import { GoogleAuthRequired } from "@/src/features/google/components/GoogleAuthRequired";
import { GmailIcon } from "@/src/components/Icons";

export const metadata: Metadata = {
  title: "Correos | ERP",
  description: "Bandeja de entrada de Gmail conectada a tu cuenta de Google.",
};

export default function EmailsPage() {
  return (
    <main className="w-full space-y-6 md:space-y-8" aria-label="Correos Gmail">
      {/* Encabezado */}
      <header>
      </header>

      {/* Bandeja de entrada — protegida por el guardia de autenticación de Google */}
      <section aria-labelledby="email-inbox-heading">
        <h2 id="email-inbox-heading" className="sr-only">Bandeja de entrada</h2>
        <GoogleAuthRequired
          featureName="Correos de Gmail"
          description="Conecta tu cuenta de Google para leer y enviar correos directamente desde el ERP."
          icon={<GmailIcon className="w-4 h-4" />}
        >
          <EmailInbox />
        </GoogleAuthRequired>
      </section>
    </main>
  );
}
