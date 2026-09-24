import { Metadata } from "next";
import { GoogleEmailsView } from "@/src/features/google/components/GoogleEmailsView";

export const metadata: Metadata = {
  title: "Correos | Mesa de Control | ERP",
  description: "Bandeja de entrada de Gmail conectada a tu cuenta de Google.",
};

export default function OperationsEmailsPage() {
  return (
    <main className="w-full" aria-label="Correos Gmail">
      <h1 className="sr-only">Correos - Mesa de Control</h1>
      <section aria-labelledby="email-inbox-heading">
        <h2 id="email-inbox-heading" className="sr-only">Bandeja de entrada</h2>
        <GoogleEmailsView />
      </section>
    </main>
  );
}
