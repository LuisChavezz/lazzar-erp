import { Metadata } from "next";
import { EmailInbox } from "@/src/features/google/components/emails/EmailInbox";

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

      {/* Bandeja de entrada */}
      <section aria-labelledby="email-inbox-heading">
        <h2 id="email-inbox-heading" className="sr-only">Bandeja de entrada</h2>
        <EmailInbox />
      </section>
    </main>
  );
}
