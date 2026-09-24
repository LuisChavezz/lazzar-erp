import { Metadata } from "next";
import { GoogleCalendarView } from "@/src/features/google/components/GoogleCalendarView";

export const metadata: Metadata = {
  title: "Calendario | Mesa de Control | ERP",
  description: "Eventos y citas de Google Calendar conectados a tu cuenta de Google.",
};

export default function OperationsCalendarPage() {
  return (
    <main className="w-full" aria-label="Calendario">
      <h1 className="sr-only">Calendario - Mesa de Control</h1>
      <section aria-label="Calendario de Google">
        <GoogleCalendarView />
      </section>
    </main>
  );
}
